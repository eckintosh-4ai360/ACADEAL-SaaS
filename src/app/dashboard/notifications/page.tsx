"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  Bell,
  BookOpen,
  Calendar,
  Check,
  CheckCheck,
  Banknote,
  Info,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Notification = {
  id: number;
  title: string;
  message: string;
  type: string;
  channel: string;
  isRead: boolean;
  sentAt: string;
  readAt: string | null;
  metadata: Record<string, unknown> | null;
};

const PAGE_SIZE = 30;

const notificationIcons: Record<string, React.ReactNode> = {
  ANNOUNCEMENT: <Info className="h-5 w-5" />,
  ASSIGNMENT: <BookOpen className="h-5 w-5" />,
  EXAM: <BookOpen className="h-5 w-5" />,
  FEE_REMINDER: <Banknote className="h-5 w-5" />,
  MEETING_REQUEST: <Calendar className="h-5 w-5" />,
  MEETING_REMINDER: <Calendar className="h-5 w-5" />,
  MEETING_CONFIRMATION: <Calendar className="h-5 w-5" />,
  BEHAVIOR: <AlertCircle className="h-5 w-5" />,
  ATTENDANCE: <AlertCircle className="h-5 w-5" />,
  GENERAL: <MessageSquare className="h-5 w-5" />,
};

const notificationColors: Record<string, string> = {
  ANNOUNCEMENT: "bg-blue-500",
  ASSIGNMENT: "bg-purple-500",
  EXAM: "bg-indigo-500",
  FEE_REMINDER: "bg-red-500",
  MEETING_REQUEST: "bg-green-500",
  MEETING_REMINDER: "bg-yellow-500",
  MEETING_CONFIRMATION: "bg-green-500",
  BEHAVIOR: "bg-orange-500",
  ATTENDANCE: "bg-cyan-500",
  GENERAL: "bg-gray-500",
};

