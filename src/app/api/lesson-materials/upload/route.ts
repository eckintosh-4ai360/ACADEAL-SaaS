import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import {
  getLessonMaterialDirectory,
  sanitizeUploadBaseName,
  toStoredLessonMaterialPath,
} from "@/lib/lessonResourceStorage";
import { canManageLessonMaterialKind, LessonMaterialKind } from "@/lib/utils";

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const VALID_KINDS: LessonMaterialKind[] = ["syllabi", "reference", "regulations"];

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file = data.get("file");
    const kind = String(data.get("kind") || "").trim() as LessonMaterialKind;

    const session = await getServerSession(authOptions);

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "No file uploaded." },
        { status: 400 }
      );
    }

    if (!VALID_KINDS.includes(kind)) {
      return NextResponse.json(
        { success: false, error: "Invalid lesson material type." },
        { status: 400 }
      );
    }

    if (!session?.user || !canManageLessonMaterialKind(session.user.role, kind)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 403 }
      );
    }

    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      return NextResponse.json(
        { success: false, error: "Only PDF files are allowed." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: "PDF must be 15 MB or smaller." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadDir = getLessonMaterialDirectory(kind);
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const safeBaseName = sanitizeUploadBaseName(file.name);
    const storedFileName = `${safeBaseName}-${uniqueSuffix}.pdf`;
    const storedFilePath = path.join(uploadDir, storedFileName);

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(storedFilePath, buffer);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      filePath: toStoredLessonMaterialPath(kind, storedFileName),
      fileSizeBytes: file.size,
      mimeType: "application/pdf",
    });
  } catch (error) {
    const err = error as { message?: string };
    console.error("Lesson material upload failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to upload lesson material.",
      },
      { status: 500 }
    );
  }
}
