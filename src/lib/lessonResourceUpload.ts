import { LessonMaterialKind } from "./utils";

export type UploadedLessonMaterial = {
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
  mimeType: string;
};

export async function uploadLessonMaterial(
  file: File,
  kind: LessonMaterialKind
): Promise<UploadedLessonMaterial> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", kind);

  const response = await fetch("/api/lesson-materials/upload", {
    method: "POST",
    body: formData,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.success) {
    throw new Error(payload.error || "Failed to upload lesson material.");
  }

  return {
    fileName: String(payload.fileName || file.name),
    filePath: String(payload.filePath || ""),
    fileSizeBytes: Number(payload.fileSizeBytes || file.size || 0),
    mimeType: String(payload.mimeType || "application/pdf"),
  };
}
