"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { MarkDropoutModal } from "@/components/modals/MarkDropoutModal";

export function AddFromActiveButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} className="flex items-center gap-2">
        <Plus className="w-4 h-4" />
        Add from Active Students
      </Button>
      <MarkDropoutModal open={open} onOpenChange={setOpen} />
    </>
  );
}
