"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Undo2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { revertDropoutStudent } from "@/lib/actions/dropout";
import { toast } from "react-toastify";

export function RevertDropoutButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleRevert = () => {
    startTransition(async () => {
      const res = await revertDropoutStudent(id);
      if (res.success) {
        toast.success("Student successfully reverted to active");
        setOpen(false);
      } else {
        toast.error(res.error || "Failed to revert student");
      }
    });
  };

  return (
    <>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => setOpen(true)}
        className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30"
        title="Revert to continuous student"
      >
        <Undo2 className="w-4 h-4" />
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revert Dropout Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to revert {name} back to an active student? This will restore them to their original class. Their password will be reset to the default "password123".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleRevert} disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isPending ? "Reverting..." : "Yes, Revert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
