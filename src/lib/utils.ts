import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const ITEMS_PER_PAGE = 10;

export const GRADE_NAMES: Record<number, string> = {
  1: "CRECHE",
  2: "NURSERY 1",
  3: "NURSERY 2",
  4: "KG 1",
  5: "KG 2",
  6: "Basic 1",
  7: "Basic 2",
  8: "Basic 3",
  9: "Basic 4",
  10: "Basic 5",
  11: "Basic 6",
  12: "JHS 1",
  13: "JHS 2",
  14: "JHS 3",
};

export const GRADE_LEVEL_SEQUENCE = Object.keys(GRADE_NAMES)
  .map(Number)
  .sort((left, right) => left - right);

export const GRADE_LEVEL_OPTIONS = GRADE_LEVEL_SEQUENCE.map((level) => ({
  level,
  label: GRADE_NAMES[level] || `Grade ${level}`,
}));

export type TimetableTargetGroup = "PRE_SCHOOL" | "LOWER_PRIMARY" | "UPPER_PRIMARY" | "JUNIOR_HIGH";

export const TIMETABLE_TARGET_GROUP_LABELS: Record<TimetableTargetGroup, string> = {
  PRE_SCHOOL: "Pre-School (Creche - KG 2)",
  LOWER_PRIMARY: "Lower Primary (Basic 1 - Basic 3)",
  UPPER_PRIMARY: "Upper Primary (Basic 4 - Basic 6)",
  JUNIOR_HIGH: "Junior High (JHS 1 - JHS 3)",
};

export type LessonMaterialKind = "syllabi" | "reference" | "regulations";
export type LibraryCatalogItemType = "BOOK" | "DIGITAL_RESOURCE";
export type LibraryCatalogAvailability = "AVAILABLE" | "LIMITED" | "UNAVAILABLE";

export const LIBRARY_CATALOG_ITEM_TYPE_LABELS: Record<LibraryCatalogItemType, string> = {
  BOOK: "Book",
  DIGITAL_RESOURCE: "Digital Resource",
};

export const LIBRARY_CATALOG_AVAILABILITY_LABELS: Record<LibraryCatalogAvailability, string> = {
  AVAILABLE: "Available",
  LIMITED: "Limited",
  UNAVAILABLE: "Unavailable",
};

export const LESSON_RESOURCE_CATEGORIES = [
  "Citation & Formatting",
  "Writing Resources",
  "Research Tools",
];

export const LESSON_RESOURCE_TYPES = [
  "PDF Guide",
  "PDF Template",
  "PDF Worksheet",
  "PDF Reference",
];

export function getTimetableTargetGroupByGradeLevel(level: number): TimetableTargetGroup {
  if (level >= 1 && level <= 5) return "PRE_SCHOOL";
  if (level >= 6 && level <= 8) return "LOWER_PRIMARY";
  if (level >= 9 && level <= 11) return "UPPER_PRIMARY";
  return "JUNIOR_HIGH";
}

export function canManageLessonResources(role?: string | null): boolean {
  return role === "admin" || role === "teacher";
}

export function canAccessLessonResources(role?: string | null): boolean {
  return role === "admin" || role === "teacher" || role === "student";
}

export function canManageVideoLessons(role?: string | null): boolean {
  return role === "admin" || role === "teacher";
}

export function canAccessVideoLessons(role?: string | null): boolean {
  return role === "admin" || role === "teacher" || role === "student";
}

export function canManageLessonMaterialKind(
  role: string | null | undefined,
  kind: LessonMaterialKind
): boolean {
  if (kind === "regulations") {
    return role === "admin";
  }

  return canManageLessonResources(role);
}

export function canAccessLessonMaterialKind(
  role: string | null | undefined,
  kind: LessonMaterialKind
): boolean {
  if (kind === "regulations") {
    return (
      role === "admin" ||
      role === "teacher" ||
      role === "student" ||
      role === "parent"
    );
  }

  return canAccessLessonResources(role);
}

export function canAccessLibraryCatalog(role?: string | null): boolean {
  return (
    role === "admin" ||
    role === "teacher" ||
    role === "student" ||
    role === "parent"
  );
}

export function canManageLibraryCatalog(role?: string | null): boolean {
  return role === "admin" || role === "teacher";
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const value = Math.abs(bytes);
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const size = value / 1024 ** exponent;
  const precision = exponent === 0 ? 0 : size >= 10 ? 1 : 2;

  return `${size.toFixed(precision)} ${units[exponent]}`;
}

export function getLessonMaterialDownloadUrl(kind: LessonMaterialKind, id: number, fileName: string): string {
  return `/api/lesson-materials/${kind}/${id}/download?filename=${encodeURIComponent(fileName)}`;
}

export function normalizeTimetableFileUrl(fileUrl: string, fileType?: string): string {
  let normalized = (fileUrl || "").trim();
  if (!normalized) return "#";

  if (!/^https?:\/\//i.test(normalized) && !normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }

  if (fileType === "PDF" && normalized.includes("res.cloudinary.com")) {
    normalized = normalized.replace("/image/upload/", "/raw/upload/");
  }

  return normalized;
}

export function getTimetableDownloadUrl(
  fileUrl: string,
  title: string,
  fileType?: string
): string {
  let normalizedUrl = normalizeTimetableFileUrl(fileUrl, fileType);
  if (normalizedUrl.startsWith("/api/timetables/download")) {
    const queryIndex = normalizedUrl.indexOf("?");
    if (queryIndex !== -1) {
      const params = new URLSearchParams(normalizedUrl.slice(queryIndex + 1));
      const nestedUrl = params.get("url");
      if (nestedUrl) {
        normalizedUrl = nestedUrl.trim();
      }
    }
  }

  const safeTitle =
    title
      .trim()
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "") || "timetable";
  const extension = fileType === "PDF" ? ".pdf" : "";
  const filename = `${safeTitle}${extension}`;

  if (normalizedUrl.startsWith("/uploads/")) {
    return normalizedUrl;
  }

  return `/api/timetables/download?url=${encodeURIComponent(
    normalizedUrl
  )}&filename=${encodeURIComponent(filename)}`;
}
