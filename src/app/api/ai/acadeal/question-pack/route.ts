import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimiter";
import {
  createTeacherQuestionPack,
  extractTextFromPdfBuffer,
} from "@/lib/ai/acadeal";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    //* Generation is the expensive call; metered per account.
    const limit = await checkRateLimit(session.user.id, {
      namespace: "ai-pack",
      max: 15,
      windowMs: 10 * 60 * 1000,
    });

    if (limit.limited) {
      return NextResponse.json(
        { error: "You have generated a lot of question packs. Try again shortly." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    const formData = await request.formData();
    const topic = String(formData.get("topic") || "").trim();
    const promptMessage = String(formData.get("promptMessage") || "").trim();
    const difficulty = String(formData.get("difficulty") || "medium").trim();
    const questionCount = Number(formData.get("questionCount") || "8");
    const conversationId = String(formData.get("conversationId") || "").trim() || undefined;
    const lessonIdValue = Number(formData.get("lessonId") || "");
    const subjectIdValue = Number(formData.get("subjectId") || "");
    const lessonId = Number.isFinite(lessonIdValue) ? lessonIdValue : undefined;
    const subjectId = Number.isFinite(subjectIdValue) ? subjectIdValue : undefined;
    const sourceMaterialTextValue = String(formData.get("sourceMaterialText") || "").trim();
    const file = formData.get("file");

    let sourceType: "TOPIC" | "PDF" = "TOPIC";
    let sourceName: string | null = null;
    let sourceMaterialText = sourceMaterialTextValue || null;

    if (file instanceof File && file.size > 0) {
      sourceType = "PDF";
      sourceName = file.name;
      const buffer = Buffer.from(await file.arrayBuffer());
      sourceMaterialText = await extractTextFromPdfBuffer(buffer);
    }

    if (!topic && !promptMessage && !sourceMaterialText) {
      return NextResponse.json(
        { error: "Provide a topic, prompt, or PDF source." },
        { status: 400 }
      );
    }

    const result = await createTeacherQuestionPack({
      userId: session.user.id,
      topic: topic || undefined,
      promptMessage: promptMessage || undefined,
      difficulty,
      questionCount: Number.isFinite(questionCount) ? questionCount : undefined,
      conversationId,
      lessonId,
      subjectId,
      sourceType,
      sourceName,
      sourceMaterialText,
    });

    return NextResponse.json(result);
  } catch (error) {
    const err = error as { message?: string; status?: number };
    console.error("Acadeal question-pack error:", error);

    return NextResponse.json(
      { error: err.message || "Failed to generate question pack." },
      { status: typeof err.status === "number" ? err.status : 500 }
    );
  }
}

export const dynamic = "force-dynamic";
