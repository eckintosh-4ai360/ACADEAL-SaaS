"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { lessonSchema, LessonSchema } from "@/lib/formValidationSchemas";
import { updateLesson } from "@/lib/actions";
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

interface EditLessonModalProps {
  data: {
    id: number;
    name: string;
    day: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY";
    startTime: Date;
    endTime: Date;
    subjectId: number;
    classId: number;
    teacherId: string;
  };
  subjects: { id: number; name: string }[];
  classes: { id: number; name: string }[];
  teachers: { id: string; name: string; surname: string }[];
  /** When provided (teacher is logged in), the Teacher field is hidden and this ID is used automatically. */
  currentTeacherId?: string | null;
}

export const EditLessonModal = ({
  data,
  subjects,
  classes,
  teachers,
  currentTeacherId,
}: EditLessonModalProps) => {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<LessonSchema>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      id: data.id,
      name: data.name,
      day: data.day,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      subjectId: data.subjectId,
      classId: data.classId,
      teacherId: data.teacherId,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        id: data.id,
        name: data.name,
        day: data.day,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        subjectId: data.subjectId,
        classId: data.classId,
        // If a teacher is logged in, lock to their own ID; otherwise use the stored value
        teacherId: currentTeacherId ?? data.teacherId,
      });
    }
  }, [open, data, form, currentTeacherId]);

  const onSubmit = async (values: LessonSchema) => {
    try {
      const result = await updateLesson({ success: false, error: false }, values);
      if (result.success) {
        toast.success("Lesson updated successfully!");
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
      variant="ghost" 
      size="icon" 
      onClick={() => setOpen(true)}
      className="h-6 w-6 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
    >
      <Edit className="w-3 h-3" />
    </Button>
    
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Lesson</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lesson Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Math Lesson" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subjectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Select
                      {...field}
                      value={field.value?.toString()}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    >
                      <option value="">Select a subject</option>
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
              name="classId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class</FormLabel>
                  <FormControl>
                    <Select
                      {...field}
                      value={field.value?.toString()}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    >
                      <option value="">Select a class</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Teacher field — hidden when the logged-in user is a teacher */}
            {!currentTeacherId && (
              <FormField
                control={form.control}
                name="teacherId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teacher</FormLabel>
                    <FormControl>
                      <Select {...field} value={field.value}>
                        <option value="">Select a teacher</option>
                        {teachers.map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.name} {teacher.surname}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="day"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Day</FormLabel>
                  <FormControl>
                    <Select {...field} value={field.value}>
                      <option value="">Select a day</option>
                      {["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].map((day) => (
                        <option key={day} value={day}>
                          {day}
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
                        //* Format: YYYY-MM-DDThh:mm
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
