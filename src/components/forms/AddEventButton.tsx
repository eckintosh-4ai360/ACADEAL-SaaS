"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddEventModal } from "@/components/forms/AddEventModal";

interface AddEventButtonProps {
  classes: { id: number; name: string; gradeId: number }[];
  grades: { id: number; level: number }[];
}

export function AddEventButton({ classes, grades }: AddEventButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        New Event
      </Button>
      <AddEventModal open={open} onOpenChange={setOpen} classes={classes} grades={grades} />
    </>
  );
}

