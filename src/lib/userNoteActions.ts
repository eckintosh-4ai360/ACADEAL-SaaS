"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  extractUserNoteText,
  isMissingUserNotesTable,
  mapRoleToUserType,
  normalizeUserNoteTitle,
  serializeUserNoteRecord,
  type UserNoteRecord,
  sanitizeUserNoteHtml,
} from "@/lib/userNotes";

type SaveUserNoteResult = {
  success: boolean;
  error: boolean;
  message: string;
  note?: {
    id: number;
    title: string;
    contentHtml: string;
    contentText: string;
    updatedAt: string;
  };
};

const MAX_NOTE_TEXT_LENGTH = 50_000;

export async function saveUserNote(input: {
  noteId?: number | null;
  title: string;
  contentHtml: string;
}): Promise<SaveUserNoteResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.role) {
    return {
      success: false,
      error: true,
      message: "You must be logged in to save notes.",
    };
  }

  try {
    const userType = mapRoleToUserType(session.user.role);
    const title = normalizeUserNoteTitle(input.title);
    const contentHtml = sanitizeUserNoteHtml(input.contentHtml);
    const contentText = extractUserNoteText(contentHtml);

    if (contentText.length > MAX_NOTE_TEXT_LENGTH) {
      return {
        success: false,
        error: true,
        message: `Notes must stay under ${MAX_NOTE_TEXT_LENGTH.toLocaleString()} characters.`,
      };
    }

    let note: UserNoteRecord | null = null;

    if (input.noteId) {
      const updatedRows = await prisma.$queryRaw<UserNoteRecord[]>(Prisma.sql`
        UPDATE "UserNote"
        SET
          "title" = ${title},
          "contentHtml" = ${contentHtml},
          "contentText" = ${contentText},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${input.noteId}
          AND "userId" = ${session.user.id}
          AND "userType" = CAST(${userType} AS "UserType")
        RETURNING "id", "title", "contentHtml", "contentText", "updatedAt"
      `);

      note = updatedRows[0] ?? null;
    }

    if (!note) {
      const rows = await prisma.$queryRaw<UserNoteRecord[]>(Prisma.sql`
        INSERT INTO "UserNote" (
          "userId",
          "userType",
          "title",
          "contentHtml",
          "contentText",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${session.user.id},
          CAST(${userType} AS "UserType"),
          ${title},
          ${contentHtml},
          ${contentText},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        RETURNING "id", "title", "contentHtml", "contentText", "updatedAt"
      `);

      if (!rows[0]) {
        return {
          success: false,
          error: true,
          message: "Unable to save notes right now.",
        };
      }

      note = rows[0];
    }

    revalidatePath("/dashboard/academics/notes");

    return {
      success: true,
      error: false,
      message: "Notes saved successfully.",
      note: serializeUserNoteRecord(note),
    };
  } catch (error) {
    if (isMissingUserNotesTable(error)) {
      return {
        success: false,
        error: true,
        message:
          "Notes storage is not ready yet. Apply the latest Prisma migration and restart the app.",
      };
    }

    console.error("saveUserNote error:", error);
    return {
      success: false,
      error: true,
      message: "Unable to save notes right now.",
    };
  }
}
