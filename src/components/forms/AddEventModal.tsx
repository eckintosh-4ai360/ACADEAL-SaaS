"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { createEvent } from "@/lib/actions";
import { eventSchema } from "@/lib/formValidationSchemas";

import { GRADE_NAMES } from "@/lib/utils";

interface AddEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: { id: number; name: string; gradeId: number }[];
  grades: { id: number; level: number }[];
}

export function AddEventModal({ open, onOpenChange, classes, grades }: AddEventModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>("");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [sendSms, setSendSms] = useState(true);
  const [selectedGradeId, setSelectedGradeId] = useState<string>("");

  //* Filter classes by selected grade
  const filteredClasses = classes.filter((c) => {
    if (!selectedGradeId) return true;
    return Number(c.gradeId) === Number(selectedGradeId);
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setMessage("");

    const formData = new FormData(e.currentTarget);
    const classId = formData.get("classId") as string;
    
    const data = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      startTime: startTime!,
      endTime: endTime!,
      classId: classId === "" ? undefined : parseInt(classId),
      sendSms,
    };

    //* Validate
    const validation = eventSchema.safeParse(data);
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
      const result = await createEvent({ success: false, error: false }, validation.data);
      if (result.success) {
        setMessage(result.message || "Event created successfully!");
        setTimeout(() => {
          onOpenChange(false);
          router.refresh();
        }, 1000);
      } else {
        setMessage(result.message || "Failed to create event");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Event</DialogTitle>
          <DialogDescription>Create a new school event</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input id="title" name="title" placeholder="e.g., School Festival" required />
              {errors.title && <p className="text-red-500 text-xs">{errors.title}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea 
                id="description" 
                name="description" 
                placeholder="Event details..." 
                rows={3}
                required 
              />
              {errors.description && <p className="text-red-500 text-xs">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gradeId">Target Grade</Label>
                <Select
                  id="gradeId"
                  name="gradeId"
                  value={selectedGradeId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    setSelectedGradeId(e.target.value);
                    //* Reset classId when grade changes to avoid inconsistency
                    const form = e.target.form;
                    if (form) {
                      const classSelect = form.elements.namedItem("classId") as HTMLSelectElement;
                      if (classSelect) classSelect.value = "";
                    }
                  }}
                >
                  <option value="">All Grades</option>
                  {grades.map((grade) => (
                    <option key={grade.id} value={grade.id}>
                      {GRADE_NAMES[grade.level] || `Grade ${grade.level}`}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="classId">Target Class</Label>
                <Select id="classId" name="classId">
                  <option value="">{selectedGradeId ? "All Classes in Grade" : "All Classes"}</option>
                  {filteredClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <p className="text-[10px] text-gray-500 -mt-2">Filter by grade to narrow down class selection (optional)</p>


            {/* ! SMS Toggle */}
            <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-blue-300 bg-blue-50">
              <input
                type="checkbox"
                id="sendSmsEvent"
                checked={sendSms}
                onChange={(e) => setSendSms(e.target.checked)}
                className="h-4 w-4 accent-blue-600 cursor-pointer"
              />
              <div>
                <label htmlFor="sendSmsEvent" className="text-sm font-medium text-blue-800 cursor-pointer">
                  📱 Send SMS Notification
                </label>
                <p className="text-xs text-blue-600">
                  Broadcast this event via SMS to all relevant parents/contacts
                </p>
              </div>
            </div>
          </div>

          {message && (
            <div className={`p-3 rounded ${message.includes("success") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {message}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
              {isPending ? "Creating..." : "Create Event"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

