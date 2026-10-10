"use client";

import { useState, useTransition, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Users, Check, Square, CheckSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MigrateClassTabProps {
  classes: any[];
}

export function MigrateClassTab({ classes }: MigrateClassTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sourceClassId, setSourceClassId] = useState("");
  const [targetClassId, setTargetClassId] = useState("");
  const [isGraduation, setIsGraduation] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);

  const sourceClass = classes.find((c) => c.id === parseInt(sourceClassId));
  const targetClass = classes.find((c) => c.id === parseInt(targetClassId));

  //* Initialize selected students when source class changes
  useEffect(() => {
    if (sourceClass) {
      setSelectedStudentIds(sourceClass.students.map((s: any) => s.id));
      const name = (sourceClass.name || "").toUpperCase();
      const level = sourceClass.grade?.level ?? 0;

      const isTerminal =
        level === 14 ||
        (level === 3 && name.includes("JHS")) ||
        name.includes("JHS 3") ||
        name.includes("JHS3") ||
        name.includes("BASIC 9") ||
        name.includes("GRADE 9");

      if (isTerminal) {
        setIsGraduation(true);
        setTargetClassId("");
      } else {
        setIsGraduation(false);
        const nextGradeLevel = level + 1;
        let targetGradeClasses = classes.filter((c) => c.grade?.level === nextGradeLevel);

        if (targetGradeClasses.length === 0) {
          const higherGradeClasses = classes.filter((c) => (c.grade?.level ?? 0) > level);
          if (higherGradeClasses.length > 0) {
            const nextLowestLevel = Math.min(...higherGradeClasses.map((c) => c.grade.level));
            targetGradeClasses = classes.filter((c) => c.grade?.level === nextLowestLevel);
          }
        }

        if (targetGradeClasses.length > 0) {
          const streamSectionMatch = sourceClass.name.trim().match(/(?:[\s\-_])([A-Za-z0-9])$/);
          const streamSection = streamSectionMatch ? streamSectionMatch[1].toUpperCase() : null;

          let matchingTarget = null;
          if (streamSection) {
            matchingTarget = targetGradeClasses.find((c) => {
              const targetStreamMatch = c.name.trim().match(/(?:[\s\-_])([A-Za-z0-9])$/);
              const targetStream = targetStreamMatch ? targetStreamMatch[1].toUpperCase() : null;
              return targetStream === streamSection;
            });
          }

          const suggestedTarget = matchingTarget || targetGradeClasses[0];
          setTargetClassId(suggestedTarget.id.toString());
        } else {
          setTargetClassId("");
        }
      }
    } else {
      setSelectedStudentIds([]);
      setIsGraduation(false);
      setTargetClassId("");
    }
  }, [sourceClass, classes]);

  const toggleStudent = (studentId: number) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAll = () => {
    if (sourceClass) {
      setSelectedStudentIds(sourceClass.students.map((s: any) => s.id));
    }
  };

  const deselectAll = () => {
    setSelectedStudentIds([]);
  };

  const handleMigrate = () => {
    if (!sourceClassId || (!targetClassId && !isGraduation)) {
      toast.error("Please select both source and target classes (or mark as Graduation)");
      return;
    }

    if (!isGraduation && sourceClassId === targetClassId) {
      toast.error("Source and target classes cannot be the same");
      return;
    }

    if (selectedStudentIds.length === 0) {
      toast.error("Please select at least one student to migrate");
      return;
    }

    setShowConfirmation(true);
  };

  const confirmMigration = () => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/classes/migrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceClassId: parseInt(sourceClassId),
            targetClassId: isGraduation ? null : parseInt(targetClassId),
            studentIds: selectedStudentIds,
            isGraduation: isGraduation,
          }),
        });

        const result = await response.json();

        if (response.ok) {
          if (isGraduation) {
            toast.success(`Successfully graduated ${selectedStudentIds.length} students`);
          } else {
            toast.success(
              `Successfully migrated ${selectedStudentIds.length} students to ${targetClass?.name}`
            );

            //* Show SMS feedback for repeated students
            const { repeatedCount, smsSentCount, smsFailedCount } = result as {
              repeatedCount?: number;
              smsSentCount?: number;
              smsFailedCount?: number;
            };

            if ((repeatedCount ?? 0) > 0) {
              if ((smsSentCount ?? 0) > 0) {
                toast.info(
                  `📱 SMS alert sent to ${smsSentCount} parent(s) of ${repeatedCount} repeated student(s).${
                    (smsFailedCount ?? 0) > 0
                      ? ` ${smsFailedCount} SMS(es) could not be delivered.`
                      : ""
                  }`
                );
              } else if ((smsFailedCount ?? 0) > 0) {
                toast.warn(
                  `⚠️ ${repeatedCount} student(s) will repeat, but SMS alerts could not be sent (check SMS settings).`
                );
              }
            }
          }

          setSourceClassId("");
          setTargetClassId("");
          setIsGraduation(false);
          setShowConfirmation(false);
          router.refresh();
        } else {
          toast.error(result.error || "Failed to process students");
        }
      } catch (error) {
        console.error("Migration error:", error);
        toast.error("An error occurred during migration");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* ! Class Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="space-y-2">
          <Label htmlFor="sourceClass">Source Class</Label>
          <select
            id="sourceClass"
            value={sourceClassId}
            onChange={(e) => setSourceClassId(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
          >
            <option value="">Select source class...</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} (Grade {cls.grade.level}) - {cls.students.length} students
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-center pb-1">
          <ArrowRight className="w-8 h-8 text-primary" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="targetClass">Target Class</Label>
          <div className="flex gap-2">
            <select
              id="targetClass"
              value={targetClassId}
              onChange={(e) => {
                setTargetClassId(e.target.value);
                if (e.target.value) setIsGraduation(false);
              }}
              disabled={isGraduation}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground disabled:opacity-50"
            >
              <option value="">Select target class...</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} (Grade {cls.grade.level})
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2 border rounded-md px-3 bg-card">
              <input 
                type="checkbox" 
                id="graduation" 
                checked={isGraduation}
                onChange={(e) => {
                  setIsGraduation(e.target.checked);
                  if (e.target.checked) setTargetClassId("");
                }}
                className="w-4 h-4 text-primary"
              />
              <Label htmlFor="graduation" className="text-xs whitespace-nowrap cursor-pointer">Graduation</Label>
            </div>
          </div>
        </div>
      </div>

      {/* ! Migration Preview */}
      {sourceClass && targetClass && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-5">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-full">
              <AlertCircle className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-lg text-foreground mb-1">
                {isGraduation ? "Graduation Preview" : "Migration Preview"}
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                {isGraduation 
                  ? `Select the students from ${sourceClass.name} who are graduating. They will be archived in the Old Students records.`
                  : `Select the students you want to migrate to ${targetClass?.name}. Unselected students will remain in ${sourceClass.name}.`
                }
              </p>
              
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Users className="w-4 h-4 text-primary" />
                  <span>{selectedStudentIds.length} of {sourceClass.students.length} students selected</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs h-8">
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAll} className="text-xs h-8 text-destructive hover:text-destructive">
                    Deselect All
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {sourceClass.students.map((student: any) => {
                  const isSelected = selectedStudentIds.includes(student.id);
                  return (
                    <button
                      key={student.id}
                      onClick={() => toggleStudent(student.id)}
                      className={cn(
                        "flex items-center gap-2 text-xs px-3 py-2 rounded-md border transition-all duration-200 text-left",
                        isSelected 
                          ? "bg-primary/10 border-primary text-primary font-medium" 
                          : "bg-card border-input text-muted-foreground hover:border-primary/50"
                      )}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-3.5 h-3.5" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                      <span className="truncate">{student.name} {student.surname}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ! Warning Message */}
      <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
          <div>
            <h4 className="font-semibold text-destructive mb-1">Important Notice</h4>
            <p className="text-sm text-muted-foreground">
              {isGraduation 
                ? "Graduated students will be removed from the active system and moved to alumni records. This process is archiving."
                : "Students not selected will be \"repeated\" and remain in their current class. Please ensure you have selected the correct students before proceeding."
              }
            </p>
          </div>
        </div>
      </div>

      {/* ! Action Buttons */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setSourceClassId("");
            setTargetClassId("");
            setShowConfirmation(false);
          }}
        >
          Reset
        </Button>
        <Button
          type="button"
          onClick={handleMigrate}
          disabled={!sourceClassId || (!targetClassId && !isGraduation) || selectedStudentIds.length === 0 || isPending}
          className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[140px]"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            isGraduation ? "Archive & Graduate" : "Migrate selected"
          )}
        </Button>
      </div>

      {/* ! Confirmation Dialog */}
      {showConfirmation && (() => {
        const repeatedCount = (sourceClass?.students.length ?? 0) - selectedStudentIds.length;
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in duration-200">
              <h3 className="text-xl font-bold mb-2 text-destructive">
                {isGraduation ? "Confirm Graduation" : "Confirm Migration"}
              </h3>
              <p className="text-foreground mb-4">
                {isGraduation
                  ? `Are you sure you want to graduate ${selectedStudentIds.length} student(s) from ${sourceClass?.name}?`
                  : `Are you sure you want to migrate ${selectedStudentIds.length} student(s) to ${targetClass?.name}?`
                }
              </p>

              {/* Migration detail breakdown */}
              <div className="bg-muted p-3 rounded-lg mb-4 text-sm space-y-1">
                <p className="text-muted-foreground">
                  ✅ <span className="font-medium text-foreground">{selectedStudentIds.length}</span> student(s) will be {isGraduation ? "graduated" : `moved to ${targetClass?.name}`}.
                </p>
                {!isGraduation && repeatedCount > 0 && (
                  <p className="text-muted-foreground">
                    🔁 <span className="font-medium text-amber-600 dark:text-amber-400">{repeatedCount}</span> student(s) will <span className="font-semibold text-amber-600 dark:text-amber-400">REPEAT</span> {sourceClass?.name} next term.
                  </p>
                )}
              </div>

              {/* SMS notification notice */}
              {!isGraduation && repeatedCount > 0 && (
                <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-5 text-sm flex gap-2 items-start">
                  <span className="text-lg leading-none">📱</span>
                  <p className="text-blue-700 dark:text-blue-300">
                    An SMS alert will be automatically sent to the parent(s) of the{" "}
                    <strong>{repeatedCount}</strong> repeated student(s) notifying them of the repeat.
                  </p>
                </div>
              )}

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
                      Processing...
                    </>
                  ) : (
                    isGraduation ? "Confirm Graduation" : "Confirm Migration"
                  )}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
