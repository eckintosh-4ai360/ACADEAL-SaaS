"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { updateAnnouncement } from "@/lib/actions";
import { announcementSchema } from "@/lib/formValidationSchemas";

import { GRADE_NAMES } from "@/lib/utils";

interface EditAnnouncementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement: {
    id: number;
    title: string;
    description: string;
    date: Date;
    classId: number | null;
    class?: { id: number; name: string; gradeId: number } | null;
  };
  classes: { id: number; name: string; gradeId: number }[];
  grades: { id: number; level: number }[];
}

export function EditAnnouncementModal({ 
  open, 
  onOpenChange, 
  announcement,
  classes,
  grades
}: EditAnnouncementModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>("");
  const [date, setDate] = useState<Date | null>(new Date(announcement.date));
  const [selectedGradeId, setSelectedGradeId] = useState<string>("");
  const [formData, setFormData] = useState({
    title: announcement.title,
    description: announcement.description,
    classId: announcement.classId?.toString() || "",
  });

  //* Filter classes by selected grade
  const filteredClasses = classes.filter((c) => {
    if (!selectedGradeId) return true;
    return Number(c.gradeId) === Number(selectedGradeId);
  });

  //* Reset form when announcement changes or modal opens
  useEffect(() => {
    if (open) {
      setFormData({
        title: announcement.title,
        description: announcement.description,
        classId: announcement.classId?.toString() || "",
      });
      //* Try to find the grade id from the announcement's class
      const initialGradeId = announcement.class?.gradeId?.toString() || 
                           classes.find(c => c.id === announcement.classId)?.gradeId?.toString() || "";
      setSelectedGradeId(initialGradeId);
      setDate(new Date(announcement.date));
      setErrors({});
      setMessage("");
    }
  }, [open, announcement, classes]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setMessage("");

    const submitData = new FormData(e.currentTarget);
    const classId = submitData.get("classId") as string;
    
    const data = {
      id: announcement.id,
      title: submitData.get("title") as string,
      description: submitData.get("description") as string,
      date: date!,
      classId: classId === "" ? undefined : parseInt(classId),
    };

    //* Validate
    const validation = announcementSchema.safeParse(data);
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
      const result = await updateAnnouncement(
        { success: false, error: false }, 
        { ...validation.data, id: announcement.id } as any
      );
      if (result.success) {
        setMessage(result.message || "Announcement updated successfully!");
        setTimeout(() => {
          onOpenChange(false);
          router.refresh();
        }, 1000);
      } else {
        setMessage(result.message || "Failed to update announcement");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[425px] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Announcement</DialogTitle>
          <DialogDescription>Update the announcement details</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input 
                id="title" 
                name="title" 
                placeholder="Announcement title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required 
              />
              {errors.title && <p className="text-red-500 text-xs">{errors.title}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea 
                id="description" 
                name="description" 
                placeholder="Announcement details..." 
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required 
              />
              {errors.description && <p className="text-red-500 text-xs">{errors.description}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <DatePicker
                id="date"
                name="date"
                selected={date}
                onChange={(selectedDate) => setDate(selectedDate)}
                placeholder="Select date"
                required
                dateFormat="MM/dd/yyyy"
              />
              {errors.date && <p className="text-red-500 text-xs">{errors.date}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gradeId">Grade</Label>
                <Select
                  id="gradeId"
                  name="gradeId"
                  value={selectedGradeId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    const newGradeId = e.target.value;
                    setSelectedGradeId(newGradeId);
                    //* Reset classId when grade changes to avoid inconsistency
                    setFormData({ ...formData, classId: "" });
                  }}
                >
                  <option value="">All Grades</option>
                  {grades.map((grade) => (
                    <option key={grade.id} value={grade.id}>
                      {GRADE_NAMES[grade.level] || `Grade ${grade.level}`}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="classId">Target Class</Label>
                <Select 
                  id="classId" 
                  name="classId"
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                >
                  <option value="">{selectedGradeId ? "All Classes in Grade" : "All Classes"}</option>
                  {filteredClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <p className="text-[10px] text-gray-500 -mt-2">Filter by grade to narrow down class selection</p>

          </div>

          {message && (
            <div className={`p-3 rounded ${message.includes("success") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {message}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="sm:w-auto w-full">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="sm:w-auto w-full">
              {isPending ? "Updating..." : "Update Announcement"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

