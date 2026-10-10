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
import { updateFee } from "@/lib/actions";
import { feeSchema } from "@/lib/formValidationSchemas";

interface EditFeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fee: {
    id: number;
    title: string;
    description: string | null;
    amount: number;
    dueDate: Date;
    status: string;
    studentId: string;
  };
  students: { id: string; name: string; surname: string; class: { name: string } }[];
}

export function EditFeeModal({ open, onOpenChange, fee, students }: EditFeeModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>("");
  const [dueDate, setDueDate] = useState<Date | null>(new Date(fee.dueDate));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setMessage("");

    const formData = new FormData(e.currentTarget);
    const data = {
      id: fee.id,
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      amount: parseFloat(formData.get("amount") as string),
      dueDate: dueDate!,
      status: formData.get("status") as string,
      studentId: formData.get("studentId") as string,
    };

    const validation = feeSchema.safeParse(data);
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
      const result = await updateFee({ success: false, error: false }, validation.data);
      if (result.success) {
        setMessage(result.message || "Fee updated successfully!");
        setTimeout(() => {
          onOpenChange(false);
          router.refresh();
        }, 1000);
      } else {
        setMessage(result.message || "Failed to update fee");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Fee</DialogTitle>
          <DialogDescription>Update fee/bill information</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Fee Title *</Label>
              <Input id="title" name="title" defaultValue={fee.title} required />
              {errors.title && <p className="text-red-500 text-xs">{errors.title}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                name="description" 
                defaultValue={fee.description || ""}
                rows={3}
              />
              {errors.description && <p className="text-red-500 text-xs">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($) *</Label>
                <Input 
                  id="amount" 
                  name="amount" 
                  type="number" 
                  step="0.01"
                  defaultValue={fee.amount}
                  required 
                />
                {errors.amount && <p className="text-red-500 text-xs">{errors.amount}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date *</Label>
                <DatePicker
                  id="dueDate"
                  name="dueDate"
                  selected={dueDate}
                  onChange={(date) => setDueDate(date)}
                  required
                />
                {errors.dueDate && <p className="text-red-500 text-xs">{errors.dueDate}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select id="status" name="status" defaultValue={fee.status} required>
                <option value="PENDING">Pending</option>
                <option value="PAID">Paid</option>
                <option value="OVERDUE">Overdue</option>
              </Select>
              {errors.status && <p className="text-red-500 text-xs">{errors.status}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="studentId">Student *</Label>
              <Select id="studentId" name="studentId" defaultValue={fee.studentId} required>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} {student.surname} ({student.class.name})
                  </option>
                ))}
              </Select>
              {errors.studentId && <p className="text-red-500 text-xs">{errors.studentId}</p>}
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
              {isPending ? "Updating..." : "Update Fee"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

