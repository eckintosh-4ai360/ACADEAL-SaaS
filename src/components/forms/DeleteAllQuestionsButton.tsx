"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, AlertOctagon } from "lucide-react";
import { deleteAllAssignmentQuestions } from "@/lib/actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface DeleteAllQuestionsButtonProps {
  assignmentId: number;
  questionCount: number;
}

export function DeleteAllQuestionsButton({ assignmentId, questionCount }: DeleteAllQuestionsButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (questionCount === 0) return null;

  const handleDeleteAll = () => {
    startTransition(async () => {
      const res = await deleteAllAssignmentQuestions(assignmentId);
      if (res.success) {
        setOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
      >
        <Trash2 className="mr-1.5 h-4 w-4" />
        <span>Delete All ({questionCount})</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertOctagon className="h-5 w-5" />
              <span>Delete All Questions?</span>
            </DialogTitle>
            <DialogDescription className="pt-2 text-gray-700 dark:text-gray-300">
              Are you sure you want to permanently delete all <strong>{questionCount}</strong> questions for this assignment?
              <br />
              This is useful if you accidentally uploaded the wrong file. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAll}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isPending ? "Deleting All..." : `Yes, Delete All ${questionCount} Questions`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
