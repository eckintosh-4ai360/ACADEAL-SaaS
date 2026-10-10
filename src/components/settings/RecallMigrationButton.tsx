"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { RotateCcw, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

interface SnapshotSummary {
  id: string;
  createdAt: string | Date;
  migrationType: string;
  description: string;
  studentCount: number;
  graduatedCount: number;
}

export function RecallMigrationButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [snapshot, setSnapshot] = useState<SnapshotSummary | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/classes/migrate/rollback");
      if (res.ok) {
        const data = await res.json();
        if (data.hasSnapshot && data.snapshot) {
          setSnapshot(data.snapshot);
        } else {
          setSnapshot(null);
        }
      }
    } catch (err) {
      console.error("Failed to load migration snapshot status:", err);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleRollback = () => {
    if (!snapshot) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/classes/migrate/rollback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ snapshotId: snapshot.id }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          toast.success(data.message || "Migration successfully recalled!");
          setShowModal(false);
          setSnapshot(null);
          router.refresh();
          // Refetch to see if another earlier snapshot is available
          await fetchStatus();
        } else {
          toast.error(data.error || "Failed to recall migration");
        }
      } catch (err) {
        console.error("Error executing rollback:", err);
        toast.error("An error occurred while recalling the migration");
      }
    });
  };

  if (loadingStatus) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2 text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Checking history...
      </Button>
    );
  }

  if (!snapshot) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        title="No unreverted migration snapshot found"
        className="gap-2 text-muted-foreground opacity-60 cursor-not-allowed"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        No Recent Migration to Recall
      </Button>
    );
  }

  const formattedDate = (() => {
    try {
      return format(new Date(snapshot.createdAt), "MMM dd, yyyy · hh:mm a");
    } catch {
      return "Recent";
    }
  })();

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setShowModal(true)}
        className="gap-2 border-amber-500/60 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 hover:text-amber-800 dark:border-amber-400/40 dark:text-amber-300 dark:hover:bg-amber-950/40 font-semibold transition-all shadow-sm"
      >
        <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        Recall Last Migration
      </Button>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-full">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">
                  Recall / Undo Migration
                </h3>
                <p className="text-xs text-muted-foreground">
                  Revert database to the state before the latest migration
                </p>
              </div>
            </div>

            {/* Snapshot Details Card */}
            <div className="bg-muted/40 border rounded-lg p-4 mb-4 space-y-2 text-sm">
              <div className="flex justify-between items-center text-xs text-muted-foreground border-b pb-2">
                <span>Migration Executed:</span>
                <span className="font-semibold text-foreground">{formattedDate}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-muted-foreground border-b pb-2">
                <span>Description:</span>
                <span className="font-medium text-foreground">{snapshot.description}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2 bg-background border rounded text-center">
                  <span className="block text-lg font-bold text-foreground">
                    {snapshot.studentCount}
                  </span>
                  <span className="text-xs text-muted-foreground">Students to Revert</span>
                </div>
                <div className="p-2 bg-background border rounded text-center">
                  <span className="block text-lg font-bold text-foreground">
                    {snapshot.graduatedCount}
                  </span>
                  <span className="text-xs text-muted-foreground">Alumni to Reinstate</span>
                </div>
              </div>
            </div>

            {/* Warning callout */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg p-3 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2.5 mb-6">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Are you sure you want to recall this migration?</p>
                <p className="mt-0.5 text-amber-800/90 dark:text-amber-300/80">
                  All students moved during this run will be returned to their previous class and grade.
                  Any students who graduated to Alumni will be reinstated as active students.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleRollback}
                disabled={isPending}
                className="bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 font-semibold gap-2"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Reverting Migration...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Confirm & Recall Migration
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
