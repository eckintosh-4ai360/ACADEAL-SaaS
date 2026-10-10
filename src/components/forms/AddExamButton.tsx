"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddExamModal } from "@/components/forms/AddExamModal";

interface AddExamButtonProps {
  lessons: { id: number; name: string; subject: { name: string }; class: { name: string } }[];
}

export function AddExamButton({ lessons }: AddExamButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Add Exam
      </Button>
      <AddExamModal open={open} onOpenChange={setOpen} lessons={lessons} />
    </>
  );
}

