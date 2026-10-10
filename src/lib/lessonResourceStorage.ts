import path from "path";

import { LessonMaterialKind } from "./utils";

export const LESSON_RESOURCE_STORAGE_ROOT = path.join(
  process.cwd(),
  "storage",
  "lesson-materials"
);

export function getLessonMaterialDirectory(kind: LessonMaterialKind): string {
  return path.join(LESSON_RESOURCE_STORAGE_ROOT, kind);
}

export function sanitizeUploadBaseName(fileName: string): string {
  return (
    path
      .basename(fileName, path.extname(fileName))
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "resource"
  );
}

export function toStoredLessonMaterialPath(kind: LessonMaterialKind, fileName: string): string {
  return path.posix.join(kind, fileName);
}

export function resolveStoredLessonMaterialPath(relativePath: string): string {
  const normalizedRelativePath = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const absolutePath = path.resolve(LESSON_RESOURCE_STORAGE_ROOT, normalizedRelativePath);
  const storageRoot = path.resolve(LESSON_RESOURCE_STORAGE_ROOT);

  if (
    absolutePath !== storageRoot &&
    !absolutePath.startsWith(`${storageRoot}${path.sep}`)
  ) {
    throw new Error("Invalid lesson material path.");
  }

  return absolutePath;
}
