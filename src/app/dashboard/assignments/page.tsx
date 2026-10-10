import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { AddAssignmentButton } from "@/components/forms/AddAssignmentButton";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PageSizeSelector } from "@/components/ui/PageSizeSelector";
import { SearchBar } from "@/components/ui/search-bar";

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; search?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  const role = user?.role || "student";
  const userId = user?.id || "";
  const canCreateAssignment = role === "admin" || role === "teacher";
  const lessonWhere =
    role === "teacher" ? { teacherId: userId } : role === "admin" ? undefined : { id: -1 };

  // For students, look up their classId so we can filter assignments to their class
  let studentClassId: number | null = null;
  if (role === "student" && userId) {
    const studentRecord = await prisma.student.findUnique({
      where: { id: userId },
      select: { classId: true },
    });
    studentClassId = studentRecord?.classId ?? null;
  }

  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const pageSize = parseInt(params.pageSize || "15");
  const search = params.search?.trim() || "";
  const assignmentWhere: Prisma.AssignmentWhereInput = {
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

  const [assignments, total, lessons] = await Promise.all([
    prisma.assignment.findMany({
      where: assignmentWhere,
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
      orderBy: { dueDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.assignment.count({ where: assignmentWhere }),
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
    return `/dashboard/assignments?${urlParams.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Assignments</h1>
          <p className="text-muted-foreground mt-1">Manage all assignments</p>
        </div>
        {canCreateAssignment && <AddAssignmentButton lessons={lessons} />}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>All Assignments ({total})</CardTitle>
          <div className="flex flex-wrap items-center gap-3">
            <SearchBar placeholder="Search assignments, subject, class, or teacher..." />
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
                  <th className="text-left p-4 font-medium">Due Date</th>
                  <th className="text-left p-4 font-medium">Submissions</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => (
                  <tr key={assignment.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="p-4 font-medium">{assignment.title}</td>
                    <td className="p-4 text-sm">{assignment.lesson.subject.name}</td>
                    <td className="p-4 text-sm">{assignment.lesson.class.name}</td>
                    <td className="p-4 text-sm">
                      {assignment.lesson.teacher.name} {assignment.lesson.teacher.surname}
                    </td>
                    <td className="p-4 text-sm">
                      <div>{format(new Date(assignment.dueDate), "MMM dd, yyyy")}</div>
                      <div className={`text-xs ${
                        new Date(assignment.dueDate) < new Date()
                          ? "text-red-600"
                          : "text-muted-foreground"
                      }`}>
                        {new Date(assignment.dueDate) < new Date() ? "Overdue" : "Upcoming"}
                      </div>
                    </td>
                    <td className="p-4 text-sm">{assignment._count.results} submitted</td>
                    <td className="p-4">
                      <Link href={`/dashboard/assignments/${assignment.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} assignments
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
