"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { AddExamRegulationModal } from "./AddExamRegulationModal";

export function AddExamRegulationButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        Upload document
      </Button>
      <AddExamRegulationModal open={open} setOpen={setOpen} />
    </>
  );
}
