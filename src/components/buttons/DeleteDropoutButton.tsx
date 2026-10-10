"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { deleteDropoutStudent } from "@/lib/actions/dropout";
import { toast } from "react-toastify";

export function DeleteDropoutButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const res = await deleteDropoutStudent(id);
      if (res.success) {
        toast.success("Record deleted successfully");
        setOpen(false);
      } else {
        toast.error(res.error || "Failed to delete record");
      }
    });
  };

  return (
    <>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => setOpen(true)}
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
      <DeleteConfirmDialog
        open={open}
        onOpenChange={setOpen}
        onConfirm={handleDelete}
        title="Delete Dropout Record"
        description={`Are you sure you want to delete the archive for ${name}? This action cannot be undone.`}
        isDeleting={isPending}
      />
    </>
  );
}
