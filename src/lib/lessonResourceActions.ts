"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "./auth";
import {
  AcademicReferenceMaterialSchema,
  academicReferenceMaterialSchema,
  CourseSyllabusSchema,
  courseSyllabusSchema,
  ExamRegulationDocumentSchema,
  examRegulationDocumentSchema,
} from "./formValidationSchemas";
import prisma from "./prisma";
import { canManageLessonResources } from "./utils";
import { writeServerAuditLog } from "./audit-server";
import { requireStaff } from "@/lib/security/guard";

type ActionState = {
  success: boolean;
  error: boolean;
  message: string;
};

type RegulationDocumentCreateDelegate = {
  create: (args: {
    data: {
      title: string;
      description: string;
      fileName: string;
      filePath: string;
      fileSizeBytes: number;
      mimeType: string;
      uploadedById: string;
      uploadedByName: string;
      uploaderRole: string;
    };
  }) => Promise<unknown>;
};

const defaultActionState: ActionState = {
  success: false,
  error: false,
  message: "",
};

function getValidationMessage(error: { issues?: { message?: string }[] }): string {
  return error.issues?.[0]?.message || "Invalid form data.";
}

function normalizeTopics(rawTopics: string | undefined): string[] {
  return (rawTopics || "")
    .split(",")
    .map((topic) => topic.trim())
    .filter(Boolean)
    .filter((topic, index, topics) => topics.indexOf(topic) === index);
}

async function getAuthorizedStaffUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user || !canManageLessonResources(session.user.role)) {
    return null;
  }

  return session.user;
}

function revalidateLessonResourcePages() {
  revalidatePath("/dashboard/lessons");
  revalidatePath("/dashboard/lessons/syllabi");
  revalidatePath("/dashboard/lessons/reference");
  revalidatePath("/dashboard/lessons/regulations");
  revalidatePath("/dashboard/academics");
  revalidatePath("/dashboard");
}

function getRegulationDocumentDelegate(): RegulationDocumentCreateDelegate | null {
  const client = prisma as unknown as {
    examRegulationDocument?: RegulationDocumentCreateDelegate;
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

export async function createCourseSyllabus(
  currentState: ActionState = defaultActionState,
  data: CourseSyllabusSchema
): Promise<ActionState> {
  void currentState;
  const startedAt = Date.now();

  const user = await getAuthorizedStaffUser();
  if (!user) {
    return {
      success: false,
      error: true,
      message: "Only admins and teachers can create syllabi.",
    };
  }

  const parsed = courseSyllabusSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: true,
      message: getValidationMessage(parsed.error),
    };
  }

  try {
    await requireStaff();
    const syllabus = await prisma.courseSyllabus.create({
      data: {
        title: parsed.data.title.trim(),
        description: parsed.data.description.trim(),
        subjectId: parsed.data.subjectId,
        gradeId: parsed.data.gradeId,
        topics: normalizeTopics(parsed.data.topicsText),
        fileName: parsed.data.fileName.trim(),
        filePath: parsed.data.filePath.trim(),
        fileSizeBytes: parsed.data.fileSizeBytes,
        mimeType: parsed.data.mimeType.trim(),
        uploadedById: user.id,
        uploadedByName: user.name?.trim() || user.username,
        uploaderRole: user.role,
      },
    });

    revalidateLessonResourcePages();
    await writeServerAuditLog({
      action: "course_syllabus.create",
      category: "academics",
      summary: `Created course syllabus ${parsed.data.title.trim()}`,
      durationMs: Date.now() - startedAt,
      entity: {
        type: "course_syllabus",
        id: syllabus.id,
        label: parsed.data.title.trim(),
      },
      metadata: {
        subjectId: parsed.data.subjectId,
        gradeId: parsed.data.gradeId,
      },
    });

    return {
      success: true,
      error: false,
      message: "Syllabus created successfully.",
    };
  } catch (error) {
    console.error("Failed to create syllabus:", error);
    return {
      success: false,
      error: true,
      message: "Failed to create syllabus.",
    };
  }
}

