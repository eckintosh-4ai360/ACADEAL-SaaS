import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimiter";
import { createStudentQuiz } from "@/lib/ai/acadeal";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    //* Generation is the expensive call; metered per account.
    const limit = await checkRateLimit(session.user.id, {
      namespace: "ai-quiz",
      max: 15,
      windowMs: 10 * 60 * 1000,
    });

    if (limit.limited) {
      return NextResponse.json(
        { error: "You have generated a lot of quizzes. Try again shortly." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    const body = await request.json().catch(() => null);
    const topic = typeof body?.topic === "string" ? body.topic.trim() : "";
    const promptMessage =
      typeof body?.promptMessage === "string" ? body.promptMessage.trim() : undefined;
    const difficulty =
      typeof body?.difficulty === "string" ? body.difficulty.trim() : undefined;
    const questionCount = Number.isFinite(Number(body?.questionCount))
      ? Number(body.questionCount)
      : undefined;
    const conversationId =
      typeof body?.conversationId === "string" ? body.conversationId.trim() : undefined;
    const lessonId = Number.isFinite(Number(body?.lessonId)) ? Number(body.lessonId) : undefined;
    const subjectId = Number.isFinite(Number(body?.subjectId)) ? Number(body.subjectId) : undefined;

    if (!topic) {
      return NextResponse.json({ error: "Topic is required." }, { status: 400 });
    }

    const result = await createStudentQuiz({
      userId: session.user.id,
      topic,
      promptMessage,
      difficulty,
      questionCount,
      conversationId,
      lessonId,
      subjectId,
    });

    return NextResponse.json(result);
  } catch (error) {
    const err = error as { message?: string; status?: number };
    console.error("Acadeal quiz generation error:", error);

    return NextResponse.json(
      { error: err.message || "Failed to generate a quiz." },
      { status: typeof err.status === "number" ? err.status : 500 }
    );
  }
}

export const dynamic = "force-dynamic";
