"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Edit2, Loader2 } from "lucide-react";
import { updateDropoutStudent } from "@/lib/actions/dropout";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

interface DropoutStudent {
  id: string;
  name: string;
  surname: string;
  studentId: string;
  dropoutDate: Date;
  dropoutReason: string | null;
}

export function EditDropoutModal({
  open,
  onOpenChange,
  dropout,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dropout: DropoutStudent;
}) {
  const router = useRouter();
  const [reason, setReason] = useState(dropout.dropoutReason || "");
  const [date, setDate] = useState(new Date(dropout.dropoutDate).toISOString().split("T")[0]);
  const [isPending, startTransition] = useTransition();

  const handleUpdate = () => {
    startTransition(async () => {
      const res = await updateDropoutStudent(dropout.id, {
        dropoutDate: new Date(date),
        dropoutReason: reason,
      });
      if (res.success) {
        toast.success("Record updated successfully");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update record");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-primary" />
            Edit Dropout Record
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-muted rounded-md mb-4">
            <p className="font-bold">{dropout.name} {dropout.surname}</p>
            <p className="text-sm text-muted-foreground">{dropout.studentId}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Dropout Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Withdrawal</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Relocation, Financial issues, Transfer..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={isPending}
            onClick={handleUpdate}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
