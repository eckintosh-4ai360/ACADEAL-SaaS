"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteSubject } from "@/lib/actions";
import { Trash2 } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { EditSubjectModal } from "@/components/forms/EditSubjectModal";

interface SubjectActionsProps {
  subject: {
    id: number;
    name: string;
    teachers: { id: string; name: string; surname: string }[];
  };
  teachers: { id: string; name: string; surname: string }[];
}

export function SubjectActions({ subject, teachers }: SubjectActionsProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("id", subject.id.toString());
      await deleteSubject({ success: false, error: false }, formData);
      setDeleteOpen(false);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-2">
      <EditSubjectModal data={subject} teachers={teachers} />
      
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
        title="Delete Subject"
        description={`Are you sure you want to delete ${subject.name}? This action cannot be undone.`}
        isDeleting={isPending}
      />
    </div>
  );
}
