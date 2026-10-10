"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { subjectSchema, SubjectSchema } from "@/lib/formValidationSchemas";
import { updateSubject } from "@/lib/actions";
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
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useMemo } from "react";
import { Edit, X, Plus } from "lucide-react";
import { GHANA_CURRICULUM_SUBJECTS, EDUCATION_LEVELS, EducationLevel } from "@/lib/ghanaCurriculumSubjects";

interface EditSubjectModalProps {
  data: {
    id: number;
    name: string;
    teachers: { id: string; name: string; surname: string }[];
  };
  teachers: { id: string; name: string; surname: string }[];
}

export const EditSubjectModal = ({
  data,
  teachers,
}: EditSubjectModalProps) => {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Subject State
  const [selectedLevel, setSelectedLevel] = useState<EducationLevel | "All">("All");
  const [subjectName, setSubjectName] = useState("");
  const [customSubject, setCustomSubject] = useState("");

  // Teacher State
  const initialTeachers = data.teachers ? data.teachers.map((t) => t.id) : [];
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>(initialTeachers);
  const [teacherDropdownValue, setTeacherDropdownValue] = useState("");

  const form = useForm<SubjectSchema>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      id: data.id,
      name: data.name,
      teachers: initialTeachers,
    },
  });

  useEffect(() => {
    if (open) {
      const currentTeachers = data.teachers ? data.teachers.map((t) => t.id) : [];
      setSelectedTeachers(currentTeachers);
      form.reset({
        id: data.id,
        name: data.name,
        teachers: currentTeachers,
      });

      // Initialize subject dropdowns
      const isCurriculumSubject = GHANA_CURRICULUM_SUBJECTS.some(s => s.name === data.name);
      if (isCurriculumSubject) {
        setSubjectName(data.name);
        setCustomSubject("");
        setSelectedLevel("All");
      } else {
        setSubjectName("Other");
        setCustomSubject(data.name);
        setSelectedLevel("All");
      }
      setTeacherDropdownValue("");
    }
  }, [open, data, form]);

  const filteredSubjects = useMemo(() => {
    if (selectedLevel === "All") {
      return GHANA_CURRICULUM_SUBJECTS;
    }
    return GHANA_CURRICULUM_SUBJECTS.filter((s) => s.levels.includes(selectedLevel));
  }, [selectedLevel]);

  const onSubmit = async (values: SubjectSchema) => {
    const finalSubjectName = subjectName === "Other" ? customSubject.trim() : subjectName;

    if (!finalSubjectName) {
      form.setError("name", { message: "Please select or enter a subject name." });
      return;
    }

    try {
      const result = await updateSubject(
        { success: false, error: false },
        { ...values, name: finalSubjectName, teachers: selectedTeachers }
      );
      if (result.success) {
        toast.success("Subject updated successfully!");
        setOpen(false);
        router.refresh();
      } else {
        toast.error("Something went wrong!");
      }
    } catch (error) {
      toast.error("Something went wrong!");
    }
  };

  const addTeacher = () => {
    if (teacherDropdownValue && !selectedTeachers.includes(teacherDropdownValue)) {
      const updated = [...selectedTeachers, teacherDropdownValue];
      setSelectedTeachers(updated);
      form.setValue("teachers", updated, { shouldValidate: true });
    }
    setTeacherDropdownValue("");
  };

  const removeTeacher = (teacherId: string) => {
    const updated = selectedTeachers.filter((id) => id !== teacherId);
    setSelectedTeachers(updated);
    form.setValue("teachers", updated, { shouldValidate: true });
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
      <DialogContent className="sm:max-w-2xl min-h-[500px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Edit Subject</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4 flex flex-col flex-grow">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Level Filter Dropdown */}
              <div className="space-y-2">
                <FormLabel className="text-base">Education Level Filter</FormLabel>
                <Select
                  value={selectedLevel}
                  onChange={(e) => {
                    setSelectedLevel(e.target.value as EducationLevel | "All");
                    setSubjectName(""); // Reset subject when level changes
                  }}
                  className="h-12"
                >
                  <option value="All">All Levels</option>
                  {EDUCATION_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Subject Dropdown */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-base">Subject Name *</FormLabel>
                    <FormControl>
                      <Select
                        value={subjectName}
                        onChange={(e) => setSubjectName(e.target.value)}
                        className="h-12"
                        required
                      >
                        <option value="" disabled>Select a subject...</option>
                        {filteredSubjects.map((sub) => (
                          <option key={sub.name} value={sub.name}>
                            {sub.name}
                          </option>
                        ))}
                        <option value="Other">Other (Custom Subject)</option>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Custom Subject Input (Conditional) */}
            {subjectName === "Other" && (
              <div className="space-y-2">
                <FormLabel className="text-base">Custom Subject Name *</FormLabel>
                <Input
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="Enter custom subject name"
                  className="h-12"
                  required
                />
              </div>
            )}

            {/* Assign Teachers Section */}
            <div className="space-y-4 flex flex-col flex-grow">
              <FormLabel className="text-base">Assign Teachers</FormLabel>
              
              <div className="flex gap-2">
                <Select
                  value={teacherDropdownValue}
                  onChange={(e) => setTeacherDropdownValue(e.target.value)}
                  className="h-12 flex-1"
                >
                  <option value="" disabled>Select a teacher to add...</option>
                  {teachers
                    .filter((t) => !selectedTeachers.includes(t.id))
                    .map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name} {teacher.surname}
                      </option>
                    ))}
                </Select>
                <Button 
                  type="button" 
                  onClick={addTeacher}
                  disabled={!teacherDropdownValue}
                  className="h-12 px-6"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>

              {/* Teacher Chips Display */}
              <div className="border rounded-md p-4 min-h-[150px] bg-gray-50/50 dark:bg-zinc-900/50">
                {selectedTeachers.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-gray-500">
                    No teachers assigned yet
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedTeachers.map((id) => {
                      const t = teachers.find((teacher) => teacher.id === id);
                      if (!t) return null;
                      return (
                        <div 
                          key={id} 
                          className="flex items-center gap-2 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1.5 rounded-full text-sm font-medium"
                        >
                          <span>{t.name} {t.surname}</span>
                          <button
                            type="button"
                            onClick={() => removeTeacher(id)}
                            className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-200 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {form.formState.errors.teachers && (
                <p className="text-sm font-medium text-red-500">{form.formState.errors.teachers.message}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t mt-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="w-24"
              >
                Cancel
              </Button>
              <Button type="submit" className="w-36">Save Changes</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    </>
  );
};
