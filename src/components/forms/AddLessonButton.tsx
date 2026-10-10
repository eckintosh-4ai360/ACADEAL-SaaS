"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddLessonModal } from "@/components/forms/AddLessonModal";

interface AddLessonButtonProps {
  subjects: { id: number; name: string }[];
  classes: { id: number; name: string }[];
  teachers: { id: string; name: string; surname: string }[];
  currentTeacherId?: string | null;
}

export function AddLessonButton({ subjects, classes, teachers, currentTeacherId }: AddLessonButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Add Lesson
      </Button>
      <AddLessonModal 
        open={open} 
        onOpenChange={setOpen}
        subjects={subjects}
        classes={classes}
        teachers={teachers}
        currentTeacherId={currentTeacherId}
      />
    </>
  );
}
