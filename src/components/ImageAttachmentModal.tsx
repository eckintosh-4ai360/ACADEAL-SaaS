"use client";

import { useRef, useState } from "react";
import { Upload, X, AlertCircle, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "react-toastify";

type ImageAttachmentModalProps = {
  onImageSelect: (imageData: string, fileName: string) => void;
  onClose: () => void;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FORMATS = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export function ImageAttachmentModal({
  onImageSelect,
  onClose,
}: ImageAttachmentModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<{ src: string; name: string } | null>(null);

  const validateFile = (file: File): boolean => {
    if (!ALLOWED_FORMATS.includes(file.type)) {
      toast.error("Only image files (JPEG, PNG, GIF, WebP) are allowed.");
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Image size must be less than 5MB.");
      return false;
    }

    return true;
  };

  const handleFile = (file: File) => {
    if (!validateFile(file)) return;

    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === "string") {
        setPreview({ src: result, name: file.name });
      }
      setIsLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const insertImage = () => {
    if (!preview) return;

    onImageSelect(preview.src, preview.name);
    setPreview(null);
  };

  const clearPreview = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md border-border/50">
        <CardHeader className="border-b border-border/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-black tracking-tight">
              Attach Image
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-6">
          {!preview ? (
            <>
              {/* Upload Area */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={cn(
                  "rounded-2xl border-2 border-dashed transition-colors p-8 text-center cursor-pointer",
                  dragActive
                    ? "border-primary bg-primary/10"
                    : "border-border/40 bg-muted/20 hover:border-primary/50"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleInputChange}
                  className="hidden"
                />

                <div className="flex flex-col items-center gap-2">
                  <div className="rounded-full bg-primary/10 p-3 text-primary">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Click to upload</p>
                    <p className="text-xs text-muted-foreground">
                      or drag and drop
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPEG, GIF or WebP (Max 5MB)
                  </p>
                </div>
              </div>

              {/* Info */}
              <div className="rounded-2xl border border-amber-200/50 bg-amber-50/30 p-3 flex gap-2 text-xs text-amber-800">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Image only</p>
                  <p>Videos and other files are not supported.</p>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Preview */}
              <div className="space-y-3">
                <div className="rounded-2xl border border-border/60 bg-muted/20 overflow-hidden">
                  <img
                    src={preview.src}
                    alt="Preview"
                    className="w-full h-auto max-h-64 object-contain"
                  />
                </div>

                <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground truncate">
                    <span className="font-semibold">File:</span> {preview.name}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearPreview}
                    className="w-full"
                  >
                    Choose Different
                  </Button>
                  <Button
                    type="button"
                    onClick={insertImage}
                    disabled={isLoading}
                    className="w-full gap-2"
                  >
                    <ImageIcon className="h-4 w-4" />
                    Insert Image
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
