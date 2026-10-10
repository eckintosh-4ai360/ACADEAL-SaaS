"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { EditQuestionModal } from "./EditQuestionModal";
import { DeleteQuestionButton } from "./DeleteQuestionButton";

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

interface QuestionActionsProps {
  assignmentId: number;
  question: QuestionToEdit;
}

export function QuestionActions({ assignmentId, question }: QuestionActionsProps) {
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

      <DeleteQuestionButton questionId={question.id} assignmentId={assignmentId} />

      <EditQuestionModal
        open={editOpen}
        onOpenChange={setEditOpen}
        assignmentId={assignmentId}
        question={question}
      />
    </div>
  );
}
