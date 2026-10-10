"use client";

import { useCallback, useState, useEffect, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, UserMinus, Loader2 } from "lucide-react";
import { markStudentAsDropout } from "@/lib/actions/dropout";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

interface Student {
  id: string;
  name: string;
  surname: string;
  studentId?: string;
  class: { name: string };
  grade: { level: number };
}

export function MarkDropoutModal({
  open,
  onOpenChange,
  preSelectedStudent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedStudent?: { id: string; name: string; surname: string; studentId?: string; class: { name: string }; grade: { level: number } };
}) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(preSelectedStudent ?? null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isPreSelected = !!preSelectedStudent;

  const handleSearch = useCallback(async (value = searchTerm) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      setStudents([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/students/search?q=${encodeURIComponent(trimmedValue)}`);
      const data = await res.json();
      setStudents(data);
    } catch {
      toast.error("Failed to search students");
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  const handleMarkDropout = () => {
    if (!selectedStudent) return;
    startTransition(async () => {
      const res = await markStudentAsDropout(selectedStudent.id, reason);
      if (res.success) {
        toast.success(`${selectedStudent.name} marked as dropout`);
        onOpenChange(false);
        setSearchTerm("");
        setStudents([]);
        setSelectedStudent(null);
        setReason("");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to process dropout");
      }
    });
  };

  // Clear state when modal closes
  useEffect(() => {
    if (open) return;
    const timeout = window.setTimeout(() => {
      setSearchTerm("");
      setStudents([]);
      // Only reset selected student if it wasn't pre-selected
      if (!preSelectedStudent) setSelectedStudent(null);
      setReason("");
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [open, preSelectedStudent]);

  // Auto-search as user types (debounced 250ms) — only when not pre-selected
  useEffect(() => {
    if (!open || selectedStudent || isPreSelected) return;
    const timeout = window.setTimeout(() => {
      void handleSearch(searchTerm);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [handleSearch, open, searchTerm, selectedStudent, isPreSelected]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserMinus className="w-5 h-5 text-destructive" />
            Mark Student as Dropout
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search step — only shown when no pre-selected student */}
          {!isPreSelected && !selectedStudent && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Type a name or student ID to search..."
                  className="pl-9 pr-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
                {loading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>

              <div className="max-h-[200px] overflow-y-auto border rounded-md divide-y">
                {students.length > 0 ? (
                  students.map((student) => (
                    <button
                      key={student.id}
                      className="w-full text-left p-3 hover:bg-muted transition-colors flex justify-between items-center"
                      onClick={() => setSelectedStudent(student)}
                    >
                      <div>
                        <p className="font-medium">{student.name} {student.surname}</p>
                        <p className="text-sm text-muted-foreground">{student.studentId}</p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{student.class.name}</p>
                        <p>Grade {student.grade.level}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    {loading ? "Searching..." : searchTerm.trim() ? "No students found." : "Type a name or ID to begin."}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Search-selected student chip (only in generic flow, not pre-selected) */}
          {!isPreSelected && selectedStudent && (
            <div className="p-3 bg-muted rounded-md flex justify-between items-center">
              <div>
                <p className="font-bold">{selectedStudent.name} {selectedStudent.surname}</p>
                <p className="text-sm text-muted-foreground">{selectedStudent.studentId}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedStudent(null)}>
                Change
              </Button>
            </div>
          )}

          {/* Student info banner shown when pre-selected */}
          {isPreSelected && selectedStudent && (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/40">
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{selectedStudent.name} {selectedStudent.surname}</p>
                <p className="text-xs text-muted-foreground">{selectedStudent.studentId} &middot; {selectedStudent.class.name} &middot; Grade {selectedStudent.grade.level}</p>
              </div>
              <Badge variant="destructive" className="shrink-0 text-xs">Dropout</Badge>
            </div>
          )}

          {/* Reason field — shown once a student is selected (either way) */}
          {selectedStudent && (
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Withdrawal <span className="text-muted-foreground font-normal">(Optional)</span></Label>
              <Textarea
                id="reason"
                placeholder="e.g., Relocation, Financial issues, Transfer..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                autoFocus={isPreSelected}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!selectedStudent || isPending}
            onClick={handleMarkDropout}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "Confirm Dropout"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
