"use client";

import { useState, useTransition, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Loader2, RefreshCw } from "lucide-react";

interface TotalClassMigrationTabProps {
  classes: any[];
}

export function TotalClassMigrationTab({ classes }: TotalClassMigrationTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [migrations, setMigrations] = useState<any[]>([]);

  // Auto-map logic helper
  const calculateNextClass = (sourceClass: any) => {
    const name = (sourceClass.name || "").toUpperCase();
    const level = sourceClass.grade?.level ?? 0;

    // Terminal graduation detection (JHS 3 / Basic 9 / Grade 14)
    if (
      level === 14 ||
      (level === 3 && name.includes("JHS")) ||
      name.includes("JHS 3") ||
      name.includes("JHS3") ||
      name.includes("BASIC 9") ||
      name.includes("GRADE 9")
    ) {
      return { targetClassId: "", isGraduation: true };
    }

    const nextGradeLevel = level + 1;
    let targetGradeClasses = classes.filter((c) => c.grade?.level === nextGradeLevel);

    // If no classes at strictly next level, search for the next available higher level
    if (targetGradeClasses.length === 0) {
      const higherGradeClasses = classes.filter((c) => (c.grade?.level ?? 0) > level);
      if (higherGradeClasses.length > 0) {
        const nextLowestLevel = Math.min(...higherGradeClasses.map((c) => c.grade.level));
        targetGradeClasses = classes.filter((c) => c.grade?.level === nextLowestLevel);
      }
    }

    if (targetGradeClasses.length === 0) {
      return { targetClassId: "", isGraduation: false };
    }

    // Extract stream suffix properly (e.g., "Basic 1 A" -> "A")
    const streamSectionMatch = sourceClass.name.trim().match(/(?:[\s\-_])([A-Za-z0-9])$/);
    const streamSection = streamSectionMatch ? streamSectionMatch[1].toUpperCase() : null;

    if (streamSection) {
      const matchingStream = targetGradeClasses.find((c) => {
        const targetStreamMatch = c.name.trim().match(/(?:[\s\-_])([A-Za-z0-9])$/);
        const targetStream = targetStreamMatch ? targetStreamMatch[1].toUpperCase() : null;
        return targetStream === streamSection;
      });

      if (matchingStream) {
        return { targetClassId: matchingStream.id.toString(), isGraduation: false };
      }
    }

    // Default to the first available class in the target grade level
    // (Handles unstreamed classes like CRECHE -> NURSERY 1, NURSERY 1 -> NURSERY 2, NURSERY 2 -> KG 1 A)
    return { targetClassId: targetGradeClasses[0].id.toString(), isGraduation: false };
  };

  useEffect(() => {
    const defaultMigrations = classes.map((cls) => ({
      sourceClassId: cls.id.toString(),
      ...calculateNextClass(cls),
    }));
    setMigrations(defaultMigrations);
  }, [classes]);

  const handleTargetChange = (sourceClassId: string, value: string) => {
    setMigrations((prev) =>
      prev.map((m) => {
        if (m.sourceClassId === sourceClassId) {
          if (value === "graduation") {
            return { ...m, targetClassId: "", isGraduation: true };
          }
          return { ...m, targetClassId: value, isGraduation: false };
        }
        return m;
      })
    );
  };

  const handleMigrateAll = () => {
    // Validation
    const invalidMigrations = migrations.filter(
        (m) =>
            m.sourceClassId === m.targetClassId && !m.isGraduation
    );

    if (invalidMigrations.length > 0) {
      toast.error("Source and target classes cannot be the same.");
      return;
    }

    // Filter migrations that have a configured action (a target or graduation)
    const activeMigrations = migrations.filter(m => m.targetClassId || m.isGraduation);
    
    if(activeMigrations.length === 0) {
      toast.error("Set at least one target class or mark as graduation");
      return;
    }

    setShowConfirmation(true);
  };

  const confirmMigration = () => {
    startTransition(async () => {
      try {
        const activeMigrations = migrations
          .filter((m) => m.targetClassId !== "" || m.isGraduation)
          .map(m => ({
            sourceClassId: parseInt(m.sourceClassId),
            targetClassId: m.isGraduation ? null : parseInt(m.targetClassId),
            isGraduation: m.isGraduation
          }));

        const response = await fetch("/api/classes/migrate-all", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ migrations: activeMigrations }),
        });

        const result = await response.json();

        if (response.ok) {
          toast.success(result.message);
          setShowConfirmation(false);
          router.refresh();
        } else {
          toast.error(result.error || "Failed to process total class migration");
        }
      } catch (error) {
        console.error("Migration error:", error);
        toast.error("An error occurred during total migration");
      }
    });
  };

  const activeCount = migrations.filter((m) => m.targetClassId !== "" || m.isGraduation).length;

  return (
    <div className="space-y-6">
      {/* ! Info & Warning */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-5">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-primary/10 rounded-full">
            <RefreshCw className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-lg text-foreground mb-1">
              Total Class Migration
            </h4>
            <p className="text-sm text-muted-foreground">
              Define the target class manually for each class to promote all its students at once.
              You can also designate a class for Graduation to push its students to the Alumni table.
              Classes left as "Do Not Migrate" are safely skipped.
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left align-middle border-collapse">
          <thead>
            <tr className="border-b bg-muted/50 text-muted-foreground">
              <th className="py-3 px-4 font-medium">Source Class</th>
              <th className="py-3 px-4 font-medium">Students</th>
              <th className="py-3 px-4 font-medium text-center w-12"></th>
              <th className="py-3 px-4 font-medium">Target Class / Action</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((cls) => {
              const migrationState = migrations.find((m) => m.sourceClassId === cls.id.toString()) || { targetClassId: "", isGraduation: false };

              return (
                <tr key={cls.id} className="border-b hover:bg-muted/20">
                  <td className="py-3 px-4">
                    <span className="font-medium text-foreground">{cls.name}</span>
                    <span className="text-muted-foreground text-xs ml-2">(Grade {cls.grade.level})</span>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {cls.students.length}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <ArrowRight className="w-4 h-4 text-primary mx-auto" />
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={migrationState.isGraduation ? "graduation" : migrationState.targetClassId}
                      onChange={(e) => handleTargetChange(cls.id.toString(), e.target.value)}
                      className="w-full px-3 py-1.5 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground text-sm"
                    >
                      <option value="">Do Not Migrate</option>
                      <optgroup label="Available Classes">
                        {classes.map((tCls) => (
                          <option key={tCls.id} value={tCls.id.toString()}>
                            {tCls.name} (Grade {tCls.grade.level})
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Actions">
                         <option value="graduation">🎓 Graduate to Alumni</option>
                      </optgroup>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ! Action Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button
          type="button"
          onClick={handleMigrateAll}
          disabled={activeCount === 0 || isPending}
          className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[200px]"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            `Migrate ${activeCount} Class${activeCount !== 1 ? 'es' : ''}`
          )}
        </Button>
      </div>

      {/* ! Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-2 text-destructive">
               Confirm Total Migration
            </h3>
            <p className="text-foreground mb-4">
               You are about to migrate {activeCount} classes containing all their current students.
            </p>
            <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg mb-6 text-sm flex gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-destructive font-medium">
                This action is significant. Students graduating will be moved to the Alumni directory.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowConfirmation(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmMigration}
                disabled={isPending}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Executing...
                  </>
                ) : (
                  "Execute Migration"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
