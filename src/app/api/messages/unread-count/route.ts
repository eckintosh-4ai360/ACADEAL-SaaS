import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { markDatabaseFailure, shouldBypassDatabase } from "@/lib/db-resilience";

type SessionUserPayload = {
  id?: string;
  role?: string;
  username?: string;
};

function getUserType(role: string): "STUDENT" | "TEACHER" | "PARENT" | "ADMIN" {
  if (role === "teacher") return "TEACHER";
  if (role === "parent") return "PARENT";
  if (role === "admin") return "ADMIN";
  return "STUDENT";
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ count: 0 });
    }

    const sessionUser = session.user as SessionUserPayload;
    const userRole = sessionUser.role || "student";
    const username = sessionUser.username;
    const sessionUserId = sessionUser.id;

    if (shouldBypassDatabase()) {
      return NextResponse.json({ count: 0, degraded: true });
    }

    //* Get user ID and type based on role
    let userId: string | null =
      typeof sessionUserId === "string" && sessionUserId ? sessionUserId : null;
    const userType: "STUDENT" | "TEACHER" | "PARENT" | "ADMIN" = getUserType(userRole);

    if (!userId && userRole === "student") {
      const student = await prisma.student.findUnique({
        where: { username },
        select: { id: true },
      });
      userId = student?.id || null;
    } else if (!userId && userRole === "teacher") {
      const teacher = await prisma.teacher.findUnique({
        where: { username },
        select: { id: true },
      });
      userId = teacher?.id || null;
    } else if (!userId && userRole === "parent") {
      const parent = await prisma.parent.findUnique({
        where: { username },
        select: { id: true },
      });
      userId = parent?.id || null;
    } else if (!userId && userRole === "admin") {
      const admin = await prisma.admin.findUnique({
        where: { username },
        select: { id: true },
      });
      userId = admin?.id || null;
    }

    if (!userId) {
      return NextResponse.json({ count: 0 });
    }

    //* Count unread messages
    const count = await prisma.message.count({
      where: {
        receiverId: userId,
        receiverType: userType,
        read: false,
      },
    });

    return NextResponse.json({ count });
  } catch (error) {
    if (markDatabaseFailure(error)) {
      return NextResponse.json({ count: 0, degraded: true });
    }

    console.error("Error fetching unread count:", error);
    return NextResponse.json({ count: 0 });
  }
}

