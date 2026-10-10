import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { publishQuestionPackAsAssignment } from "@/lib/ai/acadeal";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "teacher" && session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => null);
    const lessonId = Number(body?.lessonId);
    const title = String(body?.title || "").trim();
    const startDate = new Date(body?.startDate || "");
    const dueDate = new Date(body?.dueDate || "");

    if (!id || !Number.isFinite(lessonId) || !title || Number.isNaN(startDate.getTime()) || Number.isNaN(dueDate.getTime())) {
      return NextResponse.json(
        { error: "Lesson, title, start date, and due date are required." },
        { status: 400 }
      );
    }

    const assignment = await publishQuestionPackAsAssignment({
      questionPackId: id,
      userId: session.user.id,
      userRole: session.user.role,
      lessonId,
      title,
      startDate,
      dueDate,
    });

    return NextResponse.json({
      assignmentId: assignment.id,
      title: assignment.title,
      redirectTo: `/dashboard/assignments/${assignment.id}`,
    });
  } catch (error) {
    const err = error as { message?: string };
    console.error("Acadeal publish assignment error:", error);

    return NextResponse.json(
      { error: err.message || "Failed to publish assignment." },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
