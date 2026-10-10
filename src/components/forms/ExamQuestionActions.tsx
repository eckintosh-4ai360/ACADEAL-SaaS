"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { EditExamQuestionModal } from "./EditExamQuestionModal";
import { DeleteExamQuestionButton } from "./DeleteExamQuestionButton";

interface QuestionToEdit {
  id: number;
  questionType: "THEORY" | "MULTIPLE_CHOICE";
  questionText: string;
  points: number;
  options: {
    id?: number;
    optionText: string;
    isCorrect: boolean;
  }[];
}

interface ExamQuestionActionsProps {
  examId: number;
  question: QuestionToEdit;
}

export function ExamQuestionActions({ examId, question }: ExamQuestionActionsProps) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setEditOpen(true)}
        className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/40"
        title="Edit Question"
      >
        <Edit className="h-4 w-4" />
      </Button>

      <DeleteExamQuestionButton questionId={question.id} examId={examId} />

      <EditExamQuestionModal
        open={editOpen}
        onOpenChange={setEditOpen}
        examId={examId}
        question={question}
      />
    </div>
  );
}
