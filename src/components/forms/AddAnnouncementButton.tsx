"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddAnnouncementModal } from "@/components/forms/AddAnnouncementModal";

interface AddAnnouncementButtonProps {
  classes: { id: number; name: string; gradeId: number }[];
  grades: { id: number; level: number }[];
}

export function AddAnnouncementButton({ classes, grades }: AddAnnouncementButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        New Announcement
      </Button>
      <AddAnnouncementModal 
        open={open} 
        onOpenChange={setOpen}
        classes={classes}
        grades={grades}
      />
    </>
  );
}

