"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Upload } from "lucide-react";
import { AddStudentModal } from "@/components/forms/AddStudentModal";
import { ImportStudentModal } from "@/components/forms/ImportStudentModal";

interface AddStudentButtonProps {
  parents: { id: string; name: string; surname: string; parentUserId?: string | null }[];
  classes: { id: number; name: string; gradeId: number }[];
  grades: { id: number; level: number }[];
  studentIdInitials: string;
  canImport?: boolean;
}

export function AddStudentButton({ parents, classes, grades, studentIdInitials, canImport = true }: AddStudentButtonProps) {
  const [openAdd, setOpenAdd] = useState(false);
  const [openImport, setOpenImport] = useState(false);

  return (
    <>
      <div className="flex gap-2">
        <Button onClick={() => setOpenAdd(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Student
        </Button>
        {canImport && (
          <Button onClick={() => setOpenImport(true)} variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import from File
          </Button>
        )}
      </div>
      <AddStudentModal 
        open={openAdd} 
        onOpenChange={setOpenAdd}
        parents={parents}
        classes={classes}
        grades={grades}
        studentIdInitials={studentIdInitials}
      />
      {canImport && (
        <ImportStudentModal
          open={openImport}
          onOpenChange={setOpenImport}
          parents={parents}
          classes={classes}
          grades={grades}
        />
      )}
    </>
  );
}
