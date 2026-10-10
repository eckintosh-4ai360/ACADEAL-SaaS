"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Plus, Trash2, Edit } from "lucide-react";
import { updateAssignmentQuestion } from "@/lib/actions";

interface Option {
  id?: number;
  text: string;
  isCorrect: boolean;
}

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

interface EditQuestionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentId: number;
  question: QuestionToEdit;
}

export function EditQuestionModal({ open, onOpenChange, assignmentId, question }: EditQuestionModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>("");
  const [questionType, setQuestionType] = useState<"THEORY" | "MULTIPLE_CHOICE">(question.questionType);
  const [questionText, setQuestionText] = useState(question.questionText);
  const [points, setPoints] = useState(String(question.points || 10));
  const [options, setOptions] = useState<Option[]>([]);

  useEffect(() => {
    setQuestionType(question.questionType);
    setQuestionText(question.questionText);
    setPoints(String(question.points || 10));
    if (question.options && question.options.length > 0) {
      setOptions(
        question.options.map((o) => ({
          id: o.id,
          text: o.optionText,
          isCorrect: o.isCorrect,
        }))
      );
    } else {
      setOptions([
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
      ]);
    }
  }, [question]);

  const addOption = () => {
    setOptions([...options, { text: "", isCorrect: false }]);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOptionField = (index: number, field: "text" | "isCorrect", value: string | boolean) => {
    const newOptions = [...options];
    if (field === "isCorrect" && value === true) {
      newOptions.forEach((opt, i) => {
        opt.isCorrect = i === index;
      });
    } else {
      newOptions[index][field] = value as never;
    }
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");

    if (!questionText.trim()) {
      setMessage("Please enter a question");
      return;
    }

    if (questionType === "MULTIPLE_CHOICE") {
      const filledOptions = options.filter((opt) => opt.text.trim());
      if (filledOptions.length < 2) {
        setMessage("Please provide at least 2 options for multiple choice");
        return;
      }

      const hasCorrect = options.some((opt) => opt.isCorrect && opt.text.trim());
      if (!hasCorrect) {
        setMessage("Please mark one option as correct");
        return;
      }
    }

    const formData = new FormData();
    formData.append("questionId", question.id.toString());
    formData.append("assignmentId", assignmentId.toString());
    formData.append("questionType", questionType);
    formData.append("questionText", questionText);
    formData.append("points", points);

    if (questionType === "MULTIPLE_CHOICE") {
      const validOptions = options.filter((opt) => opt.text.trim());
      formData.append("options", JSON.stringify(validOptions));
    }

    startTransition(async () => {
      const result = await updateAssignmentQuestion({ success: false, error: false }, formData);
      if (result.success) {
        setMessage(result.message || "Question updated successfully!");
        setTimeout(() => {
          onOpenChange(false);
          router.refresh();
        }, 800);
      } else {
        setMessage(result.message || "Failed to update question");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Edit className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <span>Edit Question</span>
          </DialogTitle>
          <DialogDescription>
            Modify question text, points, type, or answer choices.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Question Type */}
          <div className="space-y-2">
            <Label htmlFor="editQuestionType">Question Type *</Label>
            <Select
              id="editQuestionType"
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value as "THEORY" | "MULTIPLE_CHOICE")}
            >
              <option value="THEORY">Theory (Text Answer)</option>
              <option value="MULTIPLE_CHOICE">Multiple Choice (Objective)</option>
            </Select>
          </div>

          {/* Question Text */}
          <div className="space-y-2">
            <Label htmlFor="editQuestionText">Question *</Label>
            <Textarea
              id="editQuestionText"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Enter question text..."
              rows={4}
              required
            />
          </div>

          {/* Points */}
          <div className="space-y-2">
            <Label htmlFor="editPoints">Points *</Label>
            <Input
              id="editPoints"
              type="number"
              min="1"
              max="100"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              required
            />
          </div>

          {/* Multiple Choice Options */}
          {questionType === "MULTIPLE_CHOICE" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Answer Options *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  className="flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add Option
                </Button>
              </div>
              <div className="space-y-3">
                {options.map((option, index) => (
                  <div
                    key={index}
                    className={`rounded-lg border-2 p-3 transition-colors ${
                      option.isCorrect
                        ? "border-green-400 bg-green-50/70 dark:border-green-800 dark:bg-green-950/30"
                        : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-bold dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        {String.fromCharCode(65 + index)}
                      </div>
                      <Input
                        value={option.text}
                        onChange={(e) => updateOptionField(index, "text", e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + index)}`}
                        className="flex-1"
                      />
                      <label className="flex cursor-pointer items-center text-xs font-medium">
                        <input
                          type="radio"
                          name="editCorrectOption"
                          checked={option.isCorrect}
                          onChange={() => updateOptionField(index, "isCorrect", true)}
                          className="mr-1.5 h-4 w-4 text-green-600"
                        />
                        <span className={option.isCorrect ? "text-green-600 dark:text-green-400 font-bold" : "text-gray-600 dark:text-gray-400"}>
                          {option.isCorrect ? "Correct ✓" : "Mark Correct"}
                        </span>
                      </label>
                      {options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {message && (
            <div
              className={`rounded-lg p-3 text-sm font-medium ${
                message.includes("success") || message.includes("Successfully")
                  ? "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300"
                  : "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300"
              }`}
            >
              {message}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="bg-purple-600 hover:bg-purple-700 text-white">
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