function getNotificationUrl(notification: Notification) {
  const metadata = notification.metadata as Record<string, string | number> | null;

  switch (notification.type) {
    case "ANNOUNCEMENT":
      return "/dashboard/announcements";
    case "ASSIGNMENT":
      return metadata?.assignmentId
        ? `/dashboard/assignments/${metadata.assignmentId}`
        : "/dashboard/assignments";
    case "EXAM":
      return "/dashboard/exams";
    case "FEE_REMINDER":
      return "/dashboard/fees";
    case "MEETING_REQUEST":
    case "MEETING_REMINDER":
    case "MEETING_CONFIRMATION":
      return "/dashboard/meetings";
    case "BEHAVIOR":
      return "/dashboard/behaviors";
    case "ATTENDANCE":
      return "/dashboard/attendance";
    default:
      return "/dashboard/notifications";
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastCursor, setLastCursor] = useState<number | null>(null);

  const fetchUnreadCount = async () => {
    const response = await fetch("/api/notifications/unread");
    if (!response.ok) {
      return;
    }

    const data = await response.json();
    setUnreadCount(typeof data.count === "number" ? data.count : 0);
  };

  const fetchNotifications = async ({
    cursor,
    append = false,
    unreadFilter = unreadOnly,
  }: {
    cursor?: number;
    append?: boolean;
    unreadFilter?: boolean;
  } = {}) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams();
      params.set("limit", PAGE_SIZE.toString());
      if (unreadFilter) {
        params.set("unreadOnly", "true");
      }
      if (cursor) {
        params.set("cursor", cursor.toString());
      }

      const response = await fetch(`/api/notifications?${params.toString()}`);
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      const incoming = Array.isArray(data.notifications) ? data.notifications : [];

      setNotifications((prev) => (append ? [...prev, ...incoming] : incoming));
      setHasMore(Boolean(data.hasMore));
      setLastCursor(typeof data.lastCursor === "number" ? data.lastCursor : null);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const loadNotifications = async () => {
      setLoading(true);

      try {
        const params = new URLSearchParams();
        params.set("limit", PAGE_SIZE.toString());
        if (unreadOnly) {
          params.set("unreadOnly", "true");
        }

        const [notificationsResponse, unreadResponse] = await Promise.all([
          fetch(`/api/notifications?${params.toString()}`),
          fetch("/api/notifications/unread"),
        ]);

        if (notificationsResponse.ok) {
          const notificationsData = await notificationsResponse.json();
          const incoming = Array.isArray(notificationsData.notifications)
            ? notificationsData.notifications
            : [];

          setNotifications(incoming);
          setHasMore(Boolean(notificationsData.hasMore));
          setLastCursor(
            typeof notificationsData.lastCursor === "number"
              ? notificationsData.lastCursor
              : null
          );
        }

        if (unreadResponse.ok) {
          const unreadData = await unreadResponse.json();
          setUnreadCount(typeof unreadData.count === "number" ? unreadData.count : 0);
        }
      } finally {
        setLoading(false);
      }
    };

    void loadNotifications();
  }, [unreadOnly]);

  const markAsRead = async (notificationId: number) => {
    const target = notifications.find((notification) => notification.id === notificationId);
    if (!target || target.isRead) {
      return;
    }

    const response = await fetch(`/api/notifications?id=${notificationId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      return;
    }

    setUnreadCount((prev) => Math.max(prev - 1, 0));
    setNotifications((prev) =>
      unreadOnly
        ? prev.filter((notification) => notification.id !== notificationId)
        : prev.map((notification) =>
            notification.id === notificationId
              ? {
                  ...notification,
                  isRead: true,
                  readAt: new Date().toISOString(),
                }
              : notification
          )
    );
  };

  const markAllAsRead = async () => {
    const response = await fetch("/api/notifications?markAll=true", {
      method: "DELETE",
    });

    if (!response.ok) {
      return;
    }

    setUnreadCount(0);
    setNotifications((prev) =>
      unreadOnly
        ? []
        : prev.map((notification) => ({
            ...notification,
            isRead: true,
            readAt: new Date().toISOString(),
          }))
    );
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    router.push(getNotificationUrl(notification));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
          <p className="mt-1 text-muted-foreground">
            Review updates from assignments, meetings, announcements, and other activity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant={unreadOnly ? "outline" : "default"}
            onClick={() => setUnreadOnly(false)}
          >
            All
          </Button>
          <Button
            type="button"
            variant={unreadOnly ? "default" : "outline"}
            onClick={() => setUnreadOnly(true)}
          >
            Unread
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void Promise.all([fetchNotifications(), fetchUnreadCount()])}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void markAllAsRead()}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark All Read
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Unread Notifications</p>
              <p className="text-2xl font-semibold text-foreground">{unreadCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Check className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Loaded Items</p>
              <p className="text-2xl font-semibold text-foreground">{notifications.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Filter</p>
              <p className="text-2xl font-semibold text-foreground">
                {unreadOnly ? "Unread" : "All"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border bg-muted/20">
          <CardTitle className="text-lg text-foreground">
            {unreadOnly ? "Unread Notifications" : "All Notifications"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="mt-3 text-sm">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 opacity-50" />
              <p className="mt-3 text-base font-medium text-foreground">No notifications found</p>
              <p className="mt-1 text-sm">
                {unreadOnly
                  ? "There are no unread notifications right now."
                  : "You are all caught up."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => {
                const icon =
                  notificationIcons[notification.type] ?? <Info className="h-5 w-5" />;
                const color = notificationColors[notification.type] ?? "bg-gray-500";

                return (
                  <div
                    key={notification.id}
                    className={`flex gap-4 p-5 transition-colors ${
                      notification.isRead ? "bg-card" : "bg-muted/20"
                    } hover:bg-muted/40`}
                  >
                    <button
                      type="button"
                      onClick={() => void handleNotificationClick(notification)}
                      className="flex min-w-0 flex-1 items-start gap-4 text-left"
                    >
                      <div
                        className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-white ${color}`}
                      >
                        {icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-sm font-semibold text-foreground">
                            {notification.title}
                          </h2>
                          {!notification.isRead && (
                            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
                              New
                            </span>
                          )}
                          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            {notification.type.replaceAll("_", " ")}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {notification.message}
                        </p>
                        <p className="mt-3 text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.sentAt), { addSuffix: true })}
                        </p>
                      </div>
                    </button>

                    {!notification.isRead && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-1 h-9 w-9 flex-shrink-0"
                        onClick={() => void markAsRead(notification.id)}
                        aria-label="Mark notification as read"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}

              {hasMore && (
                <div className="flex justify-center p-5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      void fetchNotifications({
                        append: true,
                        cursor: lastCursor ?? undefined,
                      })
                    }
                    disabled={loadingMore}
                  >
                    {loadingMore ? "Loading..." : "Load More"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
