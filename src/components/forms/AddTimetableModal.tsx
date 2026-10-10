"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { timetableSchema, TimetableSchema } from "@/lib/formValidationSchemas";
import { createTimetable } from "@/lib/timetableActions";
import { useEffect, useState, useActionState, useTransition } from "react";
import { toast } from "react-toastify";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { TIMETABLE_TARGET_GROUP_LABELS, TimetableTargetGroup } from "@/lib/utils";

interface AddTimetableModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function AddTimetableModal({ open, setOpen }: AddTimetableModalProps) {
  const [state, formAction] = useActionState(createTimetable, {
    success: false,
    error: false,
    message: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, startSavingTransition] = useTransition();

  const form = useForm<TimetableSchema>({
    resolver: zodResolver(timetableSchema),
    defaultValues: {
      title: "",
      semester: "First Semester",
      academicYear: "2024-2025",
      targetGroup: "PRE_SCHOOL",
      fileUrl: "",
      fileType: "PDF",
    },
  });

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      setOpen(false);
      form.reset();
      setSelectedFile(null);
    } else if (state.error) {
      toast.error(state.message);
    }
  }, [state, setOpen, form]);

  const resolveFileType = (file: File): "PDF" | "IMAGE" => {
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      return "PDF";
    }
    return "IMAGE";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);

    if (!file) {
      form.setValue("fileUrl", "", { shouldValidate: true });
      form.clearErrors("fileUrl");
      return;
    }

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage = file.type.startsWith("image/");

    if (!isPdf && !isImage) {
      setSelectedFile(null);
      form.setValue("fileUrl", "", { shouldValidate: true });
      form.setError("fileUrl", { type: "manual", message: "Only PDF or image files are allowed." });
      return;
    }

    form.clearErrors("fileUrl");
    form.setValue("fileUrl", file.name, { shouldValidate: true });
    form.setValue("fileType", resolveFileType(file), { shouldValidate: true });
  };

  const onSubmit = async (data: TimetableSchema) => {
    if (!selectedFile) {
      startSavingTransition(() => {
        formAction({
          ...data,
          fileUrl: "",
          fileType: "PDF",
        });
      });
      return;
    }

    setIsUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", selectedFile);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to upload timetable file.");
        return;
      }

      const uploadResult = await uploadResponse.json();
      if (!uploadResult.success || !uploadResult.path) {
        toast.error(uploadResult.error || "Failed to upload timetable file.");
        return;
      }

      const uploadedPath = String(uploadResult.path);
      const normalizedPath =
        uploadedPath.startsWith("http://") ||
        uploadedPath.startsWith("https://") ||
        uploadedPath.startsWith("/")
          ? uploadedPath
          : `/${uploadedPath}`;

      startSavingTransition(() => {
        formAction({
          ...data,
          fileUrl: normalizedPath,
          fileType: resolveFileType(selectedFile),
        });
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Post New Timetable</DialogTitle>
          <DialogDescription>
            Fill in the details to upload a new semester timetable.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <input type="hidden" {...form.register("fileUrl")} />
            <input type="hidden" {...form.register("fileType")} />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timetable Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Lower Primary" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="semester"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Semester</FormLabel>
                    <FormControl>
                      <Select {...field}>
                        <option value="First Semester">First Semester</option>
                        <option value="Second Semester">Second Semester</option>
                        <option value="Third Semester">Third Semester (Summer)</option>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="academicYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Academic Year</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 2024-2025" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="targetGroup"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Student Group</FormLabel>
                  <FormControl>
                    <Select {...field}>
                      {(Object.entries(TIMETABLE_TARGET_GROUP_LABELS) as [TimetableTargetGroup, string][]).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        )
                      )}
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label htmlFor="timetableFile">Timetable File (PDF or Image - Optional)</Label>
              <Input
                id="timetableFile"
                type="file"
                accept=".pdf,image/*"
                onChange={handleFileChange}
              />
              <div className="text-[10px] text-muted-foreground">
                Optional: Choose a PDF or image file from your device if you want to attach a document.
              </div>
              {selectedFile && (
                <div className="text-[11px] text-muted-foreground">
                  Selected: {selectedFile.name}
                </div>
              )}
              {form.formState.errors.fileUrl?.message && (
                <p className="text-sm font-medium text-red-500">
                  {form.formState.errors.fileUrl?.message}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-6">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting || isUploading || isSaving}>
                {(form.formState.isSubmitting || isUploading || isSaving) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Post Timetable
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
