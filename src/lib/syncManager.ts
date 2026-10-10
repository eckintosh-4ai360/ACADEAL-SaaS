/**
 * lib/syncManager.ts — Piece 4: Sync Manager
 *
 * Drains the IndexedDB syncQueue in batches of 50 and POSTs to /api/sync/push.
 * - Runs on window "online" event
 * - Also polls every 30s when online
 * - Last-write-wins conflict resolution is handled server-side
 * - Failed items increment `attempts` and are retried next cycle (max 10 attempts)
 */

import { db, type SyncQueueItem } from "@/lib/db";

const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 30_000;

let isSyncing = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;

// ─── Core drain function ──────────────────────────────────────────────────────

/**
 * Drains the sync queue in batches of up to 50.
 * Marks successful items as synced and removes them from the queue.
 * Increments attempts on failed items.
 */
export async function drainSyncQueue(): Promise<void> {
  if (isSyncing) return;
  if (typeof window === "undefined") return;
  if (!navigator.onLine) return;

  isSyncing = true;

  try {
    // Get items below max attempt threshold, oldest first
    const items: SyncQueueItem[] = await db.syncQueue
      .where("attempts")
      .below(MAX_ATTEMPTS)
      .limit(BATCH_SIZE)
      .toArray();

    if (items.length === 0) {
      isSyncing = false;
      return;
    }

    let response: Response;
    try {
      response = await fetch("/api/sync/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
    } catch (networkError) {
      console.error("[SyncManager] Network error during push:", networkError);
      // Increment attempts for all items in this batch
      await incrementAttempts(items, String(networkError));
      isSyncing = false;
      return;
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "unknown error");
      console.error(`[SyncManager] Push failed (${response.status}):`, body);
      await incrementAttempts(items, `HTTP ${response.status}: ${body}`);
      isSyncing = false;
      return;
    }

    const result = await response.json() as {
      synced: string[];
      failed: Array<{ id: string; error: string }>;
    };

    // Remove successfully synced items
    if (result.synced && result.synced.length > 0) {
      await db.syncQueue.bulkDelete(result.synced);
    }

    // Increment attempts for server-reported failures
    if (result.failed && result.failed.length > 0) {
      const failedItems = items.filter((item) =>
        result.failed.some((f) => f.id === item.id)
      );
      const errors = Object.fromEntries(
        result.failed.map((f) => [f.id, f.error])
      );
      await incrementAttempts(failedItems, undefined, errors);
    }

    // If there are more items, drain again immediately
    const remaining = await db.syncQueue.count();
    if (remaining > 0 && navigator.onLine) {
      isSyncing = false;
      await drainSyncQueue();
      return;
    }
  } catch (error) {
    console.error("[SyncManager] drainSyncQueue error:", error);
  }

  isSyncing = false;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function incrementAttempts(
  items: SyncQueueItem[],
  sharedError?: string,
  perItemErrors?: Record<string, string>
): Promise<void> {
  const updated = items.map((item) => ({
    ...item,
    attempts: item.attempts + 1,
    lastError: perItemErrors?.[item.id] ?? sharedError ?? item.lastError,
  }));
  try {
    await db.syncQueue.bulkPut(updated);
  } catch (error) {
    console.error("[SyncManager] Failed to increment attempts:", error);
  }
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

/**
 * Start the sync manager. Call once on app boot from a client component.
 * Sets up online/offline listeners and a polling interval.
 */
export function startSyncManager(): () => void {
  if (typeof window === "undefined") return () => {};

  const handleOnline = () => {
    console.info("[SyncManager] Online — draining queue");
    drainSyncQueue().catch((e) =>
      console.error("[SyncManager] drain on online event failed:", e)
    );
  };

  window.addEventListener("online", handleOnline);

  // Poll every 30s when online
  pollTimer = setInterval(() => {
    if (navigator.onLine) {
      drainSyncQueue().catch((e) =>
        console.error("[SyncManager] poll drain failed:", e)
      );
    }
  }, POLL_INTERVAL_MS);

  // Drain immediately if already online
  if (navigator.onLine) {
    drainSyncQueue().catch((e) =>
      console.error("[SyncManager] initial drain failed:", e)
    );
  }

  // Return a cleanup function
  return () => {
    window.removeEventListener("online", handleOnline);
    if (pollTimer) clearInterval(pollTimer);
  };
}
