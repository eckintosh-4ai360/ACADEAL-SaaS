import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  sendNotification,
  broadcastNotification,
} from "@/lib/notifications";
import prisma from "@/lib/prisma";

//* GET - Fetch user notifications
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20");
    const cursor = searchParams.get("cursor");
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const userTypeMap: Record<string, any> = {
      admin: "ADMIN",
      teacher: "TEACHER",
      parent: "PARENT",
      student: "STUDENT",
    };

    const userType = userTypeMap[session.user.role as string] || "ADMIN";

    const result = await getUserNotifications(session.user.id, userType, {
      limit,
      cursor: cursor ? parseInt(cursor) : undefined,
      unreadOnly,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Get notifications error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

//* POST - Create/send notification
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      message,
      type,
      channel,
      recipientId,
      recipientType,
      classId,
      metadata,
      broadcast,
    } = body;

    if (!title || !message || !type) {
      return NextResponse.json(
        { error: "Title, message, and type are required" },
        { status: 400 }
      );
    }

    //* Check if broadcasting (admin only)
    if (broadcast) {
      if (session.user.role !== "admin" && (session.user.role as string) !== "super-admin") {
        return NextResponse.json(
          { error: "Only admins can broadcast notifications" },
          { status: 403 }
        );
      }

      const result = await broadcastNotification({
        title,
        message,
        type,
        channel,
        classId,
        metadata,
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        );
      }

      return NextResponse.json(result);
    }

    //* Validate recipient
    if (!recipientId && !classId) {
      return NextResponse.json(
        { error: "recipientId or classId is required" },
        { status: 400 }
      );
    }

    const userType = recipientType || body.recipientType;

    const result = await sendNotification({
      title,
      message,
      type,
      channel,
      recipientId,
      recipientType: userType,
      classId,
      metadata,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Create notification error:", error);
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );
  }
}

//* DELETE - Mark notification as read
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const notificationId = searchParams.get("id");
    const markAll = searchParams.get("markAll") === "true";

    if (markAll) {
      const userTypeMap: Record<string, any> = {
        admin: "ADMIN",
        teacher: "TEACHER",
        parent: "PARENT",
        student: "STUDENT",
      };

      const userType = userTypeMap[session.user.role as string] || "ADMIN";

      const result = await markAllNotificationsAsRead(session.user.id, userType);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        );
      }

      return NextResponse.json(result);
    }

    if (!notificationId) {
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 }
      );
    }

    const result = await markNotificationAsRead(
      parseInt(notificationId),
      session.user.id
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Mark as read error:", error);
    return NextResponse.json(
      { error: "Failed to mark notification as read" },
      { status: 500 }
    );
  }
}
