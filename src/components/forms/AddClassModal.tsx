"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { Select } from "@/components/ui/select";
import { createClass } from "@/lib/actions";
import { classSchema } from "@/lib/formValidationSchemas";
import {
  buildClassNameFromGradeLevel,
  getGradeLabel,
} from "@/lib/class-management";

interface AddClassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grades: { id: number; level: number }[];
  teachers: { id: string; name: string; surname: string }[];
}

export function AddClassModal({
  open,
  onOpenChange,
  grades,
  teachers,
}: AddClassModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [selectedGradeId, setSelectedGradeId] = useState("");
  const [section, setSection] = useState("");
  const [customName, setCustomName] = useState("");

  const selectedGrade = useMemo(
    () => grades.find((grade) => grade.id === Number(selectedGradeId)),
    [grades, selectedGradeId]
  );

  const generatedName = useMemo(() => {
    if (!selectedGrade) return "";
    return buildClassNameFromGradeLevel(selectedGrade.level, section);
  }, [section, selectedGrade]);

  const resolvedClassName = customName.trim() || generatedName;

  const resetForm = () => {
    setErrors({});
    setMessage("");
    setSelectedGradeId("");
    setSection("");
    setCustomName("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }

    onOpenChange(nextOpen);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setMessage("");

    const formData = new FormData(e.currentTarget);
    const supervisorId = formData.get("supervisorId") as string;
    const gradeId = Number.parseInt(formData.get("gradeId") as string, 10);
    const capacity = Number.parseInt(formData.get("capacity") as string, 10);
    const name = (customName.trim() || generatedName).trim();

    const data = {
      name,
      capacity,
      gradeId,
      supervisorId: supervisorId === "" ? undefined : supervisorId,
    };

    const validation = classSchema.safeParse(data);
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
      const result = await createClass(
        { success: false, error: false },
        validation.data
      );

      if (result.success) {
        setMessage(result.message || "Class created successfully!");
        setTimeout(() => {
          handleOpenChange(false);
          router.refresh();
        }, 1000);
      } else {
        setMessage(result.message || "Failed to create class");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Class</DialogTitle>
          <DialogDescription>
            Configure the exact class structure this school uses for the selected
            grade.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gradeId">Grade *</Label>
            <Select
              id="gradeId"
              name="gradeId"
              required
              value={selectedGradeId}
              onChange={(e) => setSelectedGradeId(e.target.value)}
            >
              <option value="">Select Grade</option>
              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {getGradeLabel(grade.level)}
                </option>
              ))}
            </Select>
            {errors.gradeId && <p className="text-red-500 text-xs">{errors.gradeId}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="section">Section / Stream</Label>
            <Input
              id="section"
              name="section"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="A, B, C, Gold..."
            />
            <p className="text-xs text-muted-foreground">
              Leave this blank when the school uses only one class for the
              grade, like <span className="font-medium">Basic 1</span>.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customName">Custom Class Name</Label>
            <Input
              id="customName"
              name="customName"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Optional override if this school uses a special label"
            />
            <p className="text-xs text-muted-foreground">
              Use this only when the school naming does not follow the normal
              grade + section pattern.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="namePreview">Class Name Preview</Label>
            <Input
              id="namePreview"
              value={resolvedClassName}
              readOnly
              placeholder="Select a grade to generate the class name"
              className="bg-muted"
            />
            {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity *</Label>
            <Input id="capacity" name="capacity" type="number" min="1" required />
            {errors.capacity && <p className="text-red-500 text-xs">{errors.capacity}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="supervisorId">Supervisor (Optional)</Label>
            <Select id="supervisorId" name="supervisorId">
              <option value="">No Supervisor</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name} {teacher.surname}
                </option>
              ))}
            </Select>
            {errors.supervisorId && (
              <p className="text-red-500 text-xs">{errors.supervisorId}</p>
            )}
          </div>

          {selectedGrade && (
            <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Examples for {getGradeLabel(selectedGrade.level)}:{" "}
              <span className="font-medium">
                {getGradeLabel(selectedGrade.level)}
              </span>
              ,{" "}
              <span className="font-medium">
                {buildClassNameFromGradeLevel(selectedGrade.level, "A")}
              </span>
              ,{" "}
              <span className="font-medium">
                {buildClassNameFromGradeLevel(selectedGrade.level, "B")}
              </span>
            </div>
          )}

          {message && (
            <div
              className={`rounded p-3 ${
                message.toLowerCase().includes("success")
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {message}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create Class"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
