"use client";

import { useState } from "react";
import { Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditEventModal } from "@/components/forms/EditEventModal";
import { DeleteEventModal } from "@/components/forms/DeleteEventModal";

interface EventCardActionsProps {
  event: {
    id: number;
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    classId: number | null;
  };
  classes: { id: number; name: string; gradeId: number }[];
  grades: { id: number; level: number }[];
  userRole: string;
}

export function EventCardActions({ event, classes, grades, userRole }: EventCardActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const canManage = userRole === "admin";

  if (!canManage) return null;

  return (
    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
      <Button
        variant="outline"
        size="sm"
        className="flex-1 flex items-center justify-center text-blue-300 gap-2 border-blue-200 hover:bg-blue-50 hover:text-blue-600"
        onClick={() => setEditOpen(true)}
      >
        <Edit2 className="w-4 h-4" />
        Edit
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="flex-1 flex items-center justify-center gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-600"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 className="w-4 h-4" />
        Delete
      </Button>

      <EditEventModal
        open={editOpen}
        onOpenChange={setEditOpen}
        classes={classes}
        grades={grades}
        event={event}
      />

      <DeleteEventModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        eventId={event.id}
        eventTitle={event.title}
      />
    </div>
  );
}
