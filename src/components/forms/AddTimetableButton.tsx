"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AddTimetableModal } from "./AddTimetableModal";

export function AddTimetableButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} className="flex items-center gap-2">
        <Plus className="w-4 h-4" />
        Post Timetable
      </Button>
      <AddTimetableModal open={open} setOpen={setOpen} />
    </>
  );
}
