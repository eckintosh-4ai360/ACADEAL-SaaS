"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Upload } from "lucide-react";
import { AddTeacherModal } from "@/components/forms/AddTeacherModal";
import { ImportTeacherModal } from "@/components/forms/ImportTeacherModal";

interface AddTeacherButtonProps {
  subjects: { id: number; name: string }[];
}

export function AddTeacherButton({ subjects }: AddTeacherButtonProps) {
  const [openAdd, setOpenAdd] = useState(false);
  const [openImport, setOpenImport] = useState(false);

  return (
    <>
      <div className="flex gap-2">
        <Button onClick={() => setOpenAdd(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Teacher
        </Button>
        <Button onClick={() => setOpenImport(true)} variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Import from File
        </Button>
      </div>
      <AddTeacherModal 
        open={openAdd} 
        onOpenChange={setOpenAdd}
        subjects={subjects}
      />
      <ImportTeacherModal
        open={openImport}
        onOpenChange={setOpenImport}
        subjects={subjects}
      />
    </>
  );
}

