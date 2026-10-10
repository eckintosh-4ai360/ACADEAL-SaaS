"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddClassModal } from "@/components/forms/AddClassModal";

interface AddClassButtonProps {
  grades: { id: number; level: number }[];
  teachers: { id: string; name: string; surname: string }[];
}

export function AddClassButton({ grades, teachers }: AddClassButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Add Class
      </Button>
      <AddClassModal 
        open={open} 
        onOpenChange={setOpen}
        grades={grades}
        teachers={teachers}
      />
    </>
  );
}

