import { format } from "date-fns";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Book,
  Calendar,
  Download,
  FileText,
  GraduationCap,
  User,
} from "lucide-react";

import { AddSyllabusButton } from "@/components/forms/AddSyllabusButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  canAccessLessonResources,
  canManageLessonResources,
  formatFileSize,
  getLessonMaterialDownloadUrl,
  GRADE_NAMES,
} from "@/lib/utils";

export default async function CourseSyllabiPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (!canAccessLessonResources(session.user.role)) {
    redirect("/dashboard");
  }

  const canManage = canManageLessonResources(session.user.role);
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

  const [syllabi, subjects, grades] = await Promise.all([
    prisma.courseSyllabus.findMany({
      where:
        session.user.role === "student" && studentRecord
          ? { gradeId: studentRecord.gradeId }
          : undefined,
      include: {
        subject: { select: { id: true, name: true } },
        grade: { select: { id: true, level: true } },
      },
      orderBy: [{ updatedAt: "desc" }],
    }),
    canManage
      ? prisma.subject.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    canManage
      ? prisma.grade.findMany({
          select: { id: true, level: true },
          orderBy: { level: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const sortedSyllabi = [...syllabi].sort((left, right) => {
    const gradeDelta = left.grade.level - right.grade.level;
    if (gradeDelta !== 0) return gradeDelta;

    const subjectDelta = left.subject.name.localeCompare(right.subject.name);
    if (subjectDelta !== 0) return subjectDelta;

    return right.updatedAt.getTime() - left.updatedAt.getTime();
  });

  const gradeOptions = grades.map((grade) => ({
    id: grade.id,
    label: GRADE_NAMES[grade.level] || `Grade ${grade.level}`,
  }));

  const emptyMessage =
    session.user.role === "student"
      ? "No syllabus has been uploaded for your grade yet."
      : "No syllabi have been uploaded yet.";

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
              <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 shadow-lg">
                <Book className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-4xl font-black tracking-tight text-foreground">
                  Course Syllabi
                </h1>
                <p className="mt-2 text-lg text-muted-foreground">
                  Curriculum outlines, course expectations, and downloadable PDF materials.
                </p>
              </div>
            </div>
            {canManage && subjects.length > 0 && gradeOptions.length > 0 && (
              <AddSyllabusButton subjects={subjects} grades={gradeOptions} />
            )}
          </div>
        </div>
      </div>

      {sortedSyllabi.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {sortedSyllabi.map((syllabus) => {
            const gradeLabel = GRADE_NAMES[syllabus.grade.level] || `Grade ${syllabus.grade.level}`;

            return (
              <Card
                key={syllabus.id}
                className="border-border/40 transition-all duration-300 hover:shadow-xl"
              >
                <CardHeader className="border-b bg-muted/10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 text-xl font-bold">
                        <FileText className="h-5 w-5 text-blue-600" />
                        {syllabus.title}
                      </CardTitle>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {syllabus.description}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {gradeLabel}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-6">
                  <div className="grid grid-cols-1 gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      <span>{syllabus.subject.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{syllabus.uploadedByName}</span>
                    </div>
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <Calendar className="h-4 w-4" />
                      <span>Updated {format(new Date(syllabus.updatedAt), "yyyy-MM-dd")}</span>
                    </div>
                  </div>

                  {syllabus.topics.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-semibold">Key Topics</p>
                      <div className="flex flex-wrap gap-2">
                        {syllabus.topics.map((topic) => (
                          <Badge key={topic} variant="outline" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t pt-4">
                    <span className="text-sm font-medium text-muted-foreground">
                      {formatFileSize(syllabus.fileSizeBytes)}
                    </span>
                    <Button asChild className="gap-2">
                      <a
                        href={getLessonMaterialDownloadUrl(
                          "syllabi",
                          syllabus.id,
                          syllabus.fileName
                        )}
                      >
                        <Download className="h-4 w-4" />
                        Download PDF
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-2 border-dashed py-12 text-center">
          <CardContent className="space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
              <FileText className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <CardTitle className="text-muted-foreground">{emptyMessage}</CardTitle>
            {canManage && subjects.length > 0 && gradeOptions.length > 0 && (
              <div className="flex justify-center pt-2">
                <AddSyllabusButton subjects={subjects} grades={gradeOptions} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-5 w-5 text-blue-600" />
            <div>
              <h3 className="mb-1 font-semibold text-blue-900 dark:text-blue-100">
                About Course Syllabi
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Each syllabus outlines course objectives, required topics, and the official PDF
                material students should use during the term.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
