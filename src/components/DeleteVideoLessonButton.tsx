"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { deleteVideoLesson } from "@/lib/videoLessonActions";

interface DeleteVideoLessonButtonProps {
  lessonId: number;
  lessonTitle: string;
}

export function DeleteVideoLessonButton({
  lessonId,
  lessonTitle,
}: DeleteVideoLessonButtonProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const onDelete = async () => {
    setIsDeleting(true);

    try {
      const result = await deleteVideoLesson(lessonId);

      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.message || "Failed to delete video lesson.");
      }
    } catch {
      toast.error("Failed to delete video lesson.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-red-500 hover:text-red-600"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <DeleteConfirmDialog
        open={open}
        onOpenChange={setOpen}
        onConfirm={onDelete}
        isDeleting={isDeleting}
        title="Delete video lesson"
        description={`Are you sure you want to delete "${lessonTitle}"? This action cannot be undone.`}
      />
    </>
  );
}
