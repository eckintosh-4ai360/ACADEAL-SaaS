"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { AddSyllabusModal } from "./AddSyllabusModal";

interface AddSyllabusButtonProps {
  subjects: { id: number; name: string }[];
  grades: { id: number; label: string }[];
}

export function AddSyllabusButton({ subjects, grades }: AddSyllabusButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        Create syllabus
      </Button>
      <AddSyllabusModal open={open} setOpen={setOpen} subjects={subjects} grades={grades} />
    </>
  );
}
