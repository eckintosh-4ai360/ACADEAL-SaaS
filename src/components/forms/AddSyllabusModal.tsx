"use client";

import { ChangeEvent, useActionState, useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  CourseSyllabusSchema,
  courseSyllabusSchema,
} from "@/lib/formValidationSchemas";
import { createCourseSyllabus } from "@/lib/lessonResourceActions";
import { uploadLessonMaterial } from "@/lib/lessonResourceUpload";

type Option = {
  id: number;
  name: string;
};

interface AddSyllabusModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  subjects: Option[];
  grades: { id: number; label: string }[];
}

const initialState = {
  success: false,
  error: false,
  message: "",
};

export function AddSyllabusModal({
  open,
  setOpen,
  subjects,
  grades,
}: AddSyllabusModalProps) {
  const [state, formAction] = useActionState(createCourseSyllabus, initialState);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, startSavingTransition] = useTransition();

  const form = useForm<CourseSyllabusSchema>({
    resolver: zodResolver(courseSyllabusSchema),
    defaultValues: {
      title: "",
      description: "",
      subjectId: subjects[0]?.id ?? 0,
      gradeId: grades[0]?.id ?? 0,
      topicsText: "",
      fileName: "",
      filePath: "",
      fileSizeBytes: 0,
      mimeType: "application/pdf",
    },
  });

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      setOpen(false);
      setSelectedFile(null);
      form.reset({
        title: "",
        description: "",
        subjectId: subjects[0]?.id ?? 0,
        gradeId: grades[0]?.id ?? 0,
        topicsText: "",
        fileName: "",
        filePath: "",
        fileSizeBytes: 0,
        mimeType: "application/pdf",
      });
    } else if (state.error) {
      toast.error(state.message);
    }
  }, [form, grades, setOpen, state, subjects]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);

    if (!file) {
      form.setValue("fileName", "", { shouldValidate: true });
      form.setValue("filePath", "", { shouldValidate: true });
      form.setValue("fileSizeBytes", 0, { shouldValidate: true });
      form.setValue("mimeType", "application/pdf", { shouldValidate: true });
      form.setError("fileName", { type: "manual", message: "PDF file is required!" });
      return;
    }

    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setSelectedFile(null);
      form.setValue("fileName", "", { shouldValidate: true });
      form.setValue("filePath", "", { shouldValidate: true });
      form.setValue("fileSizeBytes", 0, { shouldValidate: true });
      form.setError("fileName", { type: "manual", message: "Only PDF files are allowed." });
      return;
    }

    form.clearErrors("fileName");
    form.setValue("fileName", file.name, { shouldValidate: true });
    form.setValue("filePath", file.name, { shouldValidate: true });
    form.setValue("fileSizeBytes", file.size, { shouldValidate: true });
    form.setValue("mimeType", file.type || "application/pdf", { shouldValidate: true });
  };

  const onSubmit = async (data: CourseSyllabusSchema) => {
    if (!selectedFile) {
      form.setError("fileName", { type: "manual", message: "PDF file is required!" });
      return;
    }

    setIsUploading(true);

    try {
      const uploadResult = await uploadLessonMaterial(selectedFile, "syllabi");

      startSavingTransition(() => {
        formAction({
          ...data,
          fileName: uploadResult.fileName,
          filePath: uploadResult.filePath,
          fileSizeBytes: uploadResult.fileSizeBytes,
          mimeType: uploadResult.mimeType,
        });
      });
    } catch (error) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to upload syllabus PDF.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Create syllabus</DialogTitle>
          <DialogDescription>
            Upload a course syllabus PDF for students to download.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <input type="hidden" {...form.register("fileName")} />
            <input type="hidden" {...form.register("filePath")} />
            <input type="hidden" {...form.register("fileSizeBytes", { valueAsNumber: true })} />
            <input type="hidden" {...form.register("mimeType")} />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Mathematics Term 1 Syllabus" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="subjectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value ? String(field.value) : ""}
                        onChange={(event) => field.onChange(Number(event.target.value))}
                      >
                        {subjects.map((subject) => (
                          <option key={subject.id} value={subject.id}>
                            {subject.name}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gradeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value ? String(field.value) : ""}
                        onChange={(event) => field.onChange(Number(event.target.value))}
                      >
                        {grades.map((grade) => (
                          <option key={grade.id} value={grade.id}>
                            {grade.label}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Summarize the curriculum coverage and expectations."
                      className="min-h-[110px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="topicsText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key topics</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Comma-separated topics, e.g. Algebra, Geometry, Statistics"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label htmlFor="syllabusFile">Upload PDF material</Label>
              <Input
                id="syllabusFile"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
              />
              <p className="text-xs text-muted-foreground">
                PDF only, up to 15 MB.
              </p>
              {selectedFile && (
                <p className="text-xs text-muted-foreground">
                  Selected: {selectedFile.name}
                </p>
              )}
              {form.formState.errors.fileName?.message && (
                <p className="text-sm font-medium text-red-500">
                  {form.formState.errors.fileName.message}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || isUploading || isSaving}
              >
                {(form.formState.isSubmitting || isUploading || isSaving) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create syllabus
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
