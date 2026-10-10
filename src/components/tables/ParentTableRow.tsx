"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EditParentModal } from "@/components/forms/EditParentModal";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { deleteParent } from "@/lib/actions";
import { Pencil, Trash2, Users, Mail } from "lucide-react";
import Image from "next/image";
import { SendEmailModal } from "@/components/modals/SendEmailModal";

interface Parent {
  id: string;
  username: string;
  parentUserId?: string | null;
  name: string;
  surname: string;
  email: string | null;
  phone: string;
  address?: string | null;
  img?: string | null;
  _count?: {
    students: number;
  };
  students?: {
    id: string;
    name: string;
    surname: string;
  }[];
}

interface ParentTableRowProps {
  parent: Parent;
  variant?: "row" | "buttons";
}

export function ParentTableRow({ parent, variant = "row" }: ParentTableRowProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sendEmailOpen, setSendEmailOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("id", parent.id);
      await deleteParent({ success: false, error: false }, formData);
      setDeleteOpen(false);
      router.refresh();
    });
  };

  const studentCount = parent._count?.students || parent.students?.length || 0;

  if (variant === "buttons") {
    return (
      <>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-1 border-orange-200 text-orange-700 hover:bg-gray"
          >
            <Pencil className="w-3 h-3" />
            Complete Profile
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setDeleteOpen(true)}
            className="text-gray-400 hover:text-red-500"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>

        <EditParentModal
          key={`${parent.id}-${editOpen ? "open" : "closed"}-pending`}
          open={editOpen}
          onOpenChange={setEditOpen}
          parent={parent}
        />

        <DeleteConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onConfirm={handleDelete}
          title="Delete Parent"
          description={`Are you sure you want to delete ${parent.name} ${parent.surname}? This action cannot be undone.`}
          isDeleting={isPending}
        />
      </>
    );
  }

  return (
    <>
      <tr className="border-b transition-colors hover:bg-muted/50">
        <td className="p-4">
          <div className="flex items-center space-x-3">
            {parent.img ? (
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200">
                <Image
                  src={parent.img}
                  alt={`${parent.name} ${parent.surname}`}
                  width={40}
                  height={40}
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-purple-600">
                  {parent.name.charAt(0)}{parent.surname.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <p className="font-medium">{parent.name} {parent.surname}</p>
              <p className="text-sm text-muted-foreground">@{parent.username}</p>
            </div>
          </div>
        </td>
        <td className="p-4 text-sm font-mono text-muted-foreground">{parent.parentUserId || "PENDING"}</td>
        <td className="p-4 text-sm text-muted-foreground">{parent.email || "-"}</td>
        <td className="p-4 text-sm">{parent.phone}</td>
        <td className="p-4 text-sm text-muted-foreground max-w-xs truncate">{parent.address || "-"}</td>
        <td className="p-4">
          <div className="flex items-center gap-1 text-sm">
            <Users className="w-4 h-4 text-gray-500" />
            <span>{studentCount}</span>
            <span className="text-gray-500">
              {studentCount === 1 ? "student" : "students"}
            </span>
          </div>
        </td>
        <td className="p-4">
          <div className="flex items-center gap-2">
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
              variant="outline" 
              size="sm" 
              onClick={() => setSendEmailOpen(true)}
              className="flex items-center gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <Mail className="w-3 h-3" />
              Email
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

      <SendEmailModal
        open={sendEmailOpen}
        onOpenChange={setSendEmailOpen}
        recipientEmail={parent.email || ""}
        recipientName={`${parent.name} ${parent.surname}`}
      />

      <EditParentModal
        key={`${parent.id}-${editOpen ? "open" : "closed"}-row`}
        open={editOpen}
        onOpenChange={setEditOpen}
        parent={parent}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title="Delete Parent"
        description={`Are you sure you want to delete ${parent.name} ${parent.surname}? This action cannot be undone.`}
        isDeleting={isPending}
      />
    </>
  );
}
