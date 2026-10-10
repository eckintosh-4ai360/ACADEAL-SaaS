"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Plus, Trash2, Upload, FileText, Image as ImageIcon, File, Sparkles, CheckCircle2, ListChecks } from "lucide-react";
import { createAssignmentQuestion, parseObjectiveFileAction, createBulkAssignmentQuestions } from "@/lib/actions";
import { ParsedObjectiveQuestion } from "@/lib/objective-parser";

interface AddQuestionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentId: number;
}

interface Option {
  text: string;
  isCorrect: boolean;
}

export function AddQuestionModal({ open, onOpenChange, assignmentId }: AddQuestionModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isExtracting, setIsExtracting] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [questionType, setQuestionType] = useState<"THEORY" | "MULTIPLE_CHOICE">("THEORY");
  const [questionText, setQuestionText] = useState("");
  const [points, setPoints] = useState("10");
  const [options, setOptions] = useState<Option[]>([
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);
  const [file, setFile] = useState<File | null>(null);

  // Objectives file extraction state
  const [extractedQuestions, setExtractedQuestions] = useState<ParsedObjectiveQuestion[]>([]);
  const [objectiveFile, setObjectiveFile] = useState<File | null>(null);

  const addOption = () => {
    setOptions([...options, { text: "", isCorrect: false }]);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, field: "text" | "isCorrect", value: string | boolean) => {
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
    }
  };

  const handleObjectiveFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setObjectiveFile(selectedFile);
      await processObjectiveFile(selectedFile);
    }
  };

  const processObjectiveFile = async (targetFile: File) => {
    setIsExtracting(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("file", targetFile);

      const result = await parseObjectiveFileAction(formData);

      if (result.success && result.questions && result.questions.length > 0) {
        setExtractedQuestions(result.questions);
        setQuestionType("MULTIPLE_CHOICE");

        // If 1 question extracted, populate form fields directly
        const q1 = result.questions[0];
        setQuestionText(q1.questionText);
        setPoints(String(q1.points || 1));
        setOptions(
          q1.options.map((o) => ({
            text: o.text,
            isCorrect: o.isCorrect,
          }))
        );

        setMessage(
          result.questions.length === 1
            ? "Successfully extracted 1 objective question into form fields!"
            : `Successfully extracted ${result.questions.length} objective questions! Preview below or click 'Import All Questions'.`
        );
      } else {
        setMessage(result.message || "Could not extract objective questions from file.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Failed to process objective question file.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleImportAllExtracted = async () => {
    if (!extractedQuestions.length) return;
    startTransition(async () => {
      const result = await createBulkAssignmentQuestions(assignmentId, extractedQuestions);
      if (result.success) {
        setMessage(result.message || "Imported objective questions!");
        resetForm();
        setTimeout(() => {
          onOpenChange(false);
          router.refresh();
        }, 1000);
      } else {
        setMessage(result.message || "Failed to import questions.");
      }
    });
  };

  const resetForm = () => {
    setQuestionText("");
    setPoints("10");
    setQuestionType("THEORY");
    setOptions([
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ]);
    setFile(null);
    setObjectiveFile(null);
    setExtractedQuestions([]);
    setMessage("");
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
    formData.append("assignmentId", assignmentId.toString());
    formData.append("questionType", questionType);
    formData.append("questionText", questionText);
    formData.append("points", points);

    if (file) {
      formData.append("file", file);
    }

    if (questionType === "MULTIPLE_CHOICE") {
      const validOptions = options.filter((opt) => opt.text.trim());
      formData.append("options", JSON.stringify(validOptions));
    }

    startTransition(async () => {
      const result = await createAssignmentQuestion({ success: false, error: false }, formData);
      if (result.success) {
        setMessage(result.message || "Question added successfully!");
        resetForm();
        setTimeout(() => {
          onOpenChange(false);
          router.refresh();
        }, 1000);
      } else {
        setMessage(result.message || "Failed to add question");
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetForm();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span>Add Question to Assignment</span>
          </DialogTitle>
          <DialogDescription>
            Create a question manually or upload an objectives file (PDF, TXT, DOCX, CSV) to extract questions & options automatically.
          </DialogDescription>
        </DialogHeader>

        {/* Objectives File Import Card */}
        <div className="rounded-xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-5 dark:border-purple-900 dark:from-purple-950/30 dark:to-indigo-950/30">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="flex items-center font-bold text-purple-900 dark:text-purple-200">
                <Sparkles className="mr-2 h-5 w-5 text-purple-600 dark:text-purple-400" />
                Upload Objective Questions File
              </h4>
              <p className="mt-1 text-xs text-purple-700 dark:text-purple-300">
                Upload a test paper or file (PDF, TXT, CSV, DOCX). Main questions will be extracted to the question field and options to the options field!
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".pdf,.txt,.csv,.json,.doc,.docx,.png,.jpg,.jpeg"
                onChange={handleObjectiveFileSelect}
                className="hidden"
                disabled={isExtracting || isPending}
              />
              <span className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-purple-700">
                <Upload className="h-4 w-4" />
                {isExtracting ? "Extracting..." : "Choose Objective File"}
              </span>
            </label>
            {objectiveFile && (
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                {objectiveFile.name}
              </span>
            )}
          </div>

          {/* Extracted Bulk Questions Preview */}
          {extractedQuestions.length > 1 && (
            <div className="mt-4 space-y-3 rounded-lg border border-purple-200 bg-white p-4 dark:border-purple-800 dark:bg-purple-950/50">
              <div className="flex items-center justify-between">
                <span className="flex items-center text-sm font-bold text-purple-900 dark:text-purple-200">
                  <ListChecks className="mr-2 h-4 w-4 text-purple-600" />
                  {extractedQuestions.length} Objective Questions Extracted
                </span>
                <Button
                  type="button"
                  onClick={handleImportAllExtracted}
                  disabled={isPending}
                  size="sm"
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  Import All {extractedQuestions.length} Questions
                </Button>
              </div>

              <div className="max-h-48 space-y-2 overflow-y-auto pr-1 text-xs">
                {extractedQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="rounded border border-gray-200 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-900"
                  >
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {idx + 1}. {q.questionText}
                    </p>
                    <div className="mt-1 grid grid-cols-2 gap-1 text-gray-600 dark:text-gray-400">
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={opt.isCorrect ? "font-bold text-green-600 dark:text-green-400" : ""}
                        >
                          {String.fromCharCode(65 + oIdx)}. {opt.text} {opt.isCorrect && "✓"}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Question Type */}
          <div className="space-y-2">
            <Label htmlFor="questionType">Question Type *</Label>
            <Select
              id="questionType"
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value as "THEORY" | "MULTIPLE_CHOICE")}
            >
              <option value="THEORY">Theory (Text Answer)</option>
              <option value="MULTIPLE_CHOICE">Multiple Choice (Objective)</option>
            </Select>
            <p className="text-xs text-gray-500">
              {questionType === "THEORY"
                ? "Students will write a text answer"
                : "Students will select one correct option"}
            </p>
          </div>

          {/* Question Text */}
          <div className="space-y-2">
            <Label htmlFor="questionText">Question *</Label>
            <Textarea
              id="questionText"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Enter your question here..."
              rows={4}
              required
            />
          </div>

          {/* Points */}
          <div className="space-y-2">
            <Label htmlFor="points">Points *</Label>
            <Input
              id="points"
              type="number"
              min="1"
              max="100"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500">Points awarded for correct answer</p>
          </div>

          {/* Optional Attachment */}
          <div className="space-y-2">
            <Label htmlFor="file">Question Attachment (Optional)</Label>
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-4 transition-colors hover:border-purple-400">
              <div className="flex flex-col items-center">
                <Upload className="mb-2 h-8 w-8 text-gray-400" />
                <label
                  htmlFor="file"
                  className="mb-1 cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Click to upload attachment image or document
                </label>
                <p className="text-xs text-gray-500">PDF, Word, or Image files (Max 10MB)</p>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              {file && (
                <div className="mt-3 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-2 text-xs">
                  <span className="font-medium text-blue-900">{file.name}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setFile(null)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              )}
            </div>
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
                  className="flex items-center gap-1 bg-gray-900 text-white hover:bg-gray-800"
                >
                  <Plus className="h-3 w-3" />
                  Add Option
                </Button>
              </div>
              <div className="space-y-3">
                {options.map((option, index) => (
                  <div
                    key={index}
                    className={`rounded-lg border-2 p-4 transition-colors ${
                      option.isCorrect ? "border-green-400 bg-green-50/70 dark:bg-green-950/30" : "border-gray-200 bg-white dark:bg-gray-900"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex flex-1 items-center gap-2">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold dark:bg-gray-800">
                          {String.fromCharCode(65 + index)}
                        </div>
                        <Input
                          value={option.text}
                          onChange={(e) => updateOption(index, "text", e.target.value)}
                          placeholder={`Option ${String.fromCharCode(65 + index)}`}
                          className="flex-1"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex cursor-pointer items-center">
                          <input
                            type="radio"
                            name="correctOption"
                            checked={option.isCorrect}
                            onChange={() => updateOption(index, "isCorrect", true)}
                            className="mr-2 h-4 w-4 text-green-600"
                          />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
                  </div>
                ))}
              </div>
            </div>
          )}

          {message && (
            <div
              className={`rounded-lg p-4 text-sm font-medium ${
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
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="bg-purple-600 hover:bg-purple-700">
              {isPending ? "Adding..." : "Add Question"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
