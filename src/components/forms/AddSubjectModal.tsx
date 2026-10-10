"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { X, Plus } from "lucide-react";
import { createSubject } from "@/lib/actions";
import { subjectSchema } from "@/lib/formValidationSchemas";
import { GHANA_CURRICULUM_SUBJECTS, EDUCATION_LEVELS, EducationLevel } from "@/lib/ghanaCurriculumSubjects";

interface AddSubjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teachers: { id: string; name: string; surname: string }[];
}

export function AddSubjectModal({ open, onOpenChange, teachers }: AddSubjectModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>("");
  
  // Subject State
  const [selectedLevel, setSelectedLevel] = useState<EducationLevel | "All">("All");
  const [subjectName, setSubjectName] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  
  // Teacher State
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [teacherDropdownValue, setTeacherDropdownValue] = useState("");

  const filteredSubjects = useMemo(() => {
    if (selectedLevel === "All") {
      return GHANA_CURRICULUM_SUBJECTS;
    }
    return GHANA_CURRICULUM_SUBJECTS.filter((s) => s.levels.includes(selectedLevel));
  }, [selectedLevel]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setMessage("");

    const finalSubjectName = subjectName === "Other" ? customSubject.trim() : subjectName;

    if (!finalSubjectName) {
      setErrors({ name: "Please select or enter a subject name." });
      return;
    }

    const data = {
      name: finalSubjectName,
      teachers: selectedTeachers,
    };

    //* Validate
    const validation = subjectSchema.safeParse(data);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    startTransition(async () => {
      const result = await createSubject({ success: false, error: false }, validation.data);
      if (result.success) {
        setMessage(result.message || "Subject created successfully!");
        setTimeout(() => {
          onOpenChange(false);
          // Reset form state
          setSubjectName("");
          setCustomSubject("");
          setSelectedLevel("All");
          setSelectedTeachers([]);
          router.refresh();
        }, 1000);
      } else {
        setMessage(result.message || "Failed to create subject");
      }
    });
  };

  const addTeacher = () => {
    if (teacherDropdownValue && !selectedTeachers.includes(teacherDropdownValue)) {
      setSelectedTeachers((prev) => [...prev, teacherDropdownValue]);
    }
    setTeacherDropdownValue("");
  };

  const removeTeacher = (teacherId: string) => {
    setSelectedTeachers((prev) => prev.filter((id) => id !== teacherId));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl min-h-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Add New Subject</DialogTitle>
          <DialogDescription>Fill in the subject information below</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Level Filter Dropdown */}
              <div className="space-y-2">
                <Label className="text-base">Education Level Filter</Label>
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
              <div className="space-y-2">
                <Label className="text-base">Subject Name *</Label>
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
                {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
              </div>
            </div>

            {/* Custom Subject Input (Conditional) */}
            {subjectName === "Other" && (
              <div className="space-y-2">
                <Label className="text-base">Custom Subject Name *</Label>
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
              <Label className="text-base">Assign Teachers</Label>
              
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
              {errors.teachers && <p className="text-red-500 text-xs">{errors.teachers}</p>}
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-md font-medium text-sm ${message.includes("success") ? "bg-green-100 text-green-700 border border-green-200" : "bg-red-100 text-red-700 border border-red-200"}`}>
              {message}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t mt-auto">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="w-24">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="w-36">
              {isPending ? "Creating..." : "Create Subject"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


