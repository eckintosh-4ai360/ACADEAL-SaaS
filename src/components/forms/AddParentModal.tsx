"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createParent } from "@/lib/actions";
import { parentSchema } from "@/lib/formValidationSchemas";
import { Upload, X, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { PARENT_USER_ID_PREFIX, buildSequentialIdPreview } from "@/lib/userIds";

interface AddParentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddParentModal({ open, onOpenChange }: AddParentModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const previewParentUserId = buildSequentialIdPreview(PARENT_USER_ID_PREFIX);

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
    let imagePath: string | undefined = undefined;

    //* Upload image if selected
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
      username: formData.get("username") as string,
      password: formData.get("password") as string,
      name: formData.get("name") as string,
      surname: formData.get("surname") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      address: formData.get("address") as string,
      img: imagePath,
    };

    //* Validate
    const validation = parentSchema.safeParse(data);
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
      const result = await createParent({ success: false, error: false }, validation.data);
      if (result.success) {
        setMessage(result.message || "Parent created successfully!");
        setTimeout(() => {
          onOpenChange(false);
          router.refresh();
        }, 1000);
      } else {
        const serverMessage = result.message || "Failed to create parent";
        if (serverMessage.toLowerCase().includes("username")) {
          setErrors((prev) => ({ ...prev, username: serverMessage }));
        }
        setMessage(serverMessage);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) {
        setImagePreview(null);
        setImageFile(null);
      }
      onOpenChange(val);
    }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Parent</DialogTitle>
          <DialogDescription>Fill in the parent information below</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* ! Profile Picture Upload */}
            <div className="space-y-2 col-span-2">
              <Label htmlFor="img">Profile Picture (Optional)</Label>
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
                  <p className="text-xs text-gray-500 mt-1">Upload a profile picture (optional)</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentUserId">Parent ID *</Label>
              <Input
                id="parentUserId"
                value={previewParentUserId}
                readOnly
                className="bg-orange-50 text-orange-600 font-semibold border-orange-200 cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">Auto-generated on save</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input id="username" name="username" autoComplete="off" required />
              {errors.username && <p className="text-red-500 text-xs">{errors.username}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className="pr-10"
                  autoComplete="new-password"
                  placeholder="Leave empty to use parent123"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">First Name *</Label>
              <Input id="name" name="name" required />
              {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="surname">Last Name *</Label>
              <Input id="surname" name="surname" required />
              {errors.surname && <p className="text-red-500 text-xs">{errors.surname}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" />
              {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" name="phone" type="tel" required />
              {errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" />
              {errors.address && <p className="text-red-500 text-xs">{errors.address}</p>}
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
              {isPending ? "Creating..." : "Create Parent"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

