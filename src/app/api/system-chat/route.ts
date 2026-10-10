import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateSystemAssistantReply } from "@/lib/system-assistant";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    const role = session?.user ? (session.user as { role?: string }).role : undefined;

    if (!session || !session.user || !["admin", "teacher"].includes(role || "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const history = Array.isArray(body?.history) ? body.history : [];

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const reply = await generateSystemAssistantReply(message, session.user, history);
    return NextResponse.json(reply);
  } catch (error) {
    console.error("System chat error:", error);
    return NextResponse.json(
      { error: "Failed to generate a system response" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
