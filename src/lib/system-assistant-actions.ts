import { randomUUID } from "crypto";
import { Prisma, type UserType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getGroqClient, DEFAULT_GROQ_MODEL } from "@/lib/groq";
import { normalizeAssistantText } from "@/lib/assistant-text";
import { sendSMS, normalizePhoneNumber } from "@/lib/sms";
import { getSystemSettings } from "@/lib/settings";
import { getCurrentTeacherPermissions } from "@/lib/user-permissions-server";
import { writeServerAuditLog } from "@/lib/audit-server";
import {
  extractUserNoteText,
  isMissingUserNotesTable,
  mapRoleToUserType,
  normalizeUserNoteTitle,
  sanitizeUserNoteHtml,
  serializeUserNoteRecord,
  type DashboardUserRole,
  type UserNoteRecord,
} from "@/lib/userNotes";

type AssistantSessionUser = {
  email?: string | null;
  id?: string;
  loginId?: string;
  name?: string | null;
  role?: string;
  username?: string;
};

type ParentSmsAudience =
  | {
      label: "All parents";
      type: "ALL_PARENTS";
    }
  | {
      classId: number;
      className: string;
      label: string;
      type: "CLASS_PARENTS";
    };

export type SendParentSmsActionPlan = {
  confirmationLabel: string;
  createdAt: string;
  id: string;
  payload: {
    audience: ParentSmsAudience;
    message: string;
    recipientCount: number;
  };
  preview: {
    body: string;
    details: { label: string; value: string }[];
    heading: string;
  };
  requiresConfirmation: true;
  riskLevel: "medium" | "high";
  summary: string;
  title: string;
  type: "SEND_PARENT_SMS";
};

type UserNoteTarget = {
  label: string;
  userId: string;
  userType: UserType;
};

export type CreateUserNoteActionPlan = {
  confirmationLabel: string;
  createdAt: string;
  id: string;
  payload: {
    contentHtml: string;
    contentText: string;
    target: UserNoteTarget;
    title: string;
  };
  preview: {
    body: string;
    details: { label: string; value: string }[];
    heading: string;
  };
  requiresConfirmation: true;
  riskLevel: "low" | "medium";
  summary: string;
  title: string;
  type: "CREATE_USER_NOTE";
};

export type AssistantActionPlan =
  | CreateUserNoteActionPlan
  | SendParentSmsActionPlan;

export type AssistantActionExecutionResult = {
  entityId?: number | string;
  entityType?: string;
  failed?: number;
  message: string;
  recipientCount?: number;
  sent?: number;
  success: boolean;
};

type DraftedParentSms = {
  audience: "ALL_PARENTS" | "CLASS_PARENTS";
  className: string | null;
  message: string;
  reasoning: string;
};

type DraftedUserNote = {
  contentText: string;
  reasoning: string;
  title: string;
};

const MAX_ASSISTANT_NOTE_TEXT_LENGTH = 50_000;

function isDashboardUserRole(role: unknown): role is DashboardUserRole {
  return role === "admin" || role === "teacher" || role === "student" || role === "parent";
}

