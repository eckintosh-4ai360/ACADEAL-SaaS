import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { resolveStoredLessonMaterialPath } from "@/lib/lessonResourceStorage";
import { canAccessLessonMaterialKind, LessonMaterialKind } from "@/lib/utils";

type RegulationDocumentDownloadDelegate = {
  findUnique: (args: {
    where: { id: number };
    select: {
      fileName: true;
      filePath: true;
      mimeType: true;
    };
  }) => Promise<{
    fileName: string;
    filePath: string;
    mimeType: string;
  } | null>;
};

function sanitizeFilename(filename: string | null, fallback: string): string {
  const clean =
    (filename || fallback)
      .replace(/[\r\n]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || fallback;

  return clean;
}

function isValidKind(kind: string): kind is LessonMaterialKind {
  return kind === "syllabi" || kind === "reference" || kind === "regulations";
}

function getRegulationDocumentDelegate(): RegulationDocumentDownloadDelegate | null {
  const client = prisma as unknown as {
    examRegulationDocument?: RegulationDocumentDownloadDelegate;
  };

  return client.examRegulationDocument || null;
}

function isMissingRegulationsTable(error: unknown): boolean {
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
    modelName.includes("ExamRegulationDocument") ||
    message.includes("ExamRegulationDocument")
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kind: string; id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { kind, id } = await params;
    const materialId = Number.parseInt(id, 10);

    if (!isValidKind(kind) || Number.isNaN(materialId)) {
      return NextResponse.json(
        { success: false, error: "Invalid lesson material request." },
        { status: 400 }
      );
    }

    if (!canAccessLessonMaterialKind(session.user.role, kind)) {
      return NextResponse.json(
        { success: false, error: "Forbidden." },
        { status: 403 }
      );
    }

    const mode = request.nextUrl.searchParams.get("mode") === "view" ? "view" : "download";

    if (kind === "syllabi") {
      const syllabus = await prisma.courseSyllabus.findUnique({
        where: { id: materialId },
        select: {
          fileName: true,
          filePath: true,
          mimeType: true,
          gradeId: true,
        },
      });

      if (!syllabus) {
        return NextResponse.json(
          { success: false, error: "Syllabus not found." },
          { status: 404 }
        );
      }

      if (session.user.role === "student") {
        const student = await prisma.student.findUnique({
          where: { id: session.user.id },
          select: { gradeId: true },
        });

        if (!student || student.gradeId !== syllabus.gradeId) {
          return NextResponse.json(
            { success: false, error: "You do not have access to this syllabus." },
            { status: 403 }
          );
        }
      }

      const absolutePath = resolveStoredLessonMaterialPath(syllabus.filePath);
      const fileBuffer = await fs.readFile(absolutePath);
      const downloadName = sanitizeFilename(
        request.nextUrl.searchParams.get("filename"),
        syllabus.fileName || path.basename(absolutePath)
      );

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": syllabus.mimeType || "application/pdf",
          "Content-Disposition":
            mode === "view" ? "inline" : `attachment; filename="${downloadName}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (kind === "reference") {
      const material = await prisma.academicReferenceMaterial.findUnique({
        where: { id: materialId },
        select: {
          fileName: true,
          filePath: true,
          mimeType: true,
        },
      });

      if (!material) {
        return NextResponse.json(
          { success: false, error: "Academic reference not found." },
          { status: 404 }
        );
      }

      const absolutePath = resolveStoredLessonMaterialPath(material.filePath);
      const fileBuffer = await fs.readFile(absolutePath);
      const downloadName = sanitizeFilename(
        request.nextUrl.searchParams.get("filename"),
        material.fileName || path.basename(absolutePath)
      );

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": material.mimeType || "application/pdf",
          "Content-Disposition":
            mode === "view" ? "inline" : `attachment; filename="${downloadName}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const regulationsDelegate = getRegulationDocumentDelegate();

    if (!regulationsDelegate) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Regulation documents are not ready yet. Run the Prisma migration, regenerate the client, and restart the app.",
        },
        { status: 503 }
      );
    }

    const regulation = await regulationsDelegate.findUnique({
      where: { id: materialId },
      select: {
        fileName: true,
        filePath: true,
        mimeType: true,
      },
    });

    if (!regulation) {
      return NextResponse.json(
        { success: false, error: "Regulation document not found." },
        { status: 404 }
      );
    }

    const absolutePath = resolveStoredLessonMaterialPath(regulation.filePath);
    const fileBuffer = await fs.readFile(absolutePath);
    const downloadName = sanitizeFilename(
      request.nextUrl.searchParams.get("filename"),
      regulation.fileName || path.basename(absolutePath)
    );

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": regulation.mimeType || "application/pdf",
        "Content-Disposition":
          mode === "view" ? "inline" : `attachment; filename="${downloadName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { message?: string };
    const isMissingFile = err.code === "ENOENT";

    if (isMissingRegulationsTable(error)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Regulation documents table is missing. Run the Prisma migration, regenerate the client, and restart the app.",
        },
        { status: 503 }
      );
    }

    console.error("Lesson material download failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: isMissingFile
          ? "Lesson material file not found."
          : err.message || "Failed to download lesson material.",
      },
      { status: isMissingFile ? 404 : 500 }
    );
  }
}
