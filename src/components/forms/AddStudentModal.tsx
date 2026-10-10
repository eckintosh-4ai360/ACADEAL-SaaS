"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { createStudent } from "@/lib/actions";
import { studentSchema } from "@/lib/formValidationSchemas";
import { GRADE_NAMES } from "@/lib/utils";

interface AddStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parents: { id: string; name: string; surname: string; parentUserId?: string | null }[];
  classes: { id: number; name: string; gradeId: number }[];
  grades: { id: number; level: number }[];
  studentIdInitials: string;
}

const OCCUPATIONS = [
  "Accountant", "Architect", "Business Owner", "Civil Servant", "Doctor",
  "Engineer", "Farmer", "Lawyer", "Nurse", "Pastor / Cleric",
  "Police Officer", "Retired", "Self Employed", "Teacher", "Trader", "Other",
];

export function AddStudentModal({
  open,
  onOpenChange,
  parents,
  classes,
  grades,
  studentIdInitials,
}: AddStudentModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>("");
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [admissionDate, setAdmissionDate] = useState<Date | null>(null);
  const [selectedGradeId, setSelectedGradeId] = useState<string>("");
  const [parentType, setParentType] = useState<"existing" | "new">("new");
  const [selectedOccupation, setSelectedOccupation] = useState<string>("");
  const [customOccupation, setCustomOccupation] = useState<string>("");

  //* Generate the preview student ID
  const previewStudentId = useMemo(() => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yy = String(now.getFullYear()).slice(-2);
    return `${studentIdInitials}${mm}${yy}XXX`;
  }, [studentIdInitials]);

  //* Filter classes by selected grade
  const filteredClasses = useMemo(() => {
    if (!selectedGradeId) return classes;
    return classes.filter((c) => c.gradeId === parseInt(selectedGradeId));
  }, [classes, selectedGradeId]);

  const resetFormState = () => {
    setErrors({});
    setMessage("");
    setBirthday(null);
    setAdmissionDate(null);
    setSelectedGradeId("");
    setParentType("new");
    setSelectedOccupation("");
    setCustomOccupation("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetFormState();
    }

    onOpenChange(nextOpen);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setMessage("");

    const formData = new FormData(e.currentTarget);

    const baseData = {
      name: formData.get("name") as string,
      surname: formData.get("surname") as string,
      otherNames: formData.get("otherNames") as string,
      sex: formData.get("sex") as "MALE" | "FEMALE",
      birthday: birthday!,
      gradeId: parseInt(formData.get("gradeId") as string),
      classId: parseInt(formData.get("classId") as string),
      residencyStatus: formData.get("residencyStatus") as "DAY" | "BOARDING",
      house: formData.get("house") as string,
      occupation: selectedOccupation === "Other" ? customOccupation : selectedOccupation,
      nhisNumber: formData.get("nhisNumber") as string,
      admissionDate: admissionDate,
      emergencyContact: formData.get("emergencyContact") as string,
      parentType: parentType,
    };

    const data =
      parentType === "existing"
        ? {
            ...baseData,
            parentId: formData.get("parentId") as string,
          }
        : {
            ...baseData,
            parentName: formData.get("parentName") as string,
            parentSurname: formData.get("parentSurname") as string,
            parentPhone: formData.get("parentPhone") as string,
            parentEmail: formData.get("parentEmail") as string,
            parentAddress: formData.get("parentAddress") as string,
            guardianName: `${formData.get("parentName") as string} ${formData.get("parentSurname") as string}`.trim(),
            contactNumber: formData.get("parentPhone") as string,
          };

    //* Validate
    const validation = studentSchema.safeParse(data);
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
      const result = await createStudent({ success: false, error: false }, validation.data);
      if (result.success) {
        setMessage(result.message || "Student created successfully!");
        setTimeout(() => {
          handleOpenChange(false);
          router.refresh();
        }, 1000);
      } else {
        setMessage(result.message || "Failed to create student");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold tracking-wide uppercase">
            New Student Admission Form
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            Fill in all required fields marked with *
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
         
         
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="studentId">Student ID*</Label>
              <Input
                id="studentId"
                value={previewStudentId}
                readOnly
                className="bg-orange-50 text-orange-600 font-semibold border-orange-200 cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">Auto-generated on save</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">First Name*</Label>
              <Input id="name" name="name" required />
              {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="surname">Last Name*</Label>
              <Input id="surname" name="surname" required />
              {errors.surname && <p className="text-red-500 text-xs">{errors.surname}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="otherNames">Othername(s)</Label>
              <Input id="otherNames" name="otherNames" />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sex">Gender*</Label>
              <Select id="sex" name="sex" required>
                <option value="">Select Gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </Select>
              {errors.sex && <p className="text-red-500 text-xs">{errors.sex}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="birthday">Date of Birth*</Label>
              <DatePicker
                id="birthday"
                name="birthday"
                selected={birthday}
                onChange={(date) => setBirthday(date)}
                placeholder="mm/dd/yyyy"
                required
                maxDate={new Date()}
                showYearDropdown
                showMonthDropdown
                dropdownMode="select"
                dateFormat="MM/dd/yyyy"
              />
              {errors.birthday && <p className="text-red-500 text-xs">{errors.birthday}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gradeId">Grade*</Label>
              <Select
                id="gradeId"
                name="gradeId"
                required
                value={selectedGradeId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  setSelectedGradeId(e.target.value);
                 
                  //* Reseting the class selection to avoid invalid data
                  const form = e.target.form;
                  if (form) {
                    const classSelect = form.elements.namedItem("classId") as HTMLSelectElement;
                    if (classSelect) classSelect.value = "";
                  }
                }}
              >
                <option value="">Select Grade</option>
                {grades.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {GRADE_NAMES[grade.level] || `Grade ${grade.level}`}
                  </option>
                ))}
              </Select>
              {errors.gradeId && <p className="text-red-500 text-xs">{errors.gradeId}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="classId">Class*</Label>
              <Select id="classId" name="classId" required disabled={classes.length === 0}>
                <option value="">
                  {classes.length === 0 ? "Create a Class First" : "Select Class"}
                </option>
                {filteredClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </Select>
              {selectedGradeId && filteredClasses.length === 0 && (
                <p className="text-xs text-amber-600">
                  No classes have been created for this grade yet.
                </p>
              )}
              {errors.classId && <p className="text-red-500 text-xs">{errors.classId}</p>}
            </div>
          </div>


          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="residencyStatus">Residency Status*</Label>
              <Select id="residencyStatus" name="residencyStatus" required>
                <option value="DAY">Day</option>
                <option value="BOARDING">Boarding</option>
              </Select>
              {errors.residencyStatus && <p className="text-red-500 text-xs">{errors.residencyStatus}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="house">House</Label>
              <Select id="house" name="house">
                <option value="">Select House</option>
                <option value="LOVE">Love</option>
                <option value="NOBLE">Noble</option>
                <option value="WISDOM">Wisdom</option>
                <option value="UNITY">Unity</option>
              </Select>
            </div>
          </div>


          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <span className="w-8 h-[2px] bg-primary" />
              Parent Assignment
            </h3>
            
            <div className="flex items-center gap-6 pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="parentSelector"
                  value="new"
                  checked={parentType === "new"}
                  onChange={() => setParentType("new")}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm font-medium">Create New Parent</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="parentSelector"
                  value="existing"
                  checked={parentType === "existing"}
                  onChange={() => setParentType("existing")}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm font-medium">Use Existing Parent</span>
              </label>
            </div>

            {parentType === "existing" ? (
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="parentId">Select Parent*</Label>
                  <Select id="parentId" name="parentId" required={parentType === "existing"}>
                    <option value="">Search/Select Parent...</option>
                    {parents.map((p) => (
                    <option key={p.id} value={p.id}>
                        {p.name} {p.surname}{p.parentUserId ? ` (${p.parentUserId})` : ""}
                      </option>
                    ))}
                  </Select>
                  {errors.parentId && <p className="text-red-500 text-xs">{errors.parentId}</p>}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-1.5">
                  <Label htmlFor="parentName">Parent First Name*</Label>
                  <Input id="parentName" name="parentName" required={parentType === "new"} />
                  {errors.parentName && <p className="text-red-500 text-xs">{errors.parentName}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="parentSurname">Parent Last Name*</Label>
                  <Input id="parentSurname" name="parentSurname" required={parentType === "new"} />
                  {errors.parentSurname && <p className="text-red-500 text-xs">{errors.parentSurname}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="parentPhone">Parent Phone*</Label>
                  <Input id="parentPhone" name="parentPhone" type="tel" required={parentType === "new"} />
                  {errors.parentPhone && <p className="text-red-500 text-xs">{errors.parentPhone}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="parentEmail">Parent Email</Label>
                  <Input id="parentEmail" name="parentEmail" type="email" />
                  {errors.parentEmail && <p className="text-red-500 text-xs">{errors.parentEmail}</p>}
                </div>
                <div className="space-y-1.5 col-span-4">
                  <Label htmlFor="parentAddress">Parent Home Address</Label>
                  <Input id="parentAddress" name="parentAddress" placeholder="e.g. 12 Accra Road, Kumasi" />
                </div>
              </div>
            )}
          </div>


          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" name="email" type="email" />
              {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="occupation">Occupation</Label>
              <Select
                id="occupation"
                name="occupation"
                value={selectedOccupation}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedOccupation(e.target.value)}
              >
                <option value="">Select...</option>
                {OCCUPATIONS.map((occ) => (
                  <option key={occ} value={occ}>{occ}</option>
                ))}
              </Select>
            </div>
            {selectedOccupation === "Other" && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-left-2 duration-300">
                <Label htmlFor="customOccupation">Specify Occupation*</Label>
                <Input
                  id="customOccupation"
                  name="customOccupation"
                  value={customOccupation}
                  onChange={(e) => setCustomOccupation(e.target.value)}
                  placeholder="Enter occupation..."
                  required
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="nhisNumber">NHIS Number</Label>
              <Input id="nhisNumber" name="nhisNumber" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admissionDate">Admission Date</Label>
              <DatePicker
                id="admissionDate"
                name="admissionDate"
                selected={admissionDate}
                onChange={(date) => setAdmissionDate(date)}
                placeholder="mm/dd/yyyy"
                showYearDropdown
                showMonthDropdown
                dropdownMode="select"
                dateFormat="MM/dd/yyyy"
              />
            </div>
          </div>


          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="emergencyContact">Emergency Contact</Label>
              <Input id="emergencyContact" name="emergencyContact" type="tel" />
            </div>
          </div>

          {message && (
            <div
              className={`p-3 rounded text-sm ${
                message.includes("success")
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {message}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                const form = document.querySelector("form") as HTMLFormElement;
                form?.reset();
                setBirthday(null);
                setAdmissionDate(null);
                setSelectedGradeId("");
                setSelectedOccupation("");
                setCustomOccupation("");
                setErrors({});
                setMessage("");
              }}
              disabled={isPending}
            >
              Clear
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
