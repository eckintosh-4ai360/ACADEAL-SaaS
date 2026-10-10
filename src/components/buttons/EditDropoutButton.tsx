"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Edit2 } from "lucide-react";
import { EditDropoutModal } from "@/components/modals/EditDropoutModal";

interface DropoutStudent {
  id: string;
  name: string;
  surname: string;
  studentId: string;
  dropoutDate: Date;
  dropoutReason: string | null;
}

export function EditDropoutButton({ dropout }: { dropout: DropoutStudent }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => setOpen(true)}
        className="text-primary hover:text-primary hover:bg-primary/10"
      >
        <Edit2 className="w-4 h-4" />
      </Button>
      <EditDropoutModal
        open={open}
        onOpenChange={setOpen}
        dropout={dropout}
      />
    </>
  );
}