export async function createAcademicReferenceMaterial(
  currentState: ActionState = defaultActionState,
  data: AcademicReferenceMaterialSchema
): Promise<ActionState> {
  void currentState;
  const startedAt = Date.now();

  const user = await getAuthorizedStaffUser();
  if (!user) {
    return {
      success: false,
      error: true,
      message: "Only admins and teachers can create academic references.",
    };
  }

  const parsed = academicReferenceMaterialSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: true,
      message: getValidationMessage(parsed.error),
    };
  }

  try {
    await requireStaff();
    const reference = await prisma.academicReferenceMaterial.create({
      data: {
        category: parsed.data.category.trim(),
        title: parsed.data.title.trim(),
        description: parsed.data.description.trim(),
        resourceType: parsed.data.resourceType.trim(),
        fileName: parsed.data.fileName.trim(),
        filePath: parsed.data.filePath.trim(),
        fileSizeBytes: parsed.data.fileSizeBytes,
        mimeType: parsed.data.mimeType.trim(),
        uploadedById: user.id,
        uploadedByName: user.name?.trim() || user.username,
        uploaderRole: user.role,
      },
    });

    revalidateLessonResourcePages();
    await writeServerAuditLog({
      action: "academic_reference.create",
      category: "academics",
      summary: `Created academic reference ${parsed.data.title.trim()}`,
      durationMs: Date.now() - startedAt,
      entity: {
        type: "academic_reference",
        id: reference.id,
        label: parsed.data.title.trim(),
      },
      metadata: {
        category: parsed.data.category.trim(),
        resourceType: parsed.data.resourceType.trim(),
      },
    });

    return {
      success: true,
      error: false,
      message: "Academic reference created successfully.",
    };
  } catch (error) {
    console.error("Failed to create academic reference:", error);
    return {
      success: false,
      error: true,
      message: "Failed to create academic reference.",
    };
  }
}

export async function createExamRegulationDocument(
  currentState: ActionState = defaultActionState,
  data: ExamRegulationDocumentSchema
): Promise<ActionState> {
  void currentState;
  const startedAt = Date.now();

  const user = await getAuthorizedStaffUser();
  if (!user || user.role !== "admin") {
    return {
      success: false,
      error: true,
      message: "Only admins can upload exam regulation documents.",
    };
  }

  const parsed = examRegulationDocumentSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: true,
      message: getValidationMessage(parsed.error),
    };
  }

  try {
    await requireStaff();
    const regulationsDelegate = getRegulationDocumentDelegate();

    if (!regulationsDelegate) {
      return {
        success: false,
        error: true,
        message:
          "Regulation documents are not ready yet. Run the Prisma migration, regenerate the client, and restart the app.",
      };
    }

    await regulationsDelegate.create({
      data: {
        title: parsed.data.title.trim(),
        description: parsed.data.description.trim(),
        fileName: parsed.data.fileName.trim(),
        filePath: parsed.data.filePath.trim(),
        fileSizeBytes: parsed.data.fileSizeBytes,
        mimeType: parsed.data.mimeType.trim(),
        uploadedById: user.id,
        uploadedByName: user.name?.trim() || user.username,
        uploaderRole: user.role,
      },
    });

    revalidateLessonResourcePages();
    await writeServerAuditLog({
      action: "exam_regulation_document.create",
      category: "system",
      summary: `Uploaded exam regulation document ${parsed.data.title.trim()}`,
      durationMs: Date.now() - startedAt,
      entity: {
        type: "exam_regulation_document",
        label: parsed.data.title.trim(),
      },
      metadata: {
        fileName: parsed.data.fileName.trim(),
      },
    });

    return {
      success: true,
      error: false,
      message: "Regulation document uploaded successfully.",
    };
  } catch (error) {
    if (isMissingRegulationsTable(error)) {
      return {
        success: false,
        error: true,
        message:
          "Regulation documents table is missing. Run the Prisma migration, regenerate the client, and restart the app.",
      };
    }

    console.error("Failed to create regulation document:", error);
    return {
      success: false,
      error: true,
      message: "Failed to upload regulation document.",
    };
  }
}
