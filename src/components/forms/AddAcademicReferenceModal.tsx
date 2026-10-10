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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AcademicReferenceMaterialSchema,
  academicReferenceMaterialSchema,
} from "@/lib/formValidationSchemas";
import { createAcademicReferenceMaterial } from "@/lib/lessonResourceActions";
import { uploadLessonMaterial } from "@/lib/lessonResourceUpload";
import { LESSON_RESOURCE_CATEGORIES, LESSON_RESOURCE_TYPES } from "@/lib/utils";

interface AddAcademicReferenceModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const initialState = {
  success: false,
  error: false,
  message: "",
};

export function AddAcademicReferenceModal({
  open,
  setOpen,
}: AddAcademicReferenceModalProps) {
  const [state, formAction] = useActionState(
    createAcademicReferenceMaterial,
    initialState
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, startSavingTransition] = useTransition();

  const form = useForm<AcademicReferenceMaterialSchema>({
    resolver: zodResolver(academicReferenceMaterialSchema),
    defaultValues: {
      category: LESSON_RESOURCE_CATEGORIES[0] || "",
      title: "",
      description: "",
      resourceType: LESSON_RESOURCE_TYPES[0] || "PDF Guide",
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
        category: LESSON_RESOURCE_CATEGORIES[0] || "",
        title: "",
        description: "",
        resourceType: LESSON_RESOURCE_TYPES[0] || "PDF Guide",
        fileName: "",
        filePath: "",
        fileSizeBytes: 0,
        mimeType: "application/pdf",
      });
    } else if (state.error) {
      toast.error(state.message);
    }
  }, [form, setOpen, state]);

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

  const onSubmit = async (data: AcademicReferenceMaterialSchema) => {
    if (!selectedFile) {
      form.setError("fileName", { type: "manual", message: "PDF file is required!" });
      return;
    }

    setIsUploading(true);

    try {
      const uploadResult = await uploadLessonMaterial(selectedFile, "reference");

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
      toast.error(err.message || "Failed to upload academic reference.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Create academic reference</DialogTitle>
          <DialogDescription>
            Upload a reference PDF and group it under the right academic category.
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
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input
                      list="reference-category-options"
                      placeholder="e.g. Citation & Formatting"
                      {...field}
                    />
                  </FormControl>
                  <datalist id="reference-category-options">
                    {LESSON_RESOURCE_CATEGORIES.map((category) => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. APA Style Guide (7th Edition)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what the student will use this material for."
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
              name="resourceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resource type</FormLabel>
                  <FormControl>
                    <Input list="reference-type-options" placeholder="e.g. PDF Guide" {...field} />
                  </FormControl>
                  <datalist id="reference-type-options">
                    {LESSON_RESOURCE_TYPES.map((type) => (
                      <option key={type} value={type} />
                    ))}
                  </datalist>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label htmlFor="referenceFile">Upload PDF material</Label>
              <Input
                id="referenceFile"
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
                Create reference
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
