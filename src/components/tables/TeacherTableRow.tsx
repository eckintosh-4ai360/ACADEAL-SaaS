"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ViewTeacherModal } from "@/components/modals/ViewTeacherModal";
import { EditTeacherModal } from "@/components/forms/EditTeacherModal";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { deleteTeacher } from "@/lib/actions";
import { Pencil, Trash2, Eye } from "lucide-react";
import Image from "next/image";

interface Teacher {
  id: string;
  username: string;
  staffId: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  address: string;
  sex: string;
  birthday: Date;
  img?: string | null;
  subjects: { id: number; name: string }[];
  _count?: { classes: number; lessons: number };
}

interface TeacherTableRowProps {
  teacher: Teacher;
  allSubjects: { id: number; name: string }[];
}

export function TeacherTableRow({ teacher, allSubjects }: TeacherTableRowProps) {
  const router = useRouter();
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("id", teacher.id);
      await deleteTeacher({ success: false, error: false }, formData);
      setDeleteOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <tr className="border-b transition-colors hover:bg-muted/50">
        <td className="p-4">
          <div className="flex items-center space-x-3">
            {teacher.img ? (
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200">
                <Image
                  src={teacher.img}
                  alt={`${teacher.name} ${teacher.surname}`}
                  width={40}
                  height={40}
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">
                  {teacher.name.charAt(0)}{teacher.surname.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <p className="font-medium">{teacher.name} {teacher.surname}</p>
              <p className="text-sm text-muted-foreground">@{teacher.username}</p>
            </div>
          </div>
        </td>
        <td className="p-4 text-sm font-mono text-muted-foreground">{teacher.staffId}</td>
        <td className="p-4">
          <div className="flex flex-wrap gap-1">
            {teacher.subjects.slice(0, 2).map((subject, idx) => (
              <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                {subject.name}
              </span>
            ))}
            {teacher.subjects.length > 2 && (
              <span className="text-xs text-muted-foreground px-2 py-1">+{teacher.subjects.length - 2}</span>
            )}
          </div>
        </td>
        <td className="p-4 text-sm">{teacher._count?.classes || 0}</td>
        <td className="p-4 text-sm">{teacher._count?.lessons || 0}</td>
        <td className="p-4 text-sm">{teacher.email || teacher.phone || "-"}</td>
        <td className="p-4">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setViewOpen(true)}
              className="flex items-center gap-1"
            >
              <Eye className="w-3 h-3" />
              View
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-1"
            >
              <Pencil className="w-3 h-3" />
              Edit
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => setDeleteOpen(true)}
              className="flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </Button>
          </div>
        </td>
      </tr>

      <ViewTeacherModal 
        open={viewOpen}
        onOpenChange={setViewOpen}
        teacher={teacher}
      />

      <EditTeacherModal
        open={editOpen}
        onOpenChange={setEditOpen}
        teacher={teacher}
        subjects={allSubjects}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title="Delete Teacher"
        description={`Are you sure you want to delete ${teacher.name} ${teacher.surname}? This action cannot be undone.`}
        isDeleting={isPending}
      />
    </>
  );
}
