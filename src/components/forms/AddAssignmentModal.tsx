"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { createAssignment } from "@/lib/actions";
import { assignmentSchema } from "@/lib/formValidationSchemas";

interface AddAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessons: { id: number; name: string; subject: { name: string }; class: { name: string } }[];
}

export function AddAssignmentModal({ open, onOpenChange, lessons }: AddAssignmentModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setMessage("");

    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title") as string,
      startDate: startDate!,
      dueDate: dueDate!,
      lessonId: parseInt(formData.get("lessonId") as string),
    };

    //* Validate
    const validation = assignmentSchema.safeParse(data);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    startTransition(async () => {
      const result = await createAssignment({ success: false, error: false }, validation.data);
      if (result.success) {
        setMessage(result.message || "Assignment created successfully!");
        setTimeout(() => {
          onOpenChange(false);
          router.refresh();
        }, 1000);
      } else {
        setMessage(result.message || "Failed to create assignment");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Assignment</DialogTitle>
          <DialogDescription>Create a new assignment</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Assignment Title *</Label>
              <Input id="title" name="title" placeholder="e.g., Chapter 5 Homework" required />
              {errors.title && <p className="text-red-500 text-xs">{errors.title}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lessonId">Lesson *</Label>
              <Select id="lessonId" name="lessonId" required>
                <option value="">Select Lesson</option>
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.name} - {lesson.subject.name} ({lesson.class.name})
                  </option>
                ))}
              </Select>
              {errors.lessonId && <p className="text-red-500 text-xs">{errors.lessonId}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <DatePicker
                id="startDate"
                name="startDate"
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                placeholder="Select start date"
                required
                dateFormat="MM/dd/yyyy"
              />
              {errors.startDate && <p className="text-red-500 text-xs">{errors.startDate}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date *</Label>
              <DatePicker
                id="dueDate"
                name="dueDate"
                selected={dueDate}
                onChange={(date) => setDueDate(date)}
                placeholder="Select due date"
                required
                dateFormat="MM/dd/yyyy"
              />
              {errors.dueDate && <p className="text-red-500 text-xs">{errors.dueDate}</p>}
            </div>
          </div>

          {message && (
            <div className={`p-3 rounded ${message.includes("success") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {message}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create Assignment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

