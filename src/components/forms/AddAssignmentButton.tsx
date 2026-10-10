"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddAssignmentModal } from "@/components/forms/AddAssignmentModal";

interface AddAssignmentButtonProps {
  lessons: { id: number; name: string; subject: { name: string }; class: { name: string } }[];
}

export function AddAssignmentButton({ lessons }: AddAssignmentButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Add Assignment
      </Button>
      <AddAssignmentModal open={open} onOpenChange={setOpen} lessons={lessons} />
    </>
  );
}

