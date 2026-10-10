"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { createExam } from "@/lib/actions";
import { examSchema } from "@/lib/formValidationSchemas";

interface AddExamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessons: { id: number; name: string; subject: { name: string }; class: { name: string } }[];
}

export function AddExamModal({ open, onOpenChange, lessons }: AddExamModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>("");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setMessage("");

    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title") as string,
      startTime: startTime!,
      endTime: endTime!,
      lessonId: parseInt(formData.get("lessonId") as string),
    };

    //* Validate
    const validation = examSchema.safeParse(data);
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
      const result = await createExam({ success: false, error: false }, validation.data);
      if (result.success) {
        setMessage(result.message || "Exam created successfully!");
        setTimeout(() => {
          onOpenChange(false);
          router.refresh();
        }, 1000);
      } else {
        setMessage(result.message || "Failed to create exam");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Exam</DialogTitle>
          <DialogDescription>Schedule a new exam</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Exam Title *</Label>
              <Input id="title" name="title" placeholder="e.g., Mid-term Exam" required />
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
              <Label htmlFor="startTime">Start Date & Time *</Label>
              <DatePicker
                id="startTime"
                name="startTime"
                selected={startTime}
                onChange={(date) => setStartTime(date)}
                placeholder="Select date and time"
                required
                dateFormat="MM/dd/yyyy HH:mm"
                showTimeSelect
                timeIntervals={15}
              />
              {errors.startTime && <p className="text-red-500 text-xs">{errors.startTime}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">End Date & Time *</Label>
              <DatePicker
                id="endTime"
                name="endTime"
                selected={endTime}
                onChange={(date) => setEndTime(date)}
                placeholder="Select date and time"
                required
                dateFormat="MM/dd/yyyy HH:mm"
                showTimeSelect
                timeIntervals={15}
              />
              {errors.endTime && <p className="text-red-500 text-xs">{errors.endTime}</p>}
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
              {isPending ? "Creating..." : "Create Exam"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

