"use client";

/**
 * components/SyncManagerMount.tsx
 *
 * Mounts the sync manager exactly once on app boot.
 * This is a zero-UI component — it renders nothing but wires up
 * the sync lifecycle (online listener + polling interval).
 *
 * Must be a 'use client' component because it uses useEffect.
 */

import { useEffect } from "react";
import { startSyncManager } from "@/lib/syncManager";

export default function SyncManagerMount() {
  useEffect(() => {
    const cleanup = startSyncManager();
    return cleanup;
  }, []);

  return null;
}
