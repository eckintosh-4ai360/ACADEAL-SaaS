"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { AddVideoLessonModal } from "./AddVideoLessonModal";

interface AddVideoLessonButtonProps {
  subjects: { id: number; name: string }[];
  grades: { id: number; label: string }[];
  defaultSubjectId?: number | null;
  defaultGradeId?: number | null;
}

export function AddVideoLessonButton({
  subjects,
  grades,
  defaultSubjectId,
  defaultGradeId,
}: AddVideoLessonButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        Create video lesson
      </Button>
      <AddVideoLessonModal
        open={open}
        setOpen={setOpen}
        subjects={subjects}
        grades={grades}
        defaultSubjectId={defaultSubjectId}
        defaultGradeId={defaultGradeId}
      />
    </>
  );
}
