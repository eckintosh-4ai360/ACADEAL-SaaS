"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EditAdminModal } from "@/components/forms/EditAdminModal";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { deleteAdmin } from "@/lib/actions";
import { Pencil, Trash2 } from "lucide-react";
import Image from "next/image";

interface Admin {
  id: string;
  username: string;
  staffId: string;
  name: string;
  email: string | null;
  role: string;
  img?: string | null;
  createdAt: Date;
}

interface AdminTableRowProps {
  admin: Admin;
}

export function AdminTableRow({ admin }: AdminTableRowProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("id", admin.id);
      await deleteAdmin({ success: false, error: false }, formData);
      setDeleteOpen(false);
      router.refresh();
    });
  };

  const roleLabel = admin.role === "SUPER_ADMIN" ? "Super Admin" : "Admin";
  const roleColor = admin.role === "SUPER_ADMIN" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700";

  return (
    <>
      <tr className="border-b transition-colors hover:bg-muted/50">
        <td className="p-4">
          <div className="flex items-center space-x-3">
            {admin.img ? (
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200">
                <Image
                  src={admin.img}
                  alt={admin.name}
                  width={40}
                  height={40}
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">
                  {admin.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <p className="font-medium font-mono">{admin.staffId}</p>
              <p className="text-sm text-muted-foreground">@{admin.username}</p>
            </div>
          </div>
        </td>
        <td className="p-4 font-medium">{admin.name}</td>
        <td className="p-4 text-sm">{admin.email || "-"}</td>
        <td className="p-4">
          <span className={`text-xs ${roleColor} px-2 py-1 rounded`}>
            {roleLabel}
          </span>
        </td>
        <td className="p-4 text-sm text-muted-foreground">
          {new Date(admin.createdAt).toLocaleDateString()}
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

      <EditAdminModal
        open={editOpen}
        onOpenChange={setEditOpen}
        admin={admin}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title="Delete Admin"
        description={`Are you sure you want to delete ${admin.name}? This action cannot be undone.`}
        isDeleting={isPending}
      />
    </>
  );
}

