"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddFeeModal } from "@/components/forms/AddFeeModal";

interface AddFeeButtonProps {
  grades: { id: number; name: string }[];
}

export function AddFeeButton({ grades }: AddFeeButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Add Fee
      </Button>
      <AddFeeModal 
        open={open} 
        onOpenChange={setOpen}
        grades={grades}
      />
    </>
  );
}

