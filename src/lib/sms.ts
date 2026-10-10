import prisma from "./prisma";

export type SmsProvider = "mnotify" | "arkesel";

export type SmsResult = {
  success: boolean;
  error?: string;
  data?: unknown;
  provider?: SmsProvider;
  providerMessageId?: string;
};

const MNOTIFY_API_URL = "https://api.mnotify.com/api/sms/quick";
const ARKESEL_API_URL = "https://sms.arkesel.com/api/v2/sms/send";
const SMS_REQUEST_TIMEOUT_MS = 15_000;

export type SmsConfig = {
  provider: SmsProvider;
  apiKey: string | null;
  senderId: string | null;
  providerSource: "db" | "env" | "auto" | "default";
  apiKeySource: "db" | "env" | "missing";
  senderIdSource: "db" | "env" | "missing";
};

/**
 * Normalizes phone number to 10-digit Ghana local format (e.g., "0241234567")
 * Used by mNotify and local display.
 */
export function normalizePhoneNumber(phone: string): string | null {
  const digitsOnly = phone.replace(/\D/g, "");
  
  if (digitsOnly.length === 10 && digitsOnly.startsWith("0")) {
    return digitsOnly;
  } 
  else if (digitsOnly.length === 12 && digitsOnly.startsWith("233")) {
    return "0" + digitsOnly.substring(3);
  }
  else if (digitsOnly.length === 9 && !digitsOnly.startsWith("0")) {
    return "0" + digitsOnly;
  }
  
  return (digitsOnly.length === 10) ? digitsOnly : null;
}

/**
 * Converts phone number to Ghana international format without leading plus (e.g., "233241234567")
 * Used by Arkesel API.
 */
export function toInternationalGhanaPhone(phone: string): string | null {
  const digitsOnly = phone.replace(/\D/g, "");

  if (digitsOnly.length === 12 && digitsOnly.startsWith("233")) {
    return digitsOnly;
  } else if (digitsOnly.length === 10 && digitsOnly.startsWith("0")) {
    return "233" + digitsOnly.substring(1);
  } else if (digitsOnly.length === 9 && !digitsOnly.startsWith("0")) {
    return "233" + digitsOnly;
  }

  return null;
}

export async function getSmsConfig(): Promise<SmsConfig> {
  let dbProvider: string | null = null;
  let dbApiKey: string | null = null;
  let dbSenderId: string | null = null;

  try {
    const settings = await prisma.systemSettings.findFirst({
      select: {
        smsProvider: true,
        smsApiKey: true,
        smsSenderId: true,
      },
    });

    dbProvider = settings?.smsProvider?.trim()?.toLowerCase() || null;
    dbApiKey = settings?.smsApiKey?.trim() || null;
    dbSenderId = settings?.smsSenderId?.trim() || null;
  } catch {
    // Resilient fallback if smsProvider column is not yet present in the active database
    try {
      const settingsFallback = await prisma.systemSettings.findFirst({
        select: {
          smsApiKey: true,
          smsSenderId: true,
        },
      });
      dbApiKey = settingsFallback?.smsApiKey?.trim() || null;
      dbSenderId = settingsFallback?.smsSenderId?.trim() || null;
    } catch {
      console.warn("Could not fetch SMS settings from DB, relying on environment fallback");
    }
  }

  const envProviderRaw = process.env.SMS_PROVIDER?.trim()?.toLowerCase();
  const envProvider: SmsProvider | null =
    envProviderRaw === "arkesel"
      ? "arkesel"
      : envProviderRaw === "mnotify"
      ? "mnotify"
      : null;

  const envArkeselApiKey = process.env.ARKESEL_API_KEY?.trim() || null;
  const envArkeselSenderId = process.env.ARKESEL_SENDER_ID?.trim() || null;
  const envMnotifyApiKey = process.env.MNOTIFY_API_KEY?.trim() || null;
  const envMnotifySenderId = process.env.MNOTIFY_SENDER_ID?.trim() || null;
  const envGenericApiKey = process.env.SMS_API_KEY?.trim() || null;
  const envGenericSenderId = process.env.SMS_SENDER_ID?.trim() || null;

  let provider: SmsProvider = "mnotify";
  let providerSource: SmsConfig["providerSource"] = "default";

  //* An explicit deployment environment value must be able to override the
  //* database default. SystemSettings.smsProvider defaults to mNotify, so the
  //* old DB-first order made changing SMS_PROVIDER appear to have no effect.
  if (envProvider) {
    provider = envProvider;
    providerSource = "env";
  } else if (dbProvider === "arkesel" || dbProvider === "mnotify") {
    provider = dbProvider;
    providerSource = "db";
  } else if (envArkeselApiKey && !envMnotifyApiKey) {
    provider = "arkesel";
    providerSource = "auto";
  }

  const isArkesel = provider === "arkesel";
  const envApiKey = isArkesel
    ? envArkeselApiKey || envGenericApiKey
    : envMnotifyApiKey || envGenericApiKey;
  const envSenderId = isArkesel
    ? envArkeselSenderId || envGenericSenderId
    : envMnotifySenderId || envGenericSenderId;

  //* When the provider is selected by environment, do not send an Arkesel
  //* request with a stale mNotify key (or the reverse). The dashboard values
  //* remain a fallback when they belong to the same provider.
  const environmentSelectedProvider = Boolean(envProvider);
  const sameProviderDbConfig = dbProvider === provider;
  const apiKey = environmentSelectedProvider
    ? envApiKey || (sameProviderDbConfig ? dbApiKey : null)
    : dbApiKey || envApiKey;
  const senderId = environmentSelectedProvider
    ? envSenderId || (sameProviderDbConfig ? dbSenderId : null)
    : dbSenderId || envSenderId;

  return {
    provider,
    apiKey,
    senderId,
    providerSource,
    apiKeySource: apiKey ? (environmentSelectedProvider && envApiKey ? "env" : dbApiKey ? "db" : "env") : "missing",
    senderIdSource: senderId ? (environmentSelectedProvider && envSenderId ? "env" : dbSenderId ? "db" : "env") : "missing",
  };
}

