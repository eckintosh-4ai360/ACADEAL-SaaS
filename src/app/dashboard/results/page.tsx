import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSizeSelector } from "@/components/ui/PageSizeSelector";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SearchBar } from "@/components/ui/search-bar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; search?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role || "student";
  const userId = session?.user?.id || "";

  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const pageSize = parseInt(params.pageSize || "15");
  const search = params.search?.trim() || "";
  const resultWhere: Prisma.ResultWhereInput = {
    ...(role === "student"
      ? { studentId: userId }
      : role === "parent"
        ? { student: { parentId: userId } }
        : {}),
    ...(search
      ? {
          OR: [
            { student: { name: { contains: search, mode: "insensitive" } } },
            { student: { surname: { contains: search, mode: "insensitive" } } },
            { student: { studentId: { contains: search, mode: "insensitive" } } },
            { student: { class: { name: { contains: search, mode: "insensitive" } } } },
            { exam: { is: { title: { contains: search, mode: "insensitive" } } } },
            {
              exam: {
                is: {
                  lesson: { subject: { name: { contains: search, mode: "insensitive" } } },
                },
              },
            },
            { assignment: { is: { title: { contains: search, mode: "insensitive" } } } },
            {
              assignment: {
                is: {
                  lesson: { subject: { name: { contains: search, mode: "insensitive" } } },
                },
              },
            },
          ],
        }
      : {}),
  };

  const [results, total] = await Promise.all([
    prisma.result.findMany({
      where: resultWhere,
      include: {
        student: {
          include: {
            class: true,
          },
        },
        exam: {
          include: {
            lesson: {
              include: {
                subject: true,
              },
            },
            questions: {
              select: { points: true },
            },
          },
        },
        assignment: {
          include: {
            lesson: {
              include: {
                subject: true,
              },
            },
            questions: {
              select: { points: true },
            },
          },
        },
      },
      orderBy: { id: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.result.count({ where: resultWhere }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  const getPageUrl = (p: number) => {
    const urlParams = new URLSearchParams();
    if (pageSize !== 15) urlParams.set("pageSize", pageSize.toString());
    if (search) urlParams.set("search", search);
    urlParams.set("page", p.toString());
    return `/dashboard/results?${urlParams.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Results</h1>
        <p className="text-muted-foreground mt-1">View all exam and assignment results</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>All Results ({total})</CardTitle>
          <div className="flex flex-wrap items-center gap-3">
            <SearchBar placeholder="Search results by student, class, subject, or title..." />
            <PageSizeSelector />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Student</th>
                  <th className="text-left p-4 font-medium">Class</th>
                  <th className="text-left p-4 font-medium">Subject</th>
                  <th className="text-left p-4 font-medium">Type</th>
                  <th className="text-left p-4 font-medium">Title</th>
                  <th className="text-left p-4 font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="p-4">
                      <div className="font-medium">
                        {result.student.name} {result.student.surname}
                      </div>
                    </td>
                    <td className="p-4 text-sm">{result.student.class.name}</td>
                    <td className="p-4 text-sm">
                      {result.exam?.lesson.subject.name || result.assignment?.lesson.subject.name}
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded ${
                        result.exam ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                      }`}>
                        {result.exam ? "Exam" : "Assignment"}
                      </span>
                    </td>
                    <td className="p-4 text-sm">
                      {result.exam?.title || result.assignment?.title}
                    </td>
                    <td className="p-4">
                      {(() => {
                        const questions = result.assignment?.questions ?? result.exam?.questions ?? [];
                        const computedMax = questions.reduce((sum: number, q: { points: number }) => sum + q.points, 0);
                        // Fall back to 100 only for legacy exams/assignments with no questions attached yet
                        const maxPoints = computedMax > 0 ? computedMax : 100;
                        const pct = maxPoints > 0 ? (result.score / maxPoints) * 100 : 0;
                        return (
                          <span className={`font-semibold ${
                            pct >= 90 ? "text-green-600" :
                            pct >= 70 ? "text-blue-600" :
                            pct >= 50 ? "text-orange-600" :
                            "text-red-600"
                          }`}>
                            {result.score}/{maxPoints}
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({pct.toFixed(1)}%)
                            </span>
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} results
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
