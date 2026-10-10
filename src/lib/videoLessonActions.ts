"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "./auth";
import {
  UpdateVideoLessonSchema,
  VideoLessonSchema,
  updateVideoLessonSchema,
  videoLessonSchema,
} from "./formValidationSchemas";
import prisma from "./prisma";
import { canManageVideoLessons } from "./utils";
import { getVideoLessonComposerScopeForTeacher } from "./videoLessonScope";
import {
  extractYouTubeVideoId,
  getYouTubeThumbnailUrl,
  toCanonicalYouTubeUrl,
} from "./youtube";
import { writeServerAuditLog } from "./audit-server";
import { requireStaff } from "@/lib/security/guard";

type ActionState = {
  success: boolean;
  error: boolean;
  message: string;
};

type VideoLessonDelegate = {
  create: (args: {
    data: {
      title: string;
      description: string;
      youtubeUrl: string;
      youtubeVideoId: string;
      thumbnailUrl: string;
      subjectId: number;
      gradeId: number;
      uploadedById: string;
      uploadedByName: string;
      uploaderRole: string;
    };
  }) => Promise<unknown>;
  findUnique: (args: {
    where: { id: number };
    select: {
      id: true;
      uploadedById: true;
      subjectId: true;
      gradeId: true;
      title: true;
    };
  }) => Promise<{
    id: number;
    uploadedById: string;
    subjectId: number;
    gradeId: number;
    title: string;
  } | null>;
  update: (args: {
    where: { id: number };
    data: {
      title: string;
      description: string;
      youtubeUrl: string;
      youtubeVideoId: string;
      thumbnailUrl: string;
      subjectId: number;
      gradeId: number;
    };
  }) => Promise<unknown>;
  delete: (args: {
    where: { id: number };
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

function getVideoLessonDelegate(): VideoLessonDelegate | null {
  const client = prisma as unknown as {
    videoLesson?: VideoLessonDelegate;
  };

  return client.videoLesson || null;
}

function isMissingVideoLessonTable(error: unknown): boolean {
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

  return modelName.includes("VideoLesson") || message.includes("VideoLesson");
}

function revalidateVideoLessonPages() {
  revalidatePath("/dashboard/lessons/video-lessons");
  revalidatePath("/dashboard/academics/necessities");
  revalidatePath("/dashboard/lessons");
  revalidatePath("/dashboard/academics");
  revalidatePath("/dashboard");
}

async function getAuthorizedManager() {
  const session = await getServerSession(authOptions);

  if (!session?.user || !canManageVideoLessons(session.user.role)) {
    return null;
  }

  return session.user;
}

export async function createVideoLesson(
  currentState: ActionState = defaultActionState,
  data: VideoLessonSchema
): Promise<ActionState> {
  void currentState;
  const startedAt = Date.now();

  const user = await getAuthorizedManager();
  if (!user) {
    return {
      success: false,
      error: true,
      message: "Only admins and teachers can create video lessons.",
    };
  }

  const parsed = videoLessonSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: true,
      message: getValidationMessage(parsed.error),
    };
  }

  const delegate = getVideoLessonDelegate();
  if (!delegate) {
    return {
      success: false,
      error: true,
      message:
        "Video lessons are not ready yet. Sync the Prisma schema and restart the app.",
    };
  }

  const videoId = extractYouTubeVideoId(parsed.data.youtubeUrl);
  if (!videoId) {
    return {
      success: false,
      error: true,
      message: "Enter a valid YouTube video link.",
    };
  }

  if (user.role === "teacher") {
    const scope = await getVideoLessonComposerScopeForTeacher(user.id);
    const canUseSubject = scope.subjects.some((subject) => subject.id === parsed.data.subjectId);
    const canUseGrade = scope.grades.some((grade) => grade.id === parsed.data.gradeId);

    if (!canUseSubject) {
      return {
        success: false,
        error: true,
        message: "You can only create video lessons for subjects assigned to you.",
      };
    }

    if (!canUseGrade) {
      return {
        success: false,
        error: true,
        message: "You can only create video lessons for grades linked to your assigned classes.",
      };
    }
  }

  try {
    await requireStaff();
    await delegate.create({
      data: {
        title: parsed.data.title.trim(),
        description: parsed.data.description.trim(),
        youtubeUrl: toCanonicalYouTubeUrl(videoId),
        youtubeVideoId: videoId,
        thumbnailUrl: getYouTubeThumbnailUrl(videoId),
        subjectId: parsed.data.subjectId,
        gradeId: parsed.data.gradeId,
        uploadedById: user.id,
        uploadedByName: user.name?.trim() || user.username,
        uploaderRole: user.role,
      },
    });

    revalidateVideoLessonPages();
    await writeServerAuditLog({
      action: "video_lesson.create",
      category: "academics",
      summary: `Created video lesson ${parsed.data.title.trim()}`,
      durationMs: Date.now() - startedAt,
      entity: {
        type: "video_lesson",
        label: parsed.data.title.trim(),
      },
      metadata: {
        subjectId: parsed.data.subjectId,
        gradeId: parsed.data.gradeId,
        uploaderRole: user.role,
      },
    });

    return {
      success: true,
      error: false,
      message: "Video lesson created successfully.",
    };
  } catch (error) {
    if (isMissingVideoLessonTable(error)) {
      return {
        success: false,
        error: true,
        message:
          "Video lessons table is missing. Run the Prisma migration, regenerate Prisma, and restart the app.",
      };
    }

    console.error("Failed to create video lesson:", error);
    return {
      success: false,
      error: true,
      message: "Failed to create video lesson.",
    };
  }
}

export async function updateVideoLesson(
  data: UpdateVideoLessonSchema
): Promise<ActionState> {
  const startedAt = Date.now();
  const user = await getAuthorizedManager();
  if (!user) {
    return {
      success: false,
      error: true,
      message: "Only admins and teachers can edit video lessons.",
    };
  }

  const parsed = updateVideoLessonSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: true,
      message: getValidationMessage(parsed.error),
    };
  }

  const delegate = getVideoLessonDelegate();
  if (!delegate) {
    return {
      success: false,
      error: true,
      message:
        "Video lessons are not ready yet. Sync the Prisma schema and restart the app.",
    };
  }

  const videoId = extractYouTubeVideoId(parsed.data.youtubeUrl);
  if (!videoId) {
    return {
      success: false,
      error: true,
      message: "Enter a valid YouTube video link.",
    };
  }

  try {
    await requireStaff();
    const existingLesson = await delegate.findUnique({
      where: { id: parsed.data.id },
      select: {
        id: true,
        uploadedById: true,
        subjectId: true,
        gradeId: true,
        title: true,
      },
    });

    if (!existingLesson) {
      return {
        success: false,
        error: true,
        message: "Video lesson not found.",
      };
    }

    if (user.role === "teacher") {
      if (existingLesson.uploadedById !== user.id) {
        return {
          success: false,
          error: true,
          message: "You can only edit video lessons you created.",
        };
      }

      const scope = await getVideoLessonComposerScopeForTeacher(user.id);
      const canUseSubject = scope.subjects.some((subject) => subject.id === parsed.data.subjectId);
      const canUseGrade = scope.grades.some((grade) => grade.id === parsed.data.gradeId);

      if (!canUseSubject) {
        return {
          success: false,
          error: true,
          message: "You can only assign subjects that belong to you.",
        };
      }

      if (!canUseGrade) {
        return {
          success: false,
          error: true,
          message: "You can only assign grades linked to your classes.",
        };
      }
    }

    await delegate.update({
      where: { id: parsed.data.id },
      data: {
        title: parsed.data.title.trim(),
        description: parsed.data.description.trim(),
        youtubeUrl: toCanonicalYouTubeUrl(videoId),
        youtubeVideoId: videoId,
        thumbnailUrl: getYouTubeThumbnailUrl(videoId),
        subjectId: parsed.data.subjectId,
        gradeId: parsed.data.gradeId,
      },
    });

    revalidateVideoLessonPages();
    await writeServerAuditLog({
      action: "video_lesson.update",
      category: "academics",
      summary: `Updated video lesson ${parsed.data.title.trim()}`,
      durationMs: Date.now() - startedAt,
      entity: {
        type: "video_lesson",
        id: parsed.data.id,
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
      message: "Video lesson updated successfully.",
    };
  } catch (error) {
    if (isMissingVideoLessonTable(error)) {
      return {
        success: false,
        error: true,
        message:
          "Video lessons table is missing. Run the Prisma migration, regenerate Prisma, and restart the app.",
      };
    }

    console.error("Failed to update video lesson:", error);
    return {
      success: false,
      error: true,
      message: "Failed to update video lesson.",
    };
  }
}

export async function deleteVideoLesson(lessonId: number): Promise<ActionState> {
  const startedAt = Date.now();
  const user = await getAuthorizedManager();
  if (!user) {
    return {
      success: false,
      error: true,
      message: "Only admins and teachers can delete video lessons.",
    };
  }

  if (!Number.isInteger(lessonId) || lessonId <= 0) {
    return {
      success: false,
      error: true,
      message: "Invalid video lesson.",
    };
  }

  const delegate = getVideoLessonDelegate();
  if (!delegate) {
    return {
      success: false,
      error: true,
      message:
        "Video lessons are not ready yet. Sync the Prisma schema and restart the app.",
    };
  }

  try {
    await requireStaff();
    const existingLesson = await delegate.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        uploadedById: true,
        subjectId: true,
        gradeId: true,
        title: true,
      },
    });

    if (!existingLesson) {
      return {
        success: false,
        error: true,
        message: "Video lesson not found.",
      };
    }

    if (user.role === "teacher" && existingLesson.uploadedById !== user.id) {
      return {
        success: false,
        error: true,
        message: "You can only delete video lessons you created.",
      };
    }

    await delegate.delete({
      where: { id: lessonId },
    });

    revalidateVideoLessonPages();
    await writeServerAuditLog({
      action: "video_lesson.delete",
      category: "academics",
      summary: `Deleted video lesson ${existingLesson.title}`,
      durationMs: Date.now() - startedAt,
      entity: {
        type: "video_lesson",
        id: lessonId,
        label: existingLesson.title,
      },
    });

    return {
      success: true,
      error: false,
      message: "Video lesson deleted successfully.",
    };
  } catch (error) {
    if (isMissingVideoLessonTable(error)) {
      return {
        success: false,
        error: true,
        message:
          "Video lessons table is missing. Run the Prisma migration, regenerate Prisma, and restart the app.",
      };
    }

    console.error("Failed to delete video lesson:", error);
    return {
      success: false,
      error: true,
      message: "Failed to delete video lesson.",
    };
  }
}
