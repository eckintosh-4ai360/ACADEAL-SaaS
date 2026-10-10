"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { examSchema, ExamSchema } from "@/lib/formValidationSchemas";
import { updateExam } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { Edit } from "lucide-react";

interface EditExamModalProps {
  data: {
    id: number;
    title: string;
    startTime: Date;
    endTime: Date;
    lessonId: number;
  };
  lessons: { id: number; name: string }[];
}

export const EditExamModal = ({
  data,
  lessons,
}: EditExamModalProps) => {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<ExamSchema>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      id: data.id,
      title: data.title,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      lessonId: data.lessonId,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        id: data.id,
        title: data.title,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        lessonId: data.lessonId,
      });
    }
  }, [open, data, form]);

  const onSubmit = async (values: ExamSchema) => {
    try {
      const result = await updateExam({ success: false, error: false }, values);
      if (result.success) {
        toast.success("Exam updated successfully!");
        setOpen(false);
        router.refresh();
      } else {
        toast.error("Something went wrong!");
      }
    } catch (error) {
      toast.error("Something went wrong!");
    }
  };

  return (
    <>
    <Button 
      variant="outline" 
      size="sm" 
      onClick={() => setOpen(true)}
      className="flex items-center gap-1"
    >
      <Edit className="w-3 h-3" />
      Edit
    </Button>
    
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Exam</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Midterm Exam" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lessonId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lesson</FormLabel>
                  <FormControl>
                    <Select
                      {...field}
                      value={field.value?.toString()}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    >
                      <option value="">Select a lesson</option>
                      {lessons.map((lesson) => (
                        <option key={lesson.id} value={lesson.id}>
                          {lesson.name}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        onChange={(e) => {
                            const date = new Date(e.target.value);
                            field.onChange(date);
                        }}
                        defaultValue={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                         onChange={(e) => {
                            const date = new Date(e.target.value);
                            field.onChange(date);
                        }}
                         defaultValue={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    </>
  );
};