async function sendMNotifySMS(
  apiKey: string,
  senderId: string,
  recipient: string,
  message: string,
  sources: { apiKeySource: string; senderIdSource: string }
): Promise<SmsResult> {
  const url = new URL(MNOTIFY_API_URL);
  url.searchParams.set("key", apiKey);
  const payload = {
    recipient: [recipient],
    sender: senderId,
    message: message,
    is_schedule: false,
    schedule_date: "",
  };

  console.log(
    `Attempting to send SMS to ${recipient} via mNotify (apiKeySource=${sources.apiKeySource}, senderIdSource=${sources.senderIdSource})`
  );

  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const rawBody = await response.text();
  let parsedBody: unknown = rawBody;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    /* use raw text */
  }

  if (!response.ok) {
    console.error("mNotify API Error:", {
      status: response.status,
      statusText: response.statusText,
      recipient,
      response: parsedBody,
    });
    return {
      success: false,
      error: `mNotify request failed with status ${response.status}`,
      data: parsedBody,
      provider: "mnotify",
    };
  }

  console.log("mNotify Success Response:", JSON.stringify(parsedBody, null, 2));

  const providerData =
    typeof parsedBody === "object" && parsedBody !== null
      ? (parsedBody as {
          status?: string;
          code?: string | number;
          message?: string;
          id?: string;
          sms_id?: string;
          data?: { id?: string; sms_id?: string };
          summary?: { _id?: string; message_id?: string };
        })
      : null;

  const providerStatus = providerData?.status?.trim().toLowerCase();
  const providerCode = String(providerData?.code ?? "").trim().toLowerCase();
  const acceptedStatuses = new Set(["success", "sent", "queued", "submitted", "ok"]);

  if (
    !providerData ||
    (providerStatus && !acceptedStatuses.has(providerStatus)) ||
    ["400", "401", "402", "403", "422", "500"].includes(providerCode)
  ) {
    console.error("mNotify provider error:", providerData?.message || "Unknown error");
    return {
      success: false,
      error: providerData?.message || "Provider rejected message",
      data: parsedBody,
      provider: "mnotify",
    };
  }

  return {
    success: true,
    data: parsedBody,
    provider: "mnotify",
    providerMessageId:
      providerData.id ||
      providerData.sms_id ||
      providerData.data?.id ||
      providerData.data?.sms_id ||
      providerData.summary?._id ||
      providerData.summary?.message_id,
  };
}

