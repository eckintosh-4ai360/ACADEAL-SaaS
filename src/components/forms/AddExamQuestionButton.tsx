"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Upload } from "lucide-react";
import { AddExamQuestionModal } from "./AddExamQuestionModal";

interface AddExamQuestionButtonProps {
  examId: number;
}

export function AddExamQuestionButton({ examId }: AddExamQuestionButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white"
      >
        <Plus className="h-4 w-4" />
        Add Question
      </Button>

      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="flex items-center gap-2 border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-950/40"
      >
        <Upload className="h-4 w-4" />
        Upload Objectives File
      </Button>

      <AddExamQuestionModal
        open={open}
        onOpenChange={setOpen}
        examId={examId}
      />
    </div>
  );
}
