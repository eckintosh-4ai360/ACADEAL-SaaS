import sanitizeHtml from "sanitize-html";
import type { UserType } from "@prisma/client";

export type DashboardUserRole = "admin" | "teacher" | "student" | "parent";

const NOTE_ALLOWED_TAGS = [
  "p",
  "div",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "ul",
  "ol",
  "li",
  "blockquote",
  "span",
  "h1",
  "h2",
  "h3",
  "img",
];

export function mapRoleToUserType(role: DashboardUserRole): UserType {
  switch (role) {
    case "admin":
      return "ADMIN";
    case "teacher":
      return "TEACHER";
    case "student":
      return "STUDENT";
    case "parent":
      return "PARENT";
    default: {
      const exhaustiveCheck: never = role;
      return exhaustiveCheck;
    }
  }
}

export function sanitizeUserNoteHtml(value: string): string {
  const sanitized = sanitizeHtml(value, {
    allowedTags: NOTE_ALLOWED_TAGS,
    allowedAttributes: {
      "*": ["style"],
      p: ["align"],
      div: ["align"],
      h1: ["align"],
      h2: ["align"],
      h3: ["align"],
      blockquote: ["align"],
      span: ["align"],
      img: ["src", "alt", "title", "width", "height", "class"],
    },
    allowedStyles: {
      "*": {
        "text-align": [/^left$/, /^center$/, /^right$/, /^justify$/],
      },
    },
  }).trim();

  return sanitized || "<p></p>";
}

export function extractUserNoteText(value: string): string {
  return sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeUserNoteTitle(value: string): string {
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 120) : "My Notes";
}

export type UserNoteRecord = {
  id: number;
  title: string;
  contentHtml: string;
  contentText: string;
  updatedAt: Date;
};

export type SerializedUserNoteRecord = {
  id: number;
  title: string;
  contentHtml: string;
  contentText: string;
  updatedAt: string;
};

export function serializeUserNoteRecord(note: UserNoteRecord): SerializedUserNoteRecord {
  return {
    id: note.id,
    title: note.title,
    contentHtml: note.contentHtml,
    contentText: note.contentText,
    updatedAt: note.updatedAt.toISOString(),
  };
}

export function isMissingUserNotesTable(error: unknown): boolean {
  const prismaError = error as {
    code?: string;
    meta?: { modelName?: string };
    message?: string;
  };

  if (prismaError?.code === "P2021") {
    return true;
  }

  const modelName = prismaError?.meta?.modelName || "";
  const message = prismaError?.message || "";

  return (
    modelName.includes("UserNote") ||
    message.includes("UserNote") ||
    message.includes("reading 'findUnique'") ||
    message.includes('reading "findUnique"') ||
    message.includes("reading 'upsert'") ||
    message.includes('reading "upsert"')
  );
}
