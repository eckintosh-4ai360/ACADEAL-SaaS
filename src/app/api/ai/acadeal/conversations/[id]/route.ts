import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { deleteAcadealConversation } from "@/lib/ai/acadeal";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  void request;

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "student" && session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const deletedConversation = await deleteAcadealConversation({
      conversationId: id,
      role: session.user.role,
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      conversationId: deletedConversation.id,
      title: deletedConversation.title,
    });
  } catch (error) {
    const err = error as { message?: string; status?: number };
    console.error("Acadeal conversation delete error:", error);

    return NextResponse.json(
      { error: err.message || "Failed to delete conversation." },
      { status: typeof err.status === "number" ? err.status : 500 }
    );
  }
}

export const dynamic = "force-dynamic";
