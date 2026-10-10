import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Video } from "lucide-react";

import { VideoLessonsClient } from "@/components/VideoLessonsClient";
import { AddVideoLessonButton } from "@/components/forms/AddVideoLessonButton";
import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  getVideoLessonComposerScopeForAdmin,
  getVideoLessonComposerScopeForTeacher,
} from "@/lib/videoLessonScope";
import { GRADE_NAMES, canAccessVideoLessons, canManageVideoLessons } from "@/lib/utils";

type VideoLessonRecord = {
  id: number;
  title: string;
  description: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  thumbnailUrl: string;
  uploadedById: string;
  uploadedByName: string;
  updatedAt: Date;
  subject: {
    id: number;
    name: string;
  };
  grade: {
    id: number;
    level: number;
  };
};

type VideoLessonDelegate = {
  findMany: (args: {
    where?: { gradeId?: number };
    include: {
      subject: { select: { id: true; name: true } };
      grade: { select: { id: true; level: true } };
    };
    orderBy: ({ updatedAt: "desc" } | { title: "asc" })[];
  }) => Promise<VideoLessonRecord[]>;
};

function getVideoLessonDelegate(): VideoLessonDelegate | null {
  const client = prisma as unknown as {
    videoLesson?: VideoLessonDelegate;
  };

  return client.videoLesson || null;
}

function isMissingVideoLessonsTable(error: unknown): boolean {
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

export default async function VideoLessonsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (!canAccessVideoLessons(session.user.role)) {
    redirect("/dashboard");
  }

  const canManage = canManageVideoLessons(session.user.role);
  const backHref = "/dashboard/academics/necessities";

  const studentRecord =
    session.user.role === "student"
      ? await prisma.student.findUnique({
          where: { id: session.user.id },
          select: { gradeId: true, grade: { select: { level: true } } },
        })
      : null;

  if (session.user.role === "student" && !studentRecord) {
    redirect("/dashboard/academics");
  }

  const composerScope = canManage
    ? session.user.role === "teacher"
      ? await getVideoLessonComposerScopeForTeacher(session.user.id)
      : await getVideoLessonComposerScopeForAdmin()
    : {
        subjects: [],
        grades: [],
        defaultSubjectId: null,
        defaultGradeId: null,
      };

  const videoLessonDelegate = getVideoLessonDelegate();
  let featureReady = Boolean(videoLessonDelegate);
  let lessons: VideoLessonRecord[] = [];

  if (!featureReady) {
    console.warn(
      "Prisma VideoLesson model not found in client. Run migration, regenerate Prisma, and restart the app."
    );
  }

  if (videoLessonDelegate) {
    try {
      lessons = await videoLessonDelegate.findMany({
        where:
          session.user.role === "student" && studentRecord
            ? { gradeId: studentRecord.gradeId }
            : undefined,
        include: {
          subject: { select: { id: true, name: true } },
          grade: { select: { id: true, level: true } },
        },
        orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
      });
    } catch (error) {
      if (isMissingVideoLessonsTable(error)) {
        featureReady = false;
        console.warn(
          "VideoLesson table not found. Run migration, regenerate Prisma, and restart the app."
        );
      } else {
        throw error;
      }
    }
  }

  const lessonViews = lessons.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    youtubeUrl: lesson.youtubeUrl,
    youtubeVideoId: lesson.youtubeVideoId,
    thumbnailUrl: lesson.thumbnailUrl,
    subjectId: lesson.subject.id,
    gradeId: lesson.grade.id,
    uploadedByName: lesson.uploadedByName,
    subjectName: lesson.subject.name,
    gradeLabel: GRADE_NAMES[lesson.grade.level] || `Grade ${lesson.grade.level}`,
    updatedAt: lesson.updatedAt.toISOString(),
    canManage:
      session.user.role === "admin" ||
      (session.user.role === "teacher" && lesson.uploadedById === session.user.id),
  }));

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4">
        <Link href={backHref}>
          <Button variant="ghost" size="sm" className="w-fit gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>

        <div className="border-b border-border/50 pb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 p-4 shadow-lg">
                <Video className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-4xl font-black tracking-tight text-foreground">
                  Video Lessons
                </h1>
                <p className="mt-2 text-lg text-muted-foreground">
                  Watch curriculum-aligned YouTube lessons directly inside the portal.
                </p>
              </div>
            </div>
            {canManage && featureReady && (
              <AddVideoLessonButton
                subjects={composerScope.subjects}
                grades={composerScope.grades.map((grade) => ({
                  id: grade.id,
                  label: grade.label,
                }))}
                defaultSubjectId={composerScope.defaultSubjectId}
                defaultGradeId={composerScope.defaultGradeId}
              />
            )}
          </div>
        </div>
      </div>

      <VideoLessonsClient
        lessons={lessonViews}
        featureReady={featureReady}
        subjects={composerScope.subjects}
        grades={composerScope.grades.map((grade) => ({
          id: grade.id,
          label: grade.label,
        }))}
      />
    </div>
  );
}
