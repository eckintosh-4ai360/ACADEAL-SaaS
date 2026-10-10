import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { submitStudentQuizAttempt } from "@/lib/ai/acadeal";
import type { QuizAnswerInput } from "@/types/acadeal";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const attemptId = typeof body?.attemptId === "string" ? body.attemptId.trim() : "";
    const answers =
      body?.answers && typeof body.answers === "object"
        ? (body.answers as Record<string, QuizAnswerInput>)
        : {};
    const processLog = body?.processLog;

    if (!attemptId) {
      return NextResponse.json({ error: "Attempt ID is required." }, { status: 400 });
    }

    const result = await submitStudentQuizAttempt({
      attemptId,
      studentId: session.user.id,
      answers,
      processLog,
    });

    return NextResponse.json(result);
  } catch (error) {
    const err = error as { message?: string };
    console.error("Acadeal quiz submission error:", error);

    return NextResponse.json(
      { error: err.message || "Failed to submit quiz." },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
