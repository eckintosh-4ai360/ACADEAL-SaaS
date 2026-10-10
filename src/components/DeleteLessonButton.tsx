"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteLesson } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

interface DeleteLessonButtonProps {
  lessonId: number;
  lessonName: string;
}

export const DeleteLessonButton = ({ lessonId, lessonName }: DeleteLessonButtonProps) => {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const onDelete = async () => {
    setIsDeleting(true);
    try {
      const formData = new FormData();
      formData.append("id", lessonId.toString());
      const result = await deleteLesson({ success: false, error: false }, formData);
      
      if (result.success) {
        toast.success("Lesson deleted successfully!");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.message || "Something went wrong!");
      }
    } catch (error) {
      toast.error("Something went wrong!");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>

      <DeleteConfirmDialog
        open={open}
        onOpenChange={setOpen}
        onConfirm={onDelete}
        isDeleting={isDeleting}
        title="Delete Lesson"
        description={`Are you sure you want to delete "${lessonName}"? This will also remove linked attendance, exams, assignments, and their related records. This action cannot be undone.`}
      />
    </>
  );
};
