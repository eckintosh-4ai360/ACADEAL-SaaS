"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddParentModal } from "@/components/forms/AddParentModal";

export function AddParentButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Add Parent
      </Button>
      <AddParentModal open={open} onOpenChange={setOpen} />
    </>
  );
}

