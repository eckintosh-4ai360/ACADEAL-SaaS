"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { createLesson } from "@/lib/actions";
import { lessonSchema } from "@/lib/formValidationSchemas";

interface AddLessonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: { id: number; name: string }[];
  classes: { id: number; name: string }[];
  teachers: { id: string; name: string; surname: string }[];
  /** When provided (teacher is logged in), the Teacher field is hidden and this ID is used automatically. */
  currentTeacherId?: string | null;
}

export function AddLessonModal({ open, onOpenChange, subjects, classes, teachers, currentTeacherId }: AddLessonModalProps) {
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
      name: formData.get("name") as string,
      day: formData.get("day") as "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY",
      startTime: startTime!,
      endTime: endTime!,
      subjectId: parseInt(formData.get("subjectId") as string),
      classId: parseInt(formData.get("classId") as string),
      // Use hidden field value (teacher mode) or selected dropdown value
      teacherId: formData.get("teacherId") as string,
    };

    //* Validate
    const validation = lessonSchema.safeParse(data);
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
      const result = await createLesson({ success: false, error: false }, validation.data);
      if (result.success) {
        setMessage(result.message || "Lesson created successfully!");
        setTimeout(() => {
          onOpenChange(false);
          router.refresh();
        }, 1000);
      } else {
        setMessage(result.message || "Failed to create lesson");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Lesson</DialogTitle>
          <DialogDescription>Schedule a new lesson</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Lesson Name *</Label>
              <Input id="name" name="name" placeholder="e.g., Algebra Basics" required />
              {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="day">Day *</Label>
              <Select id="day" name="day" required>
                <option value="">Select Day</option>
                <option value="MONDAY">Monday</option>
                <option value="TUESDAY">Tuesday</option>
                <option value="WEDNESDAY">Wednesday</option>
                <option value="THURSDAY">Thursday</option>
                <option value="FRIDAY">Friday</option>
              </Select>
              {errors.day && <p className="text-red-500 text-xs">{errors.day}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <DatePicker
                  id="startTime"
                  name="startTime"
                  selected={startTime}
                  onChange={(date) => setStartTime(date)}
                  placeholder="Select time"
                  required
                  dateFormat="HH:mm"
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={15}
                  timeCaption="Time"
                />
                {errors.startTime && <p className="text-red-500 text-xs">{errors.startTime}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">End Time *</Label>
                <DatePicker
                  id="endTime"
                  name="endTime"
                  selected={endTime}
                  onChange={(date) => setEndTime(date)}
                  placeholder="Select time"
                  required
                  dateFormat="HH:mm"
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={15}
                  timeCaption="Time"
                />
                {errors.endTime && <p className="text-red-500 text-xs">{errors.endTime}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subjectId">Subject *</Label>
              <Select id="subjectId" name="subjectId" required>
                <option value="">Select Subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </Select>
              {errors.subjectId && <p className="text-red-500 text-xs">{errors.subjectId}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="classId">Class *</Label>
              <Select id="classId" name="classId" required>
                <option value="">Select Class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </Select>
              {errors.classId && <p className="text-red-500 text-xs">{errors.classId}</p>}
            </div>

            {/* Teacher field — hidden when the logged-in user is a teacher */}
            {currentTeacherId ? (
              <input type="hidden" name="teacherId" value={currentTeacherId} />
            ) : (
              <div className="space-y-2">
                <Label htmlFor="teacherId">Teacher *</Label>
                <Select id="teacherId" name="teacherId" required>
                  <option value="">Select Teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name} {teacher.surname}
                    </option>
                  ))}
                </Select>
                {errors.teacherId && <p className="text-red-500 text-xs">{errors.teacherId}</p>}
              </div>
            )}
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
              {isPending ? "Creating..." : "Create Lesson"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
