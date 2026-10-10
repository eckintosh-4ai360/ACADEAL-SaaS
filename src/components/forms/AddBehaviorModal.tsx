"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { createBehavior } from "@/lib/actions";

interface AddBehaviorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: { id: string; name: string; surname: string }[];
}

export function AddBehaviorModal({ open, onOpenChange, students }: AddBehaviorModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>("");
  const [date, setDate] = useState<Date | null>(null);

  useEffect(() => {
    if (!open) {
      setDate(null);
      setErrors({});
      setMessage("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setMessage("");

    const formData = new FormData(e.currentTarget);
    const studentId = formData.get("studentId") as string;

    if (!date) {
      setErrors({ date: "Date is required" });
      return;
    }

    if (!studentId) {
      setErrors({ studentId: "Student is required" });
      return;
    }

    const data = {
      studentId: studentId,
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      type: formData.get("type") as string,
      severity: formData.get("severity") as string,
      date: date,
      reportedBy: formData.get("reportedBy") as string,
      actionTaken: formData.get("actionTaken") as string || null,
    };

    if (!data.title || !data.description || !data.type || !data.severity || !data.reportedBy) {
      setMessage("All required fields must be filled");
      return;
    }

    startTransition(async () => {
      const result = await createBehavior({ success: false, error: false }, data);
      if (result.success) {
        setMessage(result.message || "Behavior record created successfully!");
        setTimeout(() => {
          onOpenChange(false);
          router.refresh();
        }, 1000);
      } else {
        setMessage(result.message || "Failed to create behavior record");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Behavior Record</DialogTitle>
          <DialogDescription>Record a new student behavior incident or achievement</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="studentId">Student *</Label>
              <Select id="studentId" name="studentId" required>
                <option value="">Select a student</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} {student.surname}
                  </option>
                ))}
              </Select>
              {errors.studentId && <p className="text-red-500 text-xs">{errors.studentId}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Incident/Achievement Title *</Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g., Outstanding performance in exam"
                required
              />
              {errors.title && <p className="text-red-500 text-xs">{errors.title}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Detailed description of the incident or achievement..."
                rows={3}
                required
              />
              {errors.description && <p className="text-red-500 text-xs">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select id="type" name="type" required>
                  <option value="">Select type</option>
                  <option value="POSITIVE">Positive</option>
                  <option value="NEGATIVE">Negative</option>
                  <option value="NEUTRAL">Neutral</option>
                </Select>
                {errors.type && <p className="text-red-500 text-xs">{errors.type}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="severity">Severity *</Label>
                <Select id="severity" name="severity" required>
                  <option value="">Select severity</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </Select>
                {errors.severity && <p className="text-red-500 text-xs">{errors.severity}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date of Incident *</Label>
              <DatePicker
                id="date"
                name="date"
                selected={date}
                onChange={(newDate) => setDate(newDate)}
                placeholder="Select date"
                required
                dateFormat="MM/dd/yyyy"
              />
              {errors.date && <p className="text-red-500 text-xs">{errors.date}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reportedBy">Reported By *</Label>
              <Input
                id="reportedBy"
                name="reportedBy"
                placeholder="e.g., John Smith (Teacher)"
                required
              />
              {errors.reportedBy && <p className="text-red-500 text-xs">{errors.reportedBy}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="actionTaken">Action Taken (Optional)</Label>
              <Textarea
                id="actionTaken"
                name="actionTaken"
                placeholder="Description of action taken or follow-up..."
                rows={2}
              />
              {errors.actionTaken && <p className="text-red-500 text-xs">{errors.actionTaken}</p>}
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
              {isPending ? "Creating..." : "Add Record"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
