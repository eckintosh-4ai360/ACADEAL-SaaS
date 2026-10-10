"use client";

/**
 * components/OfflineStatusBar.tsx
 *
 * Shows a live banner across the top of the app:
 * - Amber: offline. Shows count of pending changes.
 * - Blue + spinner: syncing (came back online, draining queue).
 * - Green flash: sync complete (auto-hides after 3s).
 * - Hidden when online and queue is fully empty.
 *
 * Uses useLiveQuery so the pending count auto-updates from IndexedDB.
 */

import { useEffect, useState, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { drainSyncQueue } from "@/lib/syncManager";
import { Wifi, WifiOff, RefreshCw, CheckCircle } from "lucide-react";

type SyncState = "online-synced" | "online-syncing" | "offline" | "hidden";

export default function OfflineStatusBar() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [syncState, setSyncState] = useState<SyncState>("hidden");
  const [justSynced, setJustSynced] = useState(false);

  // Live count of pending sync items from IndexedDB
  // useLiveQuery returns undefined on first render, so ?? 0 ensures number throughout
  const rawCount = useLiveQuery<number>(() => db.syncQueue.count());
  const pendingCount: number = rawCount ?? 0;

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setSyncState("online-syncing");
    drainSyncQueue()
      .then(() => {
        setSyncState("online-synced");
        setJustSynced(true);
        setTimeout(() => {
          setJustSynced(false);
          setSyncState("hidden");
        }, 3000);
      })
      .catch((error: unknown) => {
        console.error("[OfflineStatusBar] drainSyncQueue error:", error);
        setSyncState("hidden");
      });
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setSyncState("offline");
  }, []);

  useEffect(() => {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (!navigator.onLine) {
      setSyncState("offline");
    } else if (pendingCount > 0) {
      setSyncState("online-syncing");
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleOnline, handleOffline, pendingCount]);

  // Update state reactively when pendingCount changes
  useEffect(() => {
    if (!isOnline) return;
    if (pendingCount > 0) {
      setSyncState("online-syncing");
    } else if (!justSynced) {
      setSyncState("hidden");
    }
  }, [pendingCount, isOnline, justSynced]);

  if (syncState === "hidden") return null;

  const count = pendingCount;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={
        syncState === "offline"
          ? "You are offline"
          : syncState === "online-syncing"
          ? "Syncing changes"
          : "Changes synced"
      }
      className={[
        "fixed top-0 left-0 right-0 z-[9999]",
        "flex items-center justify-center gap-2",
        "px-4 py-2 text-sm font-medium text-white",
        "transition-all duration-300 ease-in-out shadow-lg",
        syncState === "offline"
          ? "bg-amber-500"
          : syncState === "online-syncing"
          ? "bg-blue-500"
          : "bg-emerald-500",
      ].join(" ")}
    >
      {syncState === "offline" && (
        <>
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>
            You&apos;re offline
            {count > 0
              ? ` — ${count} change${count === 1 ? "" : "s"} pending sync`
              : " — changes will sync when connection returns"}
          </span>
        </>
      )}

      {syncState === "online-syncing" && (
        <>
          <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
          <span>
            Syncing {count} pending change{count === 1 ? "" : "s"}…
          </span>
        </>
      )}

      {syncState === "online-synced" && (
        <>
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>All changes synced</span>
          <Wifi className="h-4 w-4 shrink-0" />
        </>
      )}
    </div>
  );
}
