"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { UserCog } from "lucide-react";
import { updateClassSubjectTeacherAssignments } from "@/lib/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type TeacherOption = {
  id: string;
  name: string;
  surname: string;
};

type SubjectOption = {
  id: number;
  name: string;
  teachers: TeacherOption[];
};

type AssignmentOption = {
  subjectId: number;
  teacherId: string;
};

type ClassSubjectTeacherAssignmentsModalProps = {
  classId: number;
  className: string;
  subjects: SubjectOption[];
  teachers: TeacherOption[];
  assignments: AssignmentOption[];
};

export function ClassSubjectTeacherAssignmentsModal({
  classId,
  className,
  subjects,
  teachers,
  assignments,
}: ClassSubjectTeacherAssignmentsModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedTeacherBySubject, setSelectedTeacherBySubject] = useState<
    Record<number, string>
  >(() => buildSelectedTeachers(assignments));

  const openModal = () => {
    setSelectedTeacherBySubject(buildSelectedTeachers(assignments));
    setOpen(true);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setSelectedTeacherBySubject(buildSelectedTeachers(assignments));
    }

    setOpen(nextOpen);
  };

  const updateSubjectTeacher = (subjectId: number, teacherId: string) => {
    setSelectedTeacherBySubject((current) => ({
      ...current,
      [subjectId]: teacherId,
    }));
  };

  const getTeacherOptions = (subject: SubjectOption) => {
    const preferredTeachers = subject.teachers.length > 0 ? subject.teachers : teachers;
    const selectedTeacherId = selectedTeacherBySubject[subject.id];
    const selectedTeacher = teachers.find((teacher) => teacher.id === selectedTeacherId);

    if (
      selectedTeacher &&
      !preferredTeachers.some((teacher) => teacher.id === selectedTeacher.id)
    ) {
      return [...preferredTeachers, selectedTeacher];
    }

    return preferredTeachers;
  };

  const handleSubmit = () => {
    const payload = {
      classId,
      assignments: Object.entries(selectedTeacherBySubject)
        .filter(([, teacherId]) => teacherId)
        .map(([subjectId, teacherId]) => ({
          subjectId: Number(subjectId),
          teacherId,
        })),
    };

    startTransition(async () => {
      const result = await updateClassSubjectTeacherAssignments(
        { success: false, error: false },
        payload
      );

      if (result.success) {
        toast.success(result.message || "Class subject teachers updated.");
        setOpen(false);
        router.refresh();
        return;
      }

      toast.error(result.message || "Failed to update class subject teachers.");
    });
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={openModal}>
        <UserCog className="mr-2 h-4 w-4" />
        Manage Teachers
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Subject Teachers</DialogTitle>
            <DialogDescription>{className}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {subjects.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No subjects have been created yet.
              </div>
            ) : (
              subjects.map((subject) => {
                const teacherOptions = getTeacherOptions(subject);

                return (
                  <div
                    key={subject.id}
                    className="grid gap-2 rounded-lg border p-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,320px)] md:items-center"
                  >
                    <div>
                      <Label
                        htmlFor={`class-subject-teacher-${subject.id}`}
                        className="text-sm font-semibold"
                      >
                        {subject.name}
                      </Label>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {teacherOptions.length} teacher
                        {teacherOptions.length === 1 ? "" : "s"} available
                      </p>
                    </div>

                    <Select
                      id={`class-subject-teacher-${subject.id}`}
                      value={selectedTeacherBySubject[subject.id] || ""}
                      onChange={(event) =>
                        updateSubjectTeacher(subject.id, event.target.value)
                      }
                    >
                      <option value="">No teacher assigned</option>
                      {teacherOptions.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name} {teacher.surname}
                        </option>
                      ))}
                    </Select>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || teachers.length === 0}
            >
              {isPending ? "Saving..." : "Save Assignments"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function buildSelectedTeachers(assignments: AssignmentOption[]) {
  const selectedTeachers: Record<number, string> = {};

  for (const assignment of assignments) {
    selectedTeachers[assignment.subjectId] = assignment.teacherId;
  }

  return selectedTeachers;
}
