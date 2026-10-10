"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import { Bell, Check, CheckCheck, X, AlertCircle, Calendar, BookOpen, Banknote, MessageSquare, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const notificationIcons: Record<string, ReactNode> = {
  ANNOUNCEMENT: <Info className="w-5 h-5" />,
  ASSIGNMENT: <BookOpen className="w-5 h-5" />,
  EXAM: <BookOpen className="w-5 h-5" />,
  FEE_REMINDER: <Banknote className="w-5 h-5" />,
  MEETING_REQUEST: <Calendar className="w-5 h-5" />,
  MEETING_REMINDER: <Calendar className="w-5 h-5" />,
  MEETING_CONFIRMATION: <Calendar className="w-5 h-5" />,
  BEHAVIOR: <AlertCircle className="w-5 h-5" />,
  ATTENDANCE: <AlertCircle className="w-5 h-5" />,
  GENERAL: <MessageSquare className="w-5 h-5" />,
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

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastCursor, setLastCursor] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  //* Fetch notifications
  const fetchNotifications = async (unreadOnly = false, cursor?: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "20");
      if (unreadOnly) params.set("unreadOnly", "true");
      if (cursor) params.set("cursor", cursor.toString());

      const response = await fetch(`/api/notifications?${params}`);
      if (!response.ok) return;

      const data = await response.json();
      
      if (cursor) {
        setNotifications(prev => [...prev, ...(data.notifications || [])]);
      } else {
        setNotifications(data.notifications || []);
      }
      
      setHasMore(data.hasMore || false);
      setLastCursor(data.lastCursor || null);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  //* Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const response = await fetch("/api/notifications/unread");
      if (!response.ok) return;
      const data = await response.json();
      setUnreadCount(data.count || 0);
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [isOpen]);

  //* Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);

  //* Mark notification as read
  const markAsRead = async (notificationId: number) => {
    try {
      const response = await fetch(`/api/notifications?id=${notificationId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) return;

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
        )
      );
      
      fetchUnreadCount();
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  //* Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications?markAll=true", {
        method: "DELETE",
      });
      
      if (!response.ok) return;

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  //* Get notification URL on click
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    const metadata = notification.metadata as Record<string, string> | null;
    let url = "/dashboard/notifications";

    switch (notification.type) {
      case "ANNOUNCEMENT":
        url = "/dashboard/announcements";
        break;
      case "ASSIGNMENT":
        url = metadata?.assignmentId ? `/dashboard/assignments/${metadata.assignmentId}` : "/dashboard/assignments";
        break;
      case "EXAM":
        url = "/dashboard/exams";
        break;
      case "FEE_REMINDER":
        url = "/dashboard/fees";
        break;
      case "MEETING_REQUEST":
      case "MEETING_REMINDER":
      case "MEETING_CONFIRMATION":
        url = "/dashboard/meetings";
        break;
      case "BEHAVIOR":
        url = "/dashboard/behaviors";
        break;
      case "ATTENDANCE":
        url = "/dashboard/attendance";
        break;
    }

    window.location.href = url;
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-96 max-h-[80vh] bg-card rounded-lg shadow-lg border border-border overflow-hidden z-50"
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-muted/50">
        <div className="flex items-center space-x-2">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="p-1 hover:bg-muted rounded text-xs text-muted-foreground hover:text-foreground"
              title="Mark all as read"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="overflow-y-auto max-h-[60vh]">
        {loading && notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-sm">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notifications</p>
            <p className="text-xs mt-1">You&apos;re all caught up!</p>
          </div>
        ) : (
          <>
            {notifications.map((notification) => {
              const icon = notificationIcons[notification.type] || <Info className="w-5 h-5" />;
              const color = notificationColors[notification.type] || "bg-gray-500";

              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 border-b border-border hover:bg-muted/50 cursor-pointer transition-colors ${
                    !notification.isRead ? "bg-muted/30" : ""
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center text-white flex-shrink-0`}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h4 className={`text-sm font-semibold text-foreground line-clamp-1 ${!notification.isRead ? "font-bold" : ""}`}>
                          {notification.title}
                        </h4>
                        {!notification.isRead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="p-1 hover:bg-muted rounded text-muted-foreground flex-shrink-0 ml-2"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(notification.sentAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {hasMore && (
              <div className="p-4 text-center">
                <button
                  onClick={() => fetchNotifications(false, lastCursor || undefined)}
                  disabled={loading}
                  className="text-sm text-primary hover:underline disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border bg-muted/30 text-center">
        <button
          onClick={() => {
            onClose();
            window.location.href = "/dashboard/notifications";
          }}
          className="text-sm text-primary hover:underline"
        >
          View All Notifications
        </button>
      </div>
    </div>
  );
}
