import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddExamButton } from "@/components/forms/AddExamButton";
import { ExamTableRow } from "@/components/tables/ExamTableRow";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PageSizeSelector } from "@/components/ui/PageSizeSelector";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { SearchBar } from "@/components/ui/search-bar";

export default async function ExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; search?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  const role = user?.role || "student";
  const userId = user?.id || "";
  const canCreateExam = role === "admin" || role === "teacher";

  // For students, look up their classId so we can filter exams to their class
  let studentClassId: number | null = null;
  if (role === "student" && userId) {
    const studentRecord = await prisma.student.findUnique({
      where: { id: userId },
      select: { classId: true },
    });
    studentClassId = studentRecord?.classId ?? null;
  }

  const lessonWhere =
    role === "teacher"
      ? { teacherId: userId }
      : role === "admin"
        ? undefined
        : studentClassId !== null
          ? { classId: studentClassId }
          : { id: -1 };

  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const pageSize = parseInt(params.pageSize || "15");
  const search = params.search?.trim() || "";
  const examWhere: Prisma.ExamWhereInput = {
    ...(role === "teacher"
      ? { lesson: { teacherId: userId } }
      : role === "admin"
        ? {}
        : studentClassId !== null
          ? { lesson: { classId: studentClassId } }
          : { id: -1 }),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { lesson: { subject: { name: { contains: search, mode: "insensitive" as const } } } },
            { lesson: { class: { name: { contains: search, mode: "insensitive" as const } } } },
            { lesson: { teacher: { name: { contains: search, mode: "insensitive" as const } } } },
            { lesson: { teacher: { surname: { contains: search, mode: "insensitive" as const } } } },
          ],
        }
      : {}),
  };

  const [exams, total, lessons] = await Promise.all([
    prisma.exam.findMany({
      where: examWhere,
      include: {
        lesson: {
          include: {
            subject: true,
            class: true,
            teacher: true,
          },
        },
        _count: {
          select: {
            results: true,
          },
        },
      },
      orderBy: { startTime: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.exam.count({ where: examWhere }),
    prisma.lesson.findMany({
      where: lessonWhere,
      include: {
        subject: true,
        class: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  const getPageUrl = (p: number) => {
    const urlParams = new URLSearchParams();
    if (pageSize !== 15) urlParams.set("pageSize", pageSize.toString());
    if (search) urlParams.set("search", search);
    urlParams.set("page", p.toString());
    return `/dashboard/exams?${urlParams.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Exams</h1>
          <p className="text-gray-500 mt-1">Manage all exams in the system</p>
        </div>
        {canCreateExam && <AddExamButton lessons={lessons} />}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>All Exams ({total})</CardTitle>
          <div className="flex flex-wrap items-center gap-3">
            <SearchBar placeholder="Search exams, subject, class, or teacher..." />
            <PageSizeSelector />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Title</th>
                  <th className="text-left p-4 font-medium">Subject</th>
                  <th className="text-left p-4 font-medium">Class</th>
                  <th className="text-left p-4 font-medium">Teacher</th>
                  <th className="text-left p-4 font-medium">Date & Time</th>
                  <th className="text-left p-4 font-medium">Results</th>
                  <th className="text-left p-4 font-medium ">Actions</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam) => (
                  <ExamTableRow 
                    key={exam.id} 
                    exam={exam}
                    role={role} 
                    userId={userId} 
                    lessons={lessons} 
                  />
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-600">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} exams
              </p>
              <div className="flex items-center space-x-2">
                {page > 1 && (
                  <Link href={getPageUrl(page - 1)}>
                    <Button variant="outline" size="sm">Previous</Button>
                  </Link>
                )}
                <span className="text-sm">Page {page} of {totalPages}</span>
                {page < totalPages && (
                  <Link href={getPageUrl(page + 1)}>
                    <Button variant="outline" size="sm">Next</Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
