"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddSubjectModal } from "@/components/forms/AddSubjectModal";

interface AddSubjectButtonProps {
  teachers: { id: string; name: string; surname: string }[];
}

export function AddSubjectButton({ teachers }: AddSubjectButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Add Subject
      </Button>
      <AddSubjectModal 
        open={open} 
        onOpenChange={setOpen}
        teachers={teachers}
      />
    </>
  );
}

