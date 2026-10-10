import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/notifications";
import prisma from "@/lib/prisma";

//* GET - Get unread notification count
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userTypeMap: Record<string, any> = {
      admin: "ADMIN",
      teacher: "TEACHER",
      parent: "PARENT",
      student: "STUDENT",
    };

    const userType = userTypeMap[session.user.role as string] || "ADMIN";

    const result = await getUnreadNotificationCount(session.user.id, userType);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Unread count error:", error);
    return NextResponse.json(
      { error: "Failed to get unread count" },
      { status: 500 }
    );
  }
}
