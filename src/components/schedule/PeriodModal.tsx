"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";
import { createPeriod, updatePeriod } from "@/lib/timetableBuilderActions";
import { useRouter } from "next/navigation";

interface PeriodModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  periodToEdit?: {
    id: number;
    name: string;
    startTime: string;
    endTime: string;
    isBreak: boolean;
    order: number;
  } | null;
}

export function PeriodModal({ open, setOpen, periodToEdit }: PeriodModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(periodToEdit?.name || "");
  const [startTime, setStartTime] = useState(periodToEdit?.startTime || "08:00");
  const [endTime, setEndTime] = useState(periodToEdit?.endTime || "08:40");
  const [isBreak, setIsBreak] = useState(periodToEdit?.isBreak || false);

  // Sync edit values when periodToEdit changes
  const isEditing = Boolean(periodToEdit);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Period name is required");
      return;
    }

    startTransition(async () => {
      let res;
      if (periodToEdit) {
        res = await updatePeriod(periodToEdit.id, {
          name: name.trim(),
          startTime,
          endTime,
          isBreak,
        });
      } else {
        res = await createPeriod({
          name: name.trim(),
          startTime,
          endTime,
          isBreak,
        });
      }

      if (res.success) {
        toast.success(res.message);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Time Slot" : "Add New Time Slot"}</DialogTitle>
          <DialogDescription>
            Configure daily period duration and break slots for the school timetable.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="periodName">Slot / Period Name</Label>
            <Input
              id="periodName"
              placeholder="e.g. Period 1 or Morning Break"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="isBreak"
              checked={isBreak}
              onCheckedChange={(checked) => setIsBreak(Boolean(checked))}
            />
            <Label htmlFor="isBreak" className="text-sm font-medium cursor-pointer">
              This is a Recess / Break slot (e.g. Lunch, Assembly)
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Add Time Slot"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
