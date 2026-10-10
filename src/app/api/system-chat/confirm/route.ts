import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  executeAssistantActionPlan,
  type AssistantActionPlan,
} from "@/lib/system-assistant-actions";

function isAssistantActionPlan(value: unknown): value is AssistantActionPlan {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  const payload = record.payload as Record<string, unknown> | undefined;
  const preview = record.preview as Record<string, unknown> | undefined;

  if (
    typeof record.id !== "string" ||
    typeof record.confirmationLabel !== "string" ||
    record.requiresConfirmation !== true ||
    !payload ||
    typeof payload !== "object" ||
    !preview ||
    typeof preview !== "object"
  ) {
    return false;
  }

  if (record.type === "SEND_PARENT_SMS") {
    const audience = payload.audience as Record<string, unknown> | undefined;

    if (
      typeof payload.message !== "string" ||
      typeof payload.recipientCount !== "number" ||
      !Number.isFinite(payload.recipientCount) ||
      !audience ||
      typeof audience !== "object" ||
      typeof audience.label !== "string"
    ) {
      return false;
    }

    if (audience.type === "ALL_PARENTS") {
      return true;
    }

    return (
      audience.type === "CLASS_PARENTS" &&
      typeof audience.classId === "number" &&
      Number.isFinite(audience.classId) &&
      typeof audience.className === "string"
    );
  }

  if (record.type === "CREATE_USER_NOTE") {
    const target = payload.target as Record<string, unknown> | undefined;

    return (
      typeof payload.title === "string" &&
      typeof payload.contentHtml === "string" &&
      typeof payload.contentText === "string" &&
      Boolean(target) &&
      typeof target === "object" &&
      typeof target.label === "string" &&
      typeof target.userId === "string" &&
      ["ADMIN", "TEACHER", "STUDENT", "PARENT"].includes(String(target.userType))
    );
  }

  return false;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user ? (session.user as { role?: string }).role : undefined;

    if (!session || !session.user || !["admin", "teacher"].includes(role || "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const action = body?.action;

    if (!isAssistantActionPlan(action)) {
      return NextResponse.json({ error: "A valid assistant action is required" }, { status: 400 });
    }

    const result = await executeAssistantActionPlan(action, session.user);

    return NextResponse.json({
      actionResult: result,
      generatedAt: new Date().toISOString(),
      intent: "action-executed",
      reply: result.message,
    });
  } catch (error) {
    console.error("System chat confirm error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to execute the assistant action",
      },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
