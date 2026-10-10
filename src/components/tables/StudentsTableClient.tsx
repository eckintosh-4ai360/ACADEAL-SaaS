"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StudentTableRow } from "@/components/tables/StudentTableRow";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { bulkDeleteStudents } from "@/lib/actions";
import { Trash2, X } from "lucide-react";
import { toast } from "react-toastify";

interface StudentItem {
  id: string;
  username: string;
  studentId?: string;
  name: string;
  surname: string;
  otherNames?: string | null;
  email: string | null;
  phone: string | null;
  address?: string | null;
  bloodType?: string | null;
  sex: string;
  birthday: Date;
  img?: string | null;
  residencyStatus?: string | null;
  house?: string | null;
  guardianName?: string | null;
  contactNumber?: string | null;
  occupation?: string | null;
  nhisNumber?: string | null;
  admissionDate?: Date | null;
  emergencyContact?: string | null;
  class: { id: number; name: string };
  grade: { id: number; level: number };
  parent: { id: string; name?: string; surname?: string; phone?: string; email?: string | null } | null;
}

interface StudentsTableClientProps {
  students: StudentItem[];
  grades: { id: number; level: number }[];
  classes: { id: number; name: string; gradeId: number }[];
  parents: { id: string; name: string; surname: string; parentUserId?: string | null }[];
  userRole: string;
  canManage: boolean;
}

export function StudentsTableClient({
  students,
  grades,
  classes,
  parents,
  userRole,
  canManage,
}: StudentsTableClientProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Clear selection when students prop changes (e.g. search filter or page change)
  useEffect(() => {
    setSelectedIds([]);
  }, [students]);

  const allOnPageSelected =
    students.length > 0 && students.every((s) => selectedIds.includes(s.id));

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleAll = () => {
    if (allOnPageSelected) {
      // Deselect all on current page
      setSelectedIds((prev) => prev.filter((id) => !students.some((s) => s.id === id)));
    } else {
      // Select all on current page
      const currentIds = students.map((s) => s.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentIds])));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0 || isDeleting) return;

    setIsDeleting(true);
    try {
      const result = await bulkDeleteStudents(selectedIds);
      if (result.success) {
        toast.success(result.message);
        setSelectedIds([]);
        setBulkDeleteOpen(false);
        router.refresh();
      } else {
        toast.error(result.message || "Failed to delete selected students");
      }
    } catch (err) {
      console.error("Bulk delete error:", err);
      toast.error("An error occurred while deleting students");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {canManage && selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-lg px-4 py-3 mb-4 transition-all animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
              {selectedIds.length}
            </span>
            <span className="text-sm font-medium text-foreground">
              {selectedIds.length === 1 ? "1 student selected" : `${selectedIds.length} students selected`}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
              className="text-xs h-7 text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear selection
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteOpen(true)}
              disabled={isDeleting}
              className="flex items-center gap-1.5 shadow-sm"
              id="student-bulk-delete-btn"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected ({selectedIds.length})
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              {canManage && (
                <th className="p-4 w-12 text-center">
                  <Checkbox
                    checked={allOnPageSelected}
                    onCheckedChange={handleToggleAll}
                    aria-label="Select all students on this page"
                  />
                </th>
              )}
              <th className="text-left p-4 font-medium">Student</th>
              <th className="text-left p-4 font-medium">ID</th>
              <th className="text-left p-4 font-medium">Class</th>
              <th className="text-left p-4 font-medium">Grade</th>
              <th className="text-left p-4 font-medium">Parent</th>
              <th className="text-left p-4 font-medium">Contact</th>
              <th className="text-left p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td
                  colSpan={canManage ? 8 : 7}
                  className="p-8 text-center text-muted-foreground"
                >
                  No students found.
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <StudentTableRow
                  key={student.id}
                  student={student}
                  grades={grades}
                  classes={classes}
                  parents={parents}
                  userRole={userRole}
                  isSelected={selectedIds.includes(student.id)}
                  onToggleSelect={handleToggleSelect}
                  showCheckbox={canManage}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <DeleteConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onConfirm={handleBulkDelete}
        title={`Delete ${selectedIds.length} Student${selectedIds.length > 1 ? "s" : ""}`}
        description={`Are you sure you want to permanently delete the ${selectedIds.length} selected student${selectedIds.length > 1 ? "s" : ""}? All associated records, fees, results, and attendances will be removed. This action cannot be undone.`}
        isDeleting={isDeleting}
      />
    </>
  );
}