function getSessionUserNoteTarget(sessionUser: AssistantSessionUser): UserNoteTarget | null {
  if (!sessionUser.id || !isDashboardUserRole(sessionUser.role)) {
    return null;
  }

  return {
    label:
      sessionUser.name?.trim() ||
      sessionUser.username ||
      sessionUser.loginId ||
      "Current user",
    userId: sessionUser.id,
    userType: mapRoleToUserType(sessionUser.role),
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function textToNoteHtml(value: string) {
  const paragraphs = value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return "<p></p>";
  }

  return paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function sanitizeNotePlainText(value: string) {
  return normalizeAssistantText(value)
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_ASSISTANT_NOTE_TEXT_LENGTH);
}

function isProbablyUserNoteRequest(prompt: string) {
  const normalized = prompt.trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  const wantsNote =
    /\b(note|notes|notebook|notepad|study note|lesson note|personal note)\b/.test(normalized);
  const wantsCreate =
    /\b(add|save|create|write|draft|record|store|put|make)\b/.test(normalized);
  const mentionsNotesDestination =
    /\b(my notes|to my notes|to notes|in my notes|in notes|save.*notes?|add.*notes?)\b/.test(
      normalized
    );

  return wantsNote && wantsCreate && mentionsNotesDestination;
}

function deriveNoteTopic(prompt: string) {
  const cleaned = prompt
    .replace(/\b(write|draft|create|make|add|save|store|put|record)\b/gi, " ")
    .replace(/\b(a|an|the|my|personal|study|lesson)\b/gi, " ")
    .replace(/\bnotes?\b/gi, " ")
    .replace(/\b(to|in|into|for)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return "New Note";
  }

  return cleaned
    .split(" ")
    .slice(0, 8)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function fallbackDraftUserNote(prompt: string): DraftedUserNote {
  const title = normalizeUserNoteTitle(deriveNoteTopic(prompt));

  return {
    title,
    contentText:
      `${title}\n\n` +
      "This note was created from your assistant request. Review it and add any class-specific examples, definitions, or reminders you want to keep.",
    reasoning: "Created a simple note draft from the request.",
  };
}

async function draftUserNote(prompt: string): Promise<DraftedUserNote> {
  const settings = await getSystemSettings();
  const systemPrompt = `
You create personal notes inside a school management system.
Return ONLY valid JSON with this exact shape:
{
  "title": string,
  "contentText": string,
  "reasoning": string
}

Rules:
- Create a useful note that directly satisfies the user's request.
- If the user asks for an educational note, write clear student-friendly content.
- Keep contentText plain text only. Do not include markdown, HTML, emoji, or bullet symbols.
- Use short paragraphs and simple headings as plain text.
- Keep the title under 120 characters.
- Keep the note under ${MAX_ASSISTANT_NOTE_TEXT_LENGTH} characters.
- School name: ${settings.schoolName}
`;

  try {
    const response = await getGroqClient().chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      model: process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL,
      temperature: 0.35,
      max_tokens: 900,
    });

    const content = response.choices[0]?.message?.content || "";
    const parsed = parseJsonObject<Partial<DraftedUserNote>>(content);

    if (!parsed?.contentText) {
      return fallbackDraftUserNote(prompt);
    }

    const contentText = sanitizeNotePlainText(parsed.contentText);

    return {
      contentText,
      reasoning:
        typeof parsed.reasoning === "string" && parsed.reasoning.trim()
          ? normalizeAssistantText(parsed.reasoning)
          : "Created a personal note draft from the request.",
      title: normalizeUserNoteTitle(
        typeof parsed.title === "string" && parsed.title.trim()
          ? parsed.title
          : deriveNoteTopic(prompt)
      ),
    };
  } catch (error) {
    console.error("Assistant note draft error:", error);
    return fallbackDraftUserNote(prompt);
  }
}

function isProbablyParentSmsRequest(prompt: string) {
  const normalized = prompt.trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  // Pure data questions are never SMS actions
  if (/^(how many|what is|what are|where|why|when|show me|list|count|give me|tell me (how|what|why|where))/.test(normalized)) {
    return false;
  }

  // Detect send/communication intent — broad set to catch natural language
  const wantsSend = /\b(send|broadcast|text|sms|message|notify|inform|greet|greeting|say|tell|write|compose|announce|wish|ping|alert|contact|reach out|communicate|share|let.*know|pass.*message)\b/.test(normalized);

  // Detect audience being parents/guardians
  const targetsParents = /\b(parent|parents|guardian|guardians|families|family|mum|dad|mother|father|caregiver|caregivers)\b/.test(normalized);

  // Also catch patterns like "hi to all", "hello to parents"
  const hasGreetingToAll = /\b(hi|hello|good morning|good afternoon|good evening|goodwill|regards|best wishes)\b/.test(normalized) && targetsParents;

  return (wantsSend && targetsParents) || hasGreetingToAll;
}

function parseJsonObject<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    const objectMatch = value.match(/\{[\s\S]*\}/);
    if (!objectMatch) {
      return null;
    }

    try {
      return JSON.parse(objectMatch[0]) as T;
    } catch {
      return null;
    }
  }
}

function sanitizeSmsMessage(value: string) {
  return normalizeAssistantText(value)
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 480);
}

