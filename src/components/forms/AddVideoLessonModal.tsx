"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { z } from "zod";

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
import { VideoLessonSchema, videoLessonSchema } from "@/lib/formValidationSchemas";
import { createVideoLesson } from "@/lib/videoLessonActions";

interface AddVideoLessonModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  subjects: { id: number; name: string }[];
  grades: { id: number; label: string }[];
  defaultSubjectId?: number | null;
  defaultGradeId?: number | null;
}

const initialState = {
  success: false,
  error: false,
  message: "",
};

type VideoLessonFormValues = z.input<typeof videoLessonSchema>;

export function AddVideoLessonModal({
  open,
  setOpen,
  subjects,
  grades,
  defaultSubjectId,
  defaultGradeId,
}: AddVideoLessonModalProps) {
  const [state, formAction] = useActionState(createVideoLesson, initialState);
  const [isSaving, startSavingTransition] = useTransition();
  const hasSubjects = subjects.length > 0;
  const hasGrades = grades.length > 0;

  const form = useForm<VideoLessonFormValues, unknown, VideoLessonSchema>({
    resolver: zodResolver(videoLessonSchema),
    defaultValues: {
      title: "",
      description: "",
      youtubeUrl: "",
      subjectId: defaultSubjectId ?? subjects[0]?.id ?? 0,
      gradeId: defaultGradeId ?? grades[0]?.id ?? 0,
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset({
      title: "",
      description: "",
      youtubeUrl: "",
      subjectId: defaultSubjectId ?? subjects[0]?.id ?? 0,
      gradeId: defaultGradeId ?? grades[0]?.id ?? 0,
    });
  }, [defaultGradeId, defaultSubjectId, form, grades, open, subjects]);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      setOpen(false);
      form.reset({
        title: "",
        description: "",
        youtubeUrl: "",
        subjectId: defaultSubjectId ?? subjects[0]?.id ?? 0,
        gradeId: defaultGradeId ?? grades[0]?.id ?? 0,
      });
    } else if (state.error) {
      toast.error(state.message);
    }
  }, [defaultGradeId, defaultSubjectId, form, grades, setOpen, state, subjects]);

  const onSubmit = (data: VideoLessonSchema) => {
    startSavingTransition(() => {
      formAction(data);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>Create video lesson</DialogTitle>
          <DialogDescription>
            Add a YouTube link and publish it as an in-app lesson card for learners.
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
                        disabled={!hasSubjects || subjects.length === 1}
                      >
                        {!hasSubjects ? (
                          <option value="">No subjects available</option>
                        ) : (
                          subjects.map((subject) => (
                            <option key={subject.id} value={subject.id}>
                              {subject.name}
                            </option>
                          ))
                        )}
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
                        disabled={!hasGrades || grades.length === 1}
                      >
                        {!hasGrades ? (
                          <option value="">No grades available</option>
                        ) : (
                          grades.map((grade) => (
                            <option key={grade.id} value={grade.id}>
                              {grade.label}
                            </option>
                          ))
                        )}
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
                    <Input
                      placeholder="https://www.youtube.com/watch?v=..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">
                Supported links include `youtube.com/watch?v=...`, `youtu.be/...`, and
                `youtube.com/shorts/...`.
              </p>
              {(!hasSubjects || !hasGrades) && (
                <p className="mt-2 text-xs text-red-500">
                  {!hasSubjects && !hasGrades
                    ? "No subjects or grades are available yet."
                    : !hasSubjects
                      ? "No subjects are available yet."
                      : "No grades are available yet."}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || isSaving || !hasSubjects || !hasGrades}
              >
                {(form.formState.isSubmitting || isSaving) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create video lesson
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
