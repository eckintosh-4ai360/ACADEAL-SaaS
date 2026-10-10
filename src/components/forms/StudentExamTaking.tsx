"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { submitStudentExamAnswers } from "@/lib/actions";
import { CheckCircle, FileText, ImageIcon, FileSpreadsheet, Clock, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

type Question = {
  id: number;
  questionType: "THEORY" | "MULTIPLE_CHOICE";
  questionText: string;
  points: number;
  fileUrl: string | null;
  fileType: string | null;
  options: {
    id: number;
    optionText: string;
    isCorrect: boolean;
  }[];
};

type Props = {
  examId: number;
  questions: Question[];
  studentId: string;
  startTime: Date;
  endTime: Date;
  existingAnswers?: {
    questionId: number;
    answerText?: string | null;
    selectedOptionId?: number | null;
    isCorrect?: boolean | null;
    pointsEarned: number;
  }[];
};

export function StudentExamTaking({
  examId,
  questions,
  studentId,
  startTime,
  endTime,
  existingAnswers = []
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [answers, setAnswers] = useState<Record<number, { type: "text" | "option"; value: string | number }>>(
    () => {
      const initial: Record<number, { type: "text" | "option"; value: string | number }> = {};
      existingAnswers.forEach(ans => {
        if (ans.answerText) {
          initial[ans.questionId] = { type: "text", value: ans.answerText };
        } else if (ans.selectedOptionId) {
          initial[ans.questionId] = { type: "option", value: ans.selectedOptionId };
        }
      });
      return initial;
    }
  );
  const [submitted, setSubmitted] = useState(existingAnswers.length > 0);
  const router = useRouter();

  const now = new Date();
  const notYetOpen = !submitted && now < startTime;
  const closed = !submitted && now > endTime;

  const handleOptionSelect = (questionId: number, optionId: number) => {
    if (submitted) return;
    setAnswers(prev => ({
      ...prev,
      [questionId]: { type: "option", value: optionId }
    }));
  };

  const handleTextAnswer = (questionId: number, text: string) => {
    if (submitted) return;
    setAnswers(prev => ({
      ...prev,
      [questionId]: { type: "text", value: text }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    startTransition(async () => {
      const formData = new FormData();
      formData.append("examId", examId.toString());
      formData.append("studentId", studentId);
      formData.append("answers", JSON.stringify(answers));

      const result = await submitStudentExamAnswers(formData);
      if (result.success) {
        setSubmitted(true);
        router.refresh();
      } else {
        setErrorMessage(result.message || "Failed to submit exam.");
      }
    });
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <FileText className="w-5 h-5" />;
    if (fileType.includes("image")) return <ImageIcon className="w-5 h-5" />;
    if (fileType.includes("pdf")) return <FileText className="w-5 h-5" />;
    return <FileSpreadsheet className="w-5 h-5" />;
  };

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
  const earnedPoints = existingAnswers.reduce((sum, ans) => sum + ans.pointsEarned, 0);

  if (notYetOpen) {
    return (
      <div className="rounded-lg border border-border bg-card p-10 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/40">
          <Clock className="w-8 h-8 text-blue-600 dark:text-blue-300" />
        </div>
        <h3 className="mb-2 text-2xl font-bold text-foreground">This exam hasn't opened yet</h3>
        <p className="text-muted-foreground">
          It opens on {format(startTime, "MMM dd, yyyy 'at' HH:mm")}. Come back then to take it.
        </p>
      </div>
    );
  }

  if (closed) {
    return (
      <div className="rounded-lg border border-border bg-card p-10 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40">
          <Lock className="w-8 h-8 text-red-600 dark:text-red-300" />
        </div>
        <h3 className="mb-2 text-2xl font-bold text-foreground">This exam has closed</h3>
        <p className="text-muted-foreground">
          It closed on {format(endTime, "MMM dd, yyyy 'at' HH:mm")} and you did not submit an answer in time.
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="text-center mb-6">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/40">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-300" />
          </div>
          <h3 className="mb-2 text-2xl font-bold text-foreground">Exam Submitted!</h3>
          <p className="mb-4 text-muted-foreground">Your answers have been recorded</p>
          <div className="inline-block rounded-lg border border-blue-200 bg-blue-50 px-6 py-3 dark:border-blue-900/60 dark:bg-blue-950/30">
            <p className="text-sm text-muted-foreground">Your Score</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-300">{earnedPoints} / {totalPoints}</p>
            <p className="text-sm text-muted-foreground">{totalPoints > 0 ? ((earnedPoints / totalPoints) * 100).toFixed(1) : "0.0"}%</p>
          </div>
        </div>

        <div className="space-y-6 mt-8">
          {questions.map((question, index) => {
            const existingAnswer = existingAnswers.find(a => a.questionId === question.id);
            const isCorrect = existingAnswer?.isCorrect;

            return (
              <div key={question.id} className="rounded-lg border border-border bg-card/70 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                        {index + 1}
                      </span>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        question.questionType === "THEORY"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-200"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200"
                      }`}>
                        {question.questionType === "THEORY" ? "Theory" : "Multiple Choice"}
                      </span>
                      <span className="text-sm text-muted-foreground">{question.points} points</span>
                    </div>
                    <p className="text-lg text-foreground">{question.questionText}</p>
                  </div>
                  {isCorrect !== null && isCorrect !== undefined && (
                    <div className={`ml-4 px-3 py-1 rounded-full text-sm font-medium ${
                      isCorrect
                        ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-200"
                        : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-200"
                    }`}>
                      {isCorrect ? `✓ Correct (+${existingAnswer?.pointsEarned})` : "✗ Incorrect"}
                    </div>
                  )}
                </div>

                {question.fileUrl && (
                  <div className="mb-4">
                    <a
                      href={question.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80"
                    >
                      {getFileIcon(question.fileType)}
                      <span>View attachment</span>
                    </a>
                  </div>
                )}

                {question.questionType === "MULTIPLE_CHOICE" && (
                  <div className="space-y-2 mt-4">
                    {question.options.map((option, optIndex) => {
                      const isSelected = existingAnswer?.selectedOptionId === option.id;
                      const showCorrect = submitted && option.isCorrect;

                      return (
                        <div
                          key={option.id}
                          className={`p-3 rounded-lg border-2 flex items-center ${
                            showCorrect
                              ? "border-green-300 bg-green-50 dark:border-green-800/60 dark:bg-green-950/30"
                              : isSelected && !option.isCorrect
                              ? "border-red-300 bg-red-50 dark:border-red-800/60 dark:bg-red-950/30"
                              : isSelected
                              ? "border-blue-300 bg-blue-50 dark:border-blue-800/60 dark:bg-blue-950/30"
                              : "border-border bg-muted/30"
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 flex-shrink-0 ${
                            isSelected ? "border-blue-500 bg-blue-500" : "border-muted-foreground/40 text-foreground"
                          }`}>
                            {isSelected ? (
                              <div className="w-3 h-3 rounded-full bg-white" />
                            ) : (
                              <span className="text-sm font-semibold">
                                {String.fromCharCode(65 + optIndex)}
                              </span>
                            )}
                          </div>
                          <span className="flex-1 text-foreground">{option.optionText}</span>
                          {showCorrect && (
                            <CheckCircle className="ml-2 w-5 h-5 text-green-600 dark:text-green-300" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {question.questionType === "THEORY" && existingAnswer?.answerText && (
                  <div className="mt-4 rounded-lg bg-muted/40 p-4">
                    <p className="mb-2 text-sm font-medium text-foreground">Your Answer:</p>
                    <p className="whitespace-pre-wrap text-foreground">{existingAnswer.answerText}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
        <Clock className="h-4 w-4 flex-shrink-0" />
        <span>This exam closes on {format(endTime, "MMM dd, yyyy 'at' HH:mm")}.</span>
      </div>

      {questions.map((question, index) => (
        <div key={question.id} className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                  {index + 1}
                </span>
                <span className={`text-xs font-medium px-2 py-1 rounded ${
                  question.questionType === "THEORY"
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-200"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200"
                }`}>
                  {question.questionType === "THEORY" ? "Theory" : "Multiple Choice"}
                </span>
                <span className="text-sm text-muted-foreground">{question.points} points</span>
              </div>
              <p className="text-lg text-foreground">{question.questionText}</p>
            </div>
          </div>

          {question.fileUrl && (
            <div className="mb-4">
              <a
                href={question.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80"
              >
                {getFileIcon(question.fileType)}
                <span>View attachment</span>
              </a>
            </div>
          )}

          {question.questionType === "MULTIPLE_CHOICE" && (
            <div className="space-y-2 mt-4">
              {question.options.map((option, optIndex) => {
                const isSelected = answers[question.id]?.value === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleOptionSelect(question.id, option.id)}
                    className={`w-full p-3 rounded-lg border-2 flex items-center transition-colors ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30"
                        : "border-border bg-background hover:border-blue-300 dark:hover:border-blue-700"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 flex-shrink-0 ${
                      isSelected ? "border-blue-500 bg-blue-500" : "border-muted-foreground/40 text-foreground"
                    }`}>
                      {isSelected ? (
                        <div className="w-3 h-3 rounded-full bg-white" />
                      ) : (
                        <span className="text-sm font-semibold">
                          {String.fromCharCode(65 + optIndex)}
                        </span>
                      )}
                    </div>
                    <span className="text-left text-foreground">{option.optionText}</span>
                  </button>
                );
              })}
            </div>
          )}

          {question.questionType === "THEORY" && (
            <div className="mt-4">
              <textarea
                value={(answers[question.id]?.value as string) || ""}
                onChange={(e) => handleTextAnswer(question.id, e.target.value)}
                placeholder="Type your answer here..."
                className="min-h-[150px] w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          )}
        </div>
      ))}

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          {errorMessage}
        </div>
      )}

      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-6">
        <div>
          <p className="text-sm text-muted-foreground">Total Questions</p>
          <p className="text-2xl font-bold text-foreground">{questions.length}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Total Points</p>
          <p className="text-2xl font-bold text-foreground">{totalPoints}</p>
        </div>
        <Button
          type="submit"
          disabled={isPending || Object.keys(answers).length !== questions.length}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
        >
          {isPending ? "Submitting..." : "Submit Exam"}
        </Button>
      </div>
    </form>
  );
}
