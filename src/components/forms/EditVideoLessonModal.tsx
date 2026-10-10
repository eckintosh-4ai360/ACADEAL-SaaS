"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
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
  UpdateVideoLessonSchema,
  updateVideoLessonSchema,
} from "@/lib/formValidationSchemas";
import { updateVideoLesson } from "@/lib/videoLessonActions";

interface EditVideoLessonModalProps {
  lesson: {
    id: number;
    title: string;
    description: string;
    youtubeUrl: string;
    subjectId: number;
    gradeId: number;
  };
  subjects: { id: number; name: string }[];
  grades: { id: number; label: string }[];
}

export function EditVideoLessonModal({
  lesson,
  subjects,
  grades,
}: EditVideoLessonModalProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, startSavingTransition] = useTransition();
  const router = useRouter();

  const form = useForm<UpdateVideoLessonSchema>({
    resolver: zodResolver(updateVideoLessonSchema),
    defaultValues: {
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      youtubeUrl: lesson.youtubeUrl,
      subjectId: lesson.subjectId,
      gradeId: lesson.gradeId,
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset({
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      youtubeUrl: lesson.youtubeUrl,
      subjectId: lesson.subjectId,
      gradeId: lesson.gradeId,
    });
  }, [form, lesson, open]);

  const onSubmit = (data: UpdateVideoLessonSchema) => {
    startSavingTransition(async () => {
      const result = await updateVideoLesson(data);

      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.message || "Failed to update video lesson.");
      }
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <Edit className="h-4 w-4 text-muted-foreground" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>Edit video lesson</DialogTitle>
            <DialogDescription>
              Update the lesson details and YouTube link without leaving the page.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Fractions Made Easy" {...field} />
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
                          value={String(field.value ?? "")}
                          onChange={(event) => field.onChange(Number(event.target.value))}
                          disabled={subjects.length <= 1}
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
                          value={String(field.value ?? "")}
                          onChange={(event) => field.onChange(Number(event.target.value))}
                          disabled={grades.length <= 1}
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
                        placeholder="Describe the lesson objective and what students should learn."
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
                name="youtubeUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>YouTube URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://www.youtube.com/watch?v=..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting || isSaving}>
                  {(form.formState.isSubmitting || isSaving) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save changes
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
