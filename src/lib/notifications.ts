import prisma from "./prisma";
import {
  NotificationType,
  NotificationChannel,
  Prisma,
  UserType,
} from "@prisma/client";
import { resolveCurrentAppBaseUrl } from "./app-url";

type NotificationData = {
  title: string;
  message: string;
  type: NotificationType;
  channel?: NotificationChannel;
  recipientId?: string;
  recipientType?: UserType;
  classId?: number;
  metadata?: Record<string, unknown>;
};

/**
 * Create and send a notification
 */
export async function sendNotification(data: NotificationData) {
  const {
    title,
    message,
    type,
    channel = NotificationChannel.IN_APP,
    recipientId,
    recipientType,
    classId,
    metadata,
  } = data;

  try {
    //* Create in-app notification
    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        type,
        channel,
        recipientId,
        recipientType,
        classId,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
      },
    });

    //* If push notification is requested and we have subscriptions
    if (channel === NotificationChannel.PUSH || channel === NotificationChannel.IN_APP) {
      await sendPushNotification({
        ...notification,
        metadata: notification.metadata as Record<string, unknown> | null,
      });
    }

    return { success: true, notification };
  } catch (error) {
    console.error("Notification sending error:", error);
    return { success: false, error: "Failed to send notification" };
  }
}

/**
 * Send push notification to all subscribed devices for a user
 */
export async function sendPushNotification(notification: {
  id: number;
  recipientId?: string | null;
  recipientType?: UserType | null;
  title: string;
  message: string;
  type?: NotificationType;
  metadata?: Record<string, unknown> | null;
}) {
  try {
    if (!notification.recipientId || !notification.recipientType) {
      return { sent: 0, failed: 0 };
    }

    //* Get push subscriptions for the user
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId: notification.recipientId,
        userType: notification.recipientType,
      },
    });

    if (subscriptions.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.message,
      icon: "/icon-192x192.png",
      badge: "/badge-72x72.png",
      data: {
        notificationId: notification.id,
        type: notification.type || "GENERAL",
        url: await getNotificationUrl(notification.type || "GENERAL", notification.metadata),
      },
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub) => sendWebPush(sub, payload))
    );

    const sent = results.filter((r) => r.status === "fulfilled" && r.value).length;
    const failed = results.length - sent;

    return { sent, failed };
  } catch (error) {
    console.error("Push notification error:", error);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Send web push notification to a single subscription
 */
async function sendWebPush(subscription: {
  endpoint: string;
  p256dh: string;
  auth: string;
}, payload: string) {
  try {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT;

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn("VAPID keys not configured, skipping push notification");
      return false;
    }

    const webPush = await import("web-push");

    webPush.setVapidDetails(
      vapidSubject || "mailto:admin@school.com",
      vapidPublicKey,
      vapidPrivateKey
    );

    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      payload
    );

    return true;
  } catch (error) {
    console.error("Web push send error:", error);
    return false;
  }
}

/**
 * Get URL to navigate to when notification is clicked
 */
async function getNotificationUrl(
  type: NotificationType,
  metadata?: Record<string, unknown> | null
): Promise<string> {
  const baseUrl = await resolveCurrentAppBaseUrl();

  switch (type) {
    case NotificationType.ANNOUNCEMENT:
      return `${baseUrl}/dashboard/announcements`;
    case NotificationType.ASSIGNMENT:
      return metadata?.assignmentId ? `${baseUrl}/dashboard/assignments/${metadata.assignmentId}` : `${baseUrl}/dashboard/assignments`;
    case NotificationType.EXAM:
      return `${baseUrl}/dashboard/exams`;
    case NotificationType.FEE_REMINDER:
      return `${baseUrl}/dashboard/fees`;
    case NotificationType.MEETING_REQUEST:
    case NotificationType.MEETING_REMINDER:
    case NotificationType.MEETING_CONFIRMATION:
      return `${baseUrl}/dashboard/meetings`;
    case NotificationType.BEHAVIOR:
      return `${baseUrl}/dashboard/behaviors`;
    case NotificationType.ATTENDANCE:
      return `${baseUrl}/dashboard/attendance`;
    default:
      return `${baseUrl}/dashboard/notifications`;
  }
}

/**
 * Send notification to all students in a class
 */