async function sendArkeselSMS(
  apiKey: string,
  senderId: string,
  recipient: string,
  message: string,
  sources: { apiKeySource: string; senderIdSource: string }
): Promise<SmsResult> {
  const payload = {
    sender: senderId,
    message: message,
    recipients: [recipient],
  };

  console.log(
    `Attempting to send SMS to ${recipient} via Arkesel (apiKeySource=${sources.apiKeySource}, senderIdSource=${sources.senderIdSource})`
  );

  const response = await fetchWithTimeout(ARKESEL_API_URL, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const rawBody = await response.text();
  let parsedBody: unknown = rawBody;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    /* use raw text */
  }

  if (!response.ok) {
    console.error("Arkesel API Error:", {
      status: response.status,
      statusText: response.statusText,
      recipient,
      response: parsedBody,
    });

    const parsedObj =
      typeof parsedBody === "object" && parsedBody !== null
        ? (parsedBody as { message?: string; error?: string })
        : null;

    const errorMsg =
      parsedObj?.message ||
      parsedObj?.error ||
      `Arkesel request failed with status ${response.status} (${response.statusText})`;

    return {
      success: false,
      error: errorMsg,
      data: parsedBody,
      provider: "arkesel",
    };
  }

  console.log("Arkesel Success Response:", JSON.stringify(parsedBody, null, 2));

  const providerData =
    typeof parsedBody === "object" && parsedBody !== null
      ? (parsedBody as {
          status?: string;
          message?: string;
          data?:
            | { id?: string; message_id?: string }
            | Array<{ id?: string; message_id?: string; recipient?: string }>;
        })
      : null;

  if (providerData?.status?.trim().toLowerCase() !== "success") {
    console.error("Arkesel provider error:", providerData?.message || "Unknown error");
    return {
      success: false,
      error: providerData?.message || "Arkesel rejected message",
      data: parsedBody,
      provider: "arkesel",
    };
  }

  const providerMessageId = Array.isArray(providerData.data)
    ? providerData.data.find((item) => item.id || item.message_id)?.id ||
      providerData.data.find((item) => item.id || item.message_id)?.message_id
    : providerData.data?.id || providerData.data?.message_id;

  return { success: true, data: parsedBody, provider: "arkesel", providerMessageId };
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SMS_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`SMS provider request timed out after ${SMS_REQUEST_TIMEOUT_MS / 1000}s`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendSMS(phone: string, message: string): Promise<SmsResult> {
  try {
    if (!phone?.trim() || !message?.trim()) {
      return { success: false, error: "Phone and message are required" };
    }

    const { provider, apiKey, senderId, apiKeySource, senderIdSource } =
      await getSmsConfig();

    if (!apiKey) {
      console.log(`${provider} API Key missing, skipping SMS send`);
      return {
        success: false,
        error: `${provider === "arkesel" ? "Arkesel" : "mNotify"} API key not configured`,
        provider,
      };
    }

    if (!senderId) {
      console.log(`${provider} sender ID missing, skipping SMS send`);
      return {
        success: false,
        error: `${provider === "arkesel" ? "Arkesel" : "mNotify"} sender ID not configured. Use an approved sender ID.`,
        provider,
      };
    }

    if (provider === "arkesel") {
      const recipient = toInternationalGhanaPhone(phone);
      if (!recipient) {
        return {
          success: false,
          error: "Invalid phone number format. Arkesel requires Ghana numbers (e.g., 0241234567 or 233241234567)",
          provider: "arkesel",
        };
      }

      return await sendArkeselSMS(apiKey, senderId, recipient, message, {
        apiKeySource,
        senderIdSource,
      });
    } else {
      const recipient = normalizePhoneNumber(phone);
      if (!recipient) {
        return {
          success: false,
          error: "Invalid phone number format. mNotify requires 10-digit Ghana numbers (e.g., 0241234567)",
          provider: "mnotify",
        };
      }

      return await sendMNotifySMS(apiKey, senderId, recipient, message, {
        apiKeySource,
        senderIdSource,
      });
    }
  } catch (error) {
    console.error("SMS sending error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send SMS",
    };
  }
}

export async function sendResetPasswordCredentialsSMS(
  phone: string,
  name: string,
  userId: string,
  newPassword: string
) {
  const message = `Hello ${name}, your password has been reset. User ID: ${userId}. New password: ${newPassword}. Please log in and change it immediately.`;

  return await sendSMS(phone, message);
}

//* Send staff (teacher/admin) login credentials via SMS right after registration.
//* Staff sign in with their staff ID, not their username, so that is what goes out.
export async function sendStaffCredentialsSMS(params: {
  phone: string;
  name: string;
  staffId: string;
  password: string;
  role: "teacher" | "admin";
  schoolName: string;
  schoolPhone: string;
  publicAppUrl: string;
}) {
  const message =
    `Hello ${params.name}, your ${params.role} account at ${params.schoolName} has been created. ` +
    `Staff ID: ${params.staffId}. Password: ${params.password}. ` +
    `Log in at ${params.publicAppUrl}/login and change your password. ` +
    `For help call ${params.schoolPhone}.`;

  return await sendSMS(params.phone, message);
}

//* Send parent + student credentials via SMS (one SMS per child so parents with multiple children receive multiple messages)
export async function sendParentCredentialsSMS(params: {
  parentPhone: string;
  parentName: string;
  parentUserId: string;
  parentPassword: string;
  schoolName: string;
  schoolPhone: string;
  publicAppUrl: string;
  students: { studentName: string; studentId: string; password: string }[];
  loginUrl?: string;
}) {
  const results = [];
  for (const student of params.students) {
    const message =
      `Dear ${student.studentName}, Congratulations on your admission to ${params.schoolName}. ` +
      `Your Student Id is ${student.studentId} and default password is ${student.password}. ` +
      `PARENT ID ${params.parentUserId} AND PASSWORD ${params.parentPassword}. ` +
      `For more info, contact us on ${params.schoolPhone} or visit our student portal at ${params.publicAppUrl}. Best regards.`;
    const res = await sendSMS(params.parentPhone, message);
    results.push(res);
    if (!res.success) {
      console.warn(`[SMS] Credentials SMS failed for student ${student.studentId}:`, res.error);
    } else {
      console.log(`[SMS] Credentials sent to ${params.parentPhone} for student ${student.studentId}`);
    }
  }
  return results;
}


//* Send notification SMS
export async function sendNotificationSMS(phone: string, message: string) {
  return await sendSMS(phone, message);
}

//* Send attendance alert SMS to parent
export async function sendAttendanceAlertSMS(
  parentPhone: string,
  studentName: string,
  date: string,
  status: string
) {
  const message = `Attendance Alert: ${studentName} was marked ${status} on ${date}.`;

  return await sendSMS(parentPhone, message);
}

//* Send fee reminder SMS
export async function sendFeeReminderSMS(
  phone: string,
  name: string,
  feeTitle: string,
  amount: number,
  dueDate: string
) {
  const message = `Fee Reminder for ${name}: ${feeTitle} - Amount: GHS ${amount.toFixed(
    2
  )}, Due Date: ${dueDate}. Please pay before the due date.`;

  return await sendSMS(phone, message);
}

//* Send exam/assignment notification SMS
export async function sendExamNotificationSMS(
  phone: string,
  studentName: string,
  examTitle: string,
  date: string
) {
  const message = `Exam Notification: ${studentName} has an upcoming exam - ${examTitle} on ${date}. Good luck!`;

  return await sendSMS(phone, message);
}

//! ---- BROADCAST HELPERS ----

/**
 * Collect unique phone numbers for the target class (or ALL students if classId is omitted).
 * Priority: parent.phone → student.contactNumber
 */
async function collectPhoneNumbers(classId?: number): Promise<string[]> {
  const students = await prisma.student.findMany({
    where: classId ? { classId } : undefined,
    select: {
      contactNumber: true,
      parent: { select: { phone: true } },
    },
  });

  const seen = new Set<string>();
  const phones: string[] = [];

  for (const s of students) {
    const raw = s.parent?.phone || s.contactNumber || "";
    if (raw && !seen.has(raw)) {
      seen.add(raw);
      phones.push(raw);
    }
  }

  return phones;
}

/**
 * Broadcast an announcement via SMS to all parents/contacts in the target class (or school-wide).
 */
export async function sendAnnouncementSMS(
  title: string,
  description: string,
  classId?: number
) {
  try {
    const phones = await collectPhoneNumbers(classId);
    if (phones.length === 0) {
      console.log("[SMS] No phone numbers found for announcement broadcast.");
      return { sent: 0, failed: 0 };
    }

    const message = `📢 ANNOUNCEMENT: ${title}\n${description}`;
    console.log(`[SMS] Sending announcement to ${phones.length} recipient(s)...`);

    const results = await Promise.allSettled(
      phones.map((phone) => sendSMS(phone, message))
    );

    const sent = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;
    const failed = results.length - sent;

    console.log(`[SMS] Announcement broadcast complete. Sent: ${sent}, Failed: ${failed}`);
    return { sent, failed };
  } catch (error) {
    console.error("[SMS] sendAnnouncementSMS error:", error);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Broadcast an event notification via SMS to all parents/contacts in the target class (or school-wide).
 */
export async function sendEventSMS(
  title: string,
  startTime: Date,
  classId?: number
) {
  try {
    const phones = await collectPhoneNumbers(classId);
    if (phones.length === 0) {
      console.log("[SMS] No phone numbers found for event broadcast.");
      return { sent: 0, failed: 0 };
    }

    const dateStr = startTime.toLocaleDateString("en-GH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeStr = startTime.toLocaleTimeString("en-GH", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const message = `📅 SCHOOL EVENT: ${title}\nDate: ${dateStr} at ${timeStr}. Please mark your calendar.`;
    console.log(`[SMS] Sending event SMS to ${phones.length} recipient(s)...`);

    const results = await Promise.allSettled(
      phones.map((phone) => sendSMS(phone, message))
    );

    const sent = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;
    const failed = results.length - sent;

    console.log(`[SMS] Event broadcast complete. Sent: ${sent}, Failed: ${failed}`);
    return { sent, failed };
  } catch (error) {
    console.error("[SMS] sendEventSMS error:", error);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Send an SMS alert to the parent/guardian of a student who is being repeated
 * (held back in the same class) due to poor performance at end of term.
 *
 * @param parentPhone - The parent's phone number
 * @param studentFullName - The student's full name (e.g. "Kwame Mensah")
 * @param className - The class the student will be repeating (e.g. "Class 4A")
 * @param schoolName - The school name to include in the message
 */
export async function sendRepeatStudentSMS(
  parentPhone: string,
  studentFullName: string,
  className: string,
  schoolName: string = "the school"
): Promise<SmsResult> {
  const message =
    `Dear Parent/Guardian, we regret to inform you that your ward ` +
    `${studentFullName} will be REPEATING ${className} next term due to ` +
    `poor academic performance. Please visit ${schoolName} for further ` +
    `guidance and support. Thank you.`;

  console.log(
    `[SMS] Sending repeat-student alert for ${studentFullName} to ${parentPhone}`
  );
  return await sendSMS(parentPhone, message);
}

/**
 * Bulk-send repeat-student SMS alerts for a list of students who have been
 * held back during end-of-term class migration.
 *
 * @returns An object with `sent` (success count) and `failed` (failure count)
 */
export async function sendBulkRepeatStudentSMS(
  students: {
    fullName: string;
    className: string;
    parentPhone: string | null;
    contactNumber: string | null;
  }[],
  schoolName: string = "the school"
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const student of students) {
    const phone = student.parentPhone || student.contactNumber;
    if (!phone) {
      console.log(
        `[SMS] No phone number for repeated student ${student.fullName} — skipping.`
      );
      failed++;
      continue;
    }

    const result = await sendRepeatStudentSMS(
      phone,
      student.fullName,
      student.className,
      schoolName
    );

    if (result.success) {
      sent++;
    } else {
      failed++;
      console.warn(
        `[SMS] Repeat-student SMS failed for ${student.fullName}: ${result.error}`
      );
    }
  }

  console.log(
    `[SMS] Bulk repeat-student SMS complete. Sent: ${sent}, Failed: ${failed}`
  );
  return { sent, failed };
}
