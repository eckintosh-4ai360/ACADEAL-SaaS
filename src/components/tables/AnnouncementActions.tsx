"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteAnnouncement } from "@/lib/actions";
import { Trash2, Pencil } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { EditAnnouncementModal } from "@/components/forms/EditAnnouncementModal";

interface AnnouncementActionsProps {
  announcement: {
    id: number;
    title: string;
    description: string;
    date: Date;
    classId: number | null;
    class?: { id: number; name: string; gradeId: number } | null;
  };
  classes: { id: number; name: string; gradeId: number }[];
  grades: { id: number; level: number }[];
  userRole: string;
}

export function AnnouncementActions({ 
  announcement, 
  classes, 
  grades,
  userRole 
}: AnnouncementActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const canManage = userRole === "admin";

  if (!canManage) return null;

  const handleDelete = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("id", announcement.id.toString());
      await deleteAnnouncement({ success: false, error: false }, formData);
      setDeleteOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap flex-shrink-0">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setEditOpen(true)}
          className="flex items-center gap-1 flex-1 sm:flex-none justify-center"
        >
          <Pencil className="w-3 h-3" />
          <span className="hidden xs:inline">Edit</span>
        </Button>
        <Button 
          variant="destructive" 
          size="sm" 
          onClick={() => setDeleteOpen(true)}
          className="flex items-center gap-1 flex-1 sm:flex-none justify-center"
        >
          <Trash2 className="w-3 h-3" />
          <span className="hidden xs:inline">Delete</span>
        </Button>
      </div>

      <EditAnnouncementModal
        open={editOpen}
        onOpenChange={setEditOpen}
        announcement={announcement}
        classes={classes}
        grades={grades}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title="Delete Announcement"
        description={`Are you sure you want to delete "${announcement.title}"? This action cannot be undone.`}
        isDeleting={isPending}
      />
    </>
  );
}

