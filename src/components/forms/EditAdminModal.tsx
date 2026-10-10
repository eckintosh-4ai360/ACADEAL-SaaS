"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { updateAdmin } from "@/lib/actions";
import { adminSchema } from "@/lib/formValidationSchemas";
import { Upload, X } from "lucide-react";
import Image from "next/image";

interface EditAdminModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admin: {
    id: string;
    username: string;
    staffId: string;
    name: string;
    email: string | null;
    role: string;
    img?: string | null;
  };
}

export function EditAdminModal({ open, onOpenChange, admin }: EditAdminModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string | null>(admin.img || null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  //* Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setImagePreview(admin.img || null);
      setImageFile(null);
      setErrors({});
      setMessage("");
    }
  }, [open, admin]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setMessage("");

    const formData = new FormData(e.currentTarget);
    let imagePath: string | undefined = admin.img || undefined;

    //* Upload image if a new one was selected
    if (imageFile) {
      const uploadFormData = new FormData();
      uploadFormData.append("file", imageFile);

      try {
        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: uploadFormData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          setMessage("Failed to upload image: " + (errorData.error || "Unknown error"));
          return;
        }

        const uploadResult = await uploadResponse.json();
        if (uploadResult.success) {
          imagePath = uploadResult.path;
        }
      } catch (error) {
        console.error("Image upload error:", error);
        setMessage("Failed to upload image");
        return;
      }
    }

    const data = {
      id: admin.id,
      username: formData.get("username") as string,
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      role: formData.get("role") as string,
      password: formData.get("password") as string || undefined,
      img: imagePath,
    };

    const validation = adminSchema.safeParse(data);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    startTransition(async () => {
      const result = await updateAdmin({ success: false, error: false }, validation.data);
      if (result.success) {
        setMessage(result.message || "Admin updated successfully!");
        setTimeout(() => {
          onOpenChange(false);
          router.refresh();
        }, 1000);
      } else {
        setMessage(result.message || "Failed to update admin");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Admin</DialogTitle>
          <DialogDescription>Update admin information</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {/* ! Profile Picture Upload */}
            <div className="space-y-2">
              <Label htmlFor="img">Profile Picture</Label>
              <div className="flex items-center gap-4">
                {imagePreview ? (
                  <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200">
                    <Image
                      src={imagePreview}
                      alt="Profile preview"
                      width={96}
                      height={96}
                      className="object-cover w-full h-full"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                    <Upload className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    id="img"
                    name="img"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-gray-500 mt-1">Upload a new profile picture (optional)</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="staffId">Admin ID *</Label>
              <Input
                id="staffId"
                value={admin.staffId}
                readOnly
                className="bg-orange-50 text-orange-600 font-semibold border-orange-200 cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input id="username" name="username" defaultValue={admin.username} required />
              {errors.username && <p className="text-red-500 text-xs">{errors.username}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password (leave empty to keep current)</Label>
              <Input id="password" name="password" type="password" />
              {errors.password && <p className="text-red-500 text-xs">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" name="name" defaultValue={admin.name} required />
              {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={admin.email || ""} />
              {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select id="role" name="role" defaultValue={admin.role} required>
                <option value="">Select Role</option>
                <option value="ADMIN">Admin</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </Select>
              {errors.role && <p className="text-red-500 text-xs">{errors.role}</p>}
            </div>
          </div>

          {message && (
            <div className={`p-3 rounded ${message.includes("success") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {message}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Updating..." : "Update Admin"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

