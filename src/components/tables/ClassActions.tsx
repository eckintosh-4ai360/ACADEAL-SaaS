"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteClass } from "@/lib/actions";
import { Trash2 } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

interface ClassActionsProps {
  classData: {
    id: number;
    name: string;
  };
}

export function ClassActions({ classData }: ClassActionsProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("id", classData.id.toString());
      await deleteClass({ success: false, error: false }, formData);
      setDeleteOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <Button 
        variant="destructive" 
        size="sm" 
        onClick={() => setDeleteOpen(true)}
        className="flex items-center gap-1"
      >
        <Trash2 className="w-3 h-3" />
        Delete
      </Button>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title="Delete Class"
        description={`Are you sure you want to delete ${classData.name}? This action cannot be undone and will affect all students in this class.`}
        isDeleting={isPending}
      />
    </>
  );
}