function fallbackDraftFromPrompt(prompt: string, schoolName: string): DraftedParentSms {
  const normalized = prompt.toLowerCase();
  const isGoodwill =
    /\bgood\b/.test(normalized) ||
    /\bgreeting\b/.test(normalized) ||
    /\bhello\b/.test(normalized) ||
    /\bmorning\b/.test(normalized);

  return {
    audience: "ALL_PARENTS",
    className: null,
    message: isGoodwill
      ? `Dear Parent, warm greetings from ${schoolName}. We appreciate your continued support and wish your family a productive and blessed day. Thank you.`
      : `Dear Parent, please note this update from ${schoolName}: ${prompt.trim()}. Thank you.`,
    reasoning: "Created a concise school SMS from the admin request.",
  };
}

async function draftParentSms(prompt: string): Promise<DraftedParentSms> {
  const [settings, classes] = await Promise.all([
    getSystemSettings(),
    prisma.class.findMany({
      select: { name: true },
      orderBy: { name: "asc" },
      take: 80,
    }),
  ]);

  const classList = classes.map((classItem) => classItem.name).join(", ") || "No classes found";
  const systemPrompt = `
You draft SMS messages for a school management system.
Return ONLY valid JSON with this exact shape:
{
  "audience": "ALL_PARENTS" | "CLASS_PARENTS",
  "className": string | null,
  "message": string,
  "reasoning": string
}

Rules:
- The SMS must be professional, warm, and concise.
- Do not include markdown, bullets, emoji, or HTML.
- Keep the SMS under 480 characters.
- If the user says "all parents", "all parent", or does not name a specific class, use audience ALL_PARENTS and className null.
- If the user names a specific class from this list, use CLASS_PARENTS and that className.
- Available classes: ${classList}
- School name: ${settings.schoolName}
- If the prompt is vague like "send good to all parent", write a friendly goodwill/greeting SMS.
`;

  try {
    const response = await getGroqClient().chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      model: process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL,
      temperature: 0.35,
      max_tokens: 600,
    });

    const content = response.choices[0]?.message?.content || "";
    const parsed = parseJsonObject<Partial<DraftedParentSms>>(content);

    if (!parsed?.message) {
      return fallbackDraftFromPrompt(prompt, settings.schoolName);
    }

    return {
      audience: parsed.audience === "CLASS_PARENTS" ? "CLASS_PARENTS" : "ALL_PARENTS",
      className:
        typeof parsed.className === "string" && parsed.className.trim()
          ? parsed.className.trim()
          : null,
      message: sanitizeSmsMessage(parsed.message),
      reasoning:
        typeof parsed.reasoning === "string" && parsed.reasoning.trim()
          ? normalizeAssistantText(parsed.reasoning)
          : "Created a concise school SMS from the request.",
    };
  } catch (error) {
    console.error("Assistant SMS draft error:", error);
    return fallbackDraftFromPrompt(prompt, settings.schoolName);
  }
}

async function resolveAudience(draft: DraftedParentSms): Promise<ParentSmsAudience> {
  if (draft.audience === "CLASS_PARENTS" && draft.className) {
    const classItem = await prisma.class.findFirst({
      where: { name: { contains: draft.className, mode: "insensitive" } },
      select: { id: true, name: true },
    });

    if (classItem) {
      return {
        classId: classItem.id,
        className: classItem.name,
        label: `${classItem.name} parents`,
        type: "CLASS_PARENTS",
      };
    }
  }

  return {
    label: "All parents",
    type: "ALL_PARENTS",
  };
}

async function collectParentRecipients(audience: ParentSmsAudience) {
  const rawPhones =
    audience.type === "CLASS_PARENTS"
      ? (
          await prisma.student.findMany({
            where: { classId: audience.classId },
            select: {
              contactNumber: true,
              parent: { select: { phone: true } },
            },
          })
        ).map((student) => student.parent?.phone || student.contactNumber || "")
      : (await prisma.parent.findMany({ select: { phone: true } })).map(
          (parent) => parent.phone
        );

  const seen = new Set<string>();
  const recipients: string[] = [];

  for (const phone of rawPhones) {
    const normalized = normalizePhoneNumber(phone || "");
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    recipients.push(normalized);
  }

  return recipients;
}

async function userCanSendParentSms(sessionUser: AssistantSessionUser) {
  if (sessionUser.role === "admin") {
    return true;
  }

  if (sessionUser.role !== "teacher") {
    return false;
  }

  const permissions = await getCurrentTeacherPermissions(sessionUser);
  return Boolean(permissions.message);
}