export async function sendClassNotification(
  classId: number,
  data: Omit<NotificationData, "classId">
) {
  try {
    const notification = await prisma.notification.create({
      data: {
        ...data,
        classId,
        metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : undefined,
      },
    });

    //* Send push to all students in the class
    const students = await prisma.student.findMany({
      where: { classId },
      select: { id: true },
    });

    const pushPromises = students.map((student) =>
      sendPushNotification({
        ...notification,
        recipientId: student.id,
        recipientType: UserType.STUDENT,
        metadata: notification.metadata as Record<string, unknown> | null,
      })
    );

    await Promise.allSettled(pushPromises);

    return { success: true, notification };
  } catch (error) {
    console.error("Class notification error:", error);
    return { success: false, error: "Failed to send class notification" };
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: number, userId: string) {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return { success: false, error: "Notification not found" };
    }

    //* Check if user owns this notification
    const isOwner =
      notification.recipientId === userId ||
      (notification.classId && await isUserInClass(userId, notification.classId));

    if (!isOwner) {
      return { success: false, error: "Unauthorized" };
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { success: true, notification: updated };
  } catch (error) {
    console.error("Mark as read error:", error);
    return { success: false, error: "Failed to mark as read" };
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string, userType: UserType) {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        OR: [
          { recipientId: userId, recipientType: userType },
          {
            classId: {
              in: await getUserClassIds(userId, userType),
            },
          },
        ],
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { success: true, count: result.count };
  } catch (error) {
    console.error("Mark all as read error:", error);
    return { success: false, error: "Failed to mark all as read" };
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: string, userType: UserType) {
  try {
    const classIds = await getUserClassIds(userId, userType);

    const count = await prisma.notification.count({
      where: {
        OR: [
          { recipientId: userId, recipientType: userType },
          { classId: { in: classIds } },
        ],
        isRead: false,
      },
    });

    return { count };
  } catch (error) {
    console.error("Unread count error:", error);
    return { count: 0 };
  }
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  userType: UserType,
  options?: { limit?: number; cursor?: number; unreadOnly?: boolean }
) {
  try {
    const classIds = await getUserClassIds(userId, userType);
    const { limit = 20, cursor, unreadOnly = false } = options || {};

    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { recipientId: userId, recipientType: userType },
          { classId: { in: classIds } },
        ],
        ...(unreadOnly ? { isRead: false } : {}),
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      orderBy: { sentAt: "desc" },
      take: limit,
    });

    const hasMore = notifications.length === limit;
    const lastCursor = notifications.length > 0 ? notifications[notifications.length - 1].id : null;

    return { notifications, hasMore, lastCursor };
  } catch (error) {
    console.error("Get notifications error:", error);
    return { notifications: [], hasMore: false, lastCursor: null };
  }
}

/**
 * Helper: Get class IDs for a user based on their type
 */
async function getUserClassIds(userId: string, userType: UserType): Promise<number[]> {
  try {
    switch (userType) {
      case UserType.STUDENT: {
        const student = await prisma.student.findUnique({
          where: { id: userId },
          select: { classId: true },
        });
        return student?.classId ? [student.classId] : [];
      }
      case UserType.TEACHER: {
        const teacherClasses = await prisma.class.findMany({
          where: { supervisorId: userId },
          select: { id: true },
        });
        return teacherClasses.map((c) => c.id);
      }
      case UserType.PARENT: {
        const students = await prisma.student.findMany({
          where: { parentId: userId },
          select: { classId: true },
        });
        return [...new Set(students.map((s) => s.classId))];
      }
      case UserType.ADMIN:
        return []; //* Admins see all notifications
      default:
        return [];
    }
  } catch {
    return [];
  }
}

/**
 * Helper: Check if user is in a specific class
 */
async function isUserInClass(userId: string, classId: number): Promise<boolean> {
  try {
    const student = await prisma.student.findFirst({
      where: { id: userId, classId },
    });
    return !!student;
  } catch {
    return false;
  }
}

/**
 * Broadcast notification to all users (admin only)
 */
export async function broadcastNotification(data: Omit<NotificationData, "recipientId" | "recipientType">) {
  try {
    const notification = await prisma.notification.create({
      data: {
        title: data.title,
        message: data.message,
        type: data.type,
        channel: data.channel,
        classId: data.classId,
        metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : undefined,
        recipientId: null,
        recipientType: null,
      },
    });

    return { success: true, notification };
  } catch (error) {
    console.error("Broadcast notification error:", error);
    return { success: false, error: "Failed to broadcast notification" };
  }
}
