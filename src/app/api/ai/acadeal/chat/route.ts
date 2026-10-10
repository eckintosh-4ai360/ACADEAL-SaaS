import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimiter";
import { replyToStudentExplanation, replyToTeacherSupport } from "@/lib/ai/acadeal";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "student" && session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    //* Metered per account. These calls cost money at the model provider, and
    //* one signed-in student could otherwise run the bill up unattended.
    const limit = await checkRateLimit(session.user.id, {
      namespace: "ai-chat",
      max: 30,
      windowMs: 10 * 60 * 1000,
    });

    if (limit.limited) {
      return NextResponse.json(
        { error: "You have sent a lot of messages. Take a short break and try again." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    const body = await request.json().catch(() => null);
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const conversationId =
      typeof body?.conversationId === "string" ? body.conversationId.trim() : undefined;
    const lessonId = Number.isFinite(Number(body?.lessonId)) ? Number(body.lessonId) : undefined;
    const subjectId = Number.isFinite(Number(body?.subjectId)) ? Number(body.subjectId) : undefined;

    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const result =
      session.user.role === "student"
        ? await replyToStudentExplanation({
            userId: session.user.id,
            message,
            conversationId,
            lessonId,
            subjectId,
          })
        : await replyToTeacherSupport({
            userId: session.user.id,
            message,
            conversationId,
            lessonId,
            subjectId,
          });

    return NextResponse.json(result);
  } catch (error) {
    const err = error as { message?: string; status?: number };
    console.error("Acadeal chat error:", error);

    return NextResponse.json(
      { error: err.message || "Failed to generate a reply." },
      { status: typeof err.status === "number" ? err.status : 500 }
    );
  }
}

export const dynamic = "force-dynamic";