export async function buildAssistantActionPlan(
  prompt: string,
  sessionUser: AssistantSessionUser
): Promise<AssistantActionPlan | null> {
  if (!isProbablyParentSmsRequest(prompt)) {
    if (isProbablyUserNoteRequest(prompt)) {
      const target = getSessionUserNoteTarget(sessionUser);

      if (!target) {
        return null;
      }

      const draft = await draftUserNote(prompt);
      const contentHtml = sanitizeUserNoteHtml(textToNoteHtml(draft.contentText));
      const contentText = extractUserNoteText(contentHtml);
      const title = normalizeUserNoteTitle(draft.title);

      if (!contentText) {
        return null;
      }

      return {
        confirmationLabel: "Confirm and save",
        createdAt: new Date().toISOString(),
        id: randomUUID(),
        payload: {
          contentHtml,
          contentText,
          target,
          title,
        },
        preview: {
          body: contentText,
          details: [
            { label: "Destination", value: "Personal Notes" },
            { label: "Owner", value: target.label },
            { label: "Title", value: title },
            { label: "Length", value: `${contentText.length.toLocaleString()} characters` },
          ],
          heading: "Draft note",
        },
        requiresConfirmation: true,
        riskLevel: "low",
        summary: `I drafted a note titled "${title}". Please review it before I save it to your notes.`,
        title: "Save note",
        type: "CREATE_USER_NOTE",
      };
    }

    return null;
  }

  if (!(await userCanSendParentSms(sessionUser))) {
    return {
      confirmationLabel: "Not allowed",
      createdAt: new Date().toISOString(),
      id: randomUUID(),
      payload: {
        audience: { label: "All parents", type: "ALL_PARENTS" },
        message:
          "You do not currently have permission to send parent SMS broadcasts from the assistant.",
        recipientCount: 0,
      },
      preview: {
        body:
          "Ask a Super Admin to enable the Message permission for this teacher account before using AI-assisted broadcasts.",
        details: [
          { label: "Action", value: "Parent SMS broadcast" },
          { label: "Status", value: "Permission required" },
        ],
        heading: "Permission required",
      },
      requiresConfirmation: true,
      riskLevel: "high",
      summary:
        "I can draft this SMS, but your account does not have permission to send parent broadcasts.",
      title: "Parent SMS permission required",
      type: "SEND_PARENT_SMS",
    };
  }

  const draft = await draftParentSms(prompt);
  const audience = await resolveAudience(draft);
  const recipients = await collectParentRecipients(audience);
  const recipientCount = recipients.length;
  const message = sanitizeSmsMessage(draft.message);

  return {
    confirmationLabel: "Confirm and send",
    createdAt: new Date().toISOString(),
    id: randomUUID(),
    payload: {
      audience,
      message,
      recipientCount,
    },
    preview: {
      body: message,
      details: [
        { label: "Audience", value: audience.label },
        { label: "Recipients", value: `${recipientCount} valid phone number(s)` },
        { label: "Delivery", value: "SMS via configured gateway (mNotify / Arkesel)" },
      ],
      heading: "Draft SMS",
    },
    requiresConfirmation: true,
    riskLevel: "medium",
    summary:
      recipientCount > 0
        ? `I drafted an SMS for ${audience.label}. Please review it before sending to ${recipientCount} recipient(s).`
        : `I drafted an SMS for ${audience.label}, but I could not find valid parent phone numbers for that audience.`,
    title: "Send SMS to parents",
    type: "SEND_PARENT_SMS",
  };
}

export async function executeAssistantActionPlan(
  action: AssistantActionPlan,
  sessionUser: AssistantSessionUser
): Promise<AssistantActionExecutionResult> {
  if (action.type === "CREATE_USER_NOTE") {
    const target = getSessionUserNoteTarget(sessionUser);

    if (!target) {
      throw new Error("You must be logged in to save notes from the assistant.");
    }

    if (
      action.payload.target.userId !== target.userId ||
      action.payload.target.userType !== target.userType
    ) {
      throw new Error("This note action does not match the signed-in user.");
    }

    const title = normalizeUserNoteTitle(action.payload.title);
    const contentHtml = sanitizeUserNoteHtml(
      action.payload.contentHtml || textToNoteHtml(action.payload.contentText)
    );
    const contentText = extractUserNoteText(contentHtml);

    if (!contentText) {
      throw new Error("The note content is empty.");
    }

    if (contentText.length > MAX_ASSISTANT_NOTE_TEXT_LENGTH) {
      throw new Error(
        `Notes must stay under ${MAX_ASSISTANT_NOTE_TEXT_LENGTH.toLocaleString()} characters.`
      );
    }

    try {
      const rows = await prisma.$queryRaw<UserNoteRecord[]>(Prisma.sql`
        INSERT INTO "UserNote" (
          "userId",
          "userType",
          "title",
          "contentHtml",
          "contentText",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${target.userId},
          CAST(${target.userType} AS "UserType"),
          ${title},
          ${contentHtml},
          ${contentText},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        RETURNING "id", "title", "contentHtml", "contentText", "updatedAt"
      `);

      const note = rows[0];

      if (!note) {
        throw new Error("Unable to save the note right now.");
      }

      const savedNote = serializeUserNoteRecord(note);

      revalidatePath("/dashboard/academics/notes");

      await writeServerAuditLog({
        action: "assistant.user_note.create",
        category: "academics",
        status: "SUCCESS",
        source: "system_assistant",
        summary: `AI assistant saved note "${savedNote.title}"`,
        entity: {
          type: "user_note",
          id: String(savedNote.id),
          label: savedNote.title,
        },
        metadata: {
          actionId: action.id,
          contentLength: savedNote.contentText.length,
          targetUserId: target.userId,
          targetUserType: target.userType,
        },
      });

      return {
        entityId: savedNote.id,
        entityType: "user_note",
        message: `Saved "${savedNote.title}" to your notes.`,
        success: true,
      };
    } catch (error) {
      if (isMissingUserNotesTable(error)) {
        throw new Error(
          "Notes storage is not ready yet. Apply the latest Prisma migration and restart the app."
        );
      }

      throw error;
    }
  }

  if (action.type !== "SEND_PARENT_SMS") {
    throw new Error("Unsupported assistant action.");
  }

  if (!(await userCanSendParentSms(sessionUser))) {
    throw new Error("You do not have permission to send parent SMS broadcasts.");
  }

  //* The action plan arrives from the client and is only validated for shape,
  //* so the audience has to be re-authorized here. A school-wide broadcast is
  //* an administrator's call; a teacher's messaging permission covers their
  //* own classes.
  if (
    action.payload.audience.type === "ALL_PARENTS" &&
    sessionUser.role !== "admin"
  ) {
    throw new Error(
      "Only administrators can send a message to every parent in the school."
    );
  }

  const message = sanitizeSmsMessage(action.payload.message);

  if (!message) {
    throw new Error("The SMS message is empty.");
  }

  const recipients = await collectParentRecipients(action.payload.audience);

  if (recipients.length === 0) {
    throw new Error("No valid parent phone numbers were found for this audience.");
  }

  const results = [];

  for (const phone of recipients) {
    try {
      const result = await sendSMS(phone, message);
      results.push({ phone, success: result.success, error: result.error });
    } catch (error) {
      console.error("Assistant SMS send error:", error);
      results.push({ phone, success: false, error: "Unexpected send error" });
    }
  }

  const sent = results.filter((result) => result.success).length;
  const failed = results.length - sent;
  const sender = sessionUser.name || sessionUser.email || sessionUser.loginId || "AI Assistant";

  if (sent > 0) {
    await prisma.smsLog.create({
      data: {
        sender,
        recipient: `${action.payload.audience.label} (AI Assistant)`,
        message,
      },
    });
  }

  await writeServerAuditLog({
    action: "assistant.sms.send",
    category: "communication",
    status: sent > 0 ? "SUCCESS" : "FAILURE",
    source: "system_assistant",
    summary: `AI assistant SMS broadcast to ${action.payload.audience.label}: ${sent} sent, ${failed} failed`,
    entity: {
      type: "sms_broadcast",
      label: action.payload.audience.label,
    },
    metadata: {
      actionId: action.id,
      audience: action.payload.audience,
      failed,
      recipientCount: recipients.length,
      sent,
    },
  });

  return {
    failed,
    message:
      sent > 0
        ? `SMS sent to ${sent} parent contact(s). ${failed > 0 ? `${failed} failed.` : "No failures reported."}`
        : "The SMS provider did not accept any messages.",
    recipientCount: recipients.length,
    sent,
    success: sent > 0,
  };
}
