import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { EditSchoolClassStructureButton } from "@/components/forms/EditSchoolClassStructureButton";
import { SearchBar } from "@/components/ui/search-bar";
import { FilterSelect } from "@/components/ui/filter-select";
import { ClassActions } from "@/components/tables/ClassActions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  detectConfiguredStreamCount,
  getGradeLabel,
  isStreamedGradeLevel,
  sortClassesByGrade,
} from "@/lib/class-management";
import { Prisma } from "@prisma/client";

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; gradeId?: string }>;
}) {
  //* RBAC — admin only
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const search = params.search || "";
  const gradeId = params.gradeId || "";

  const where: Prisma.ClassWhereInput = {};

  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }

  if (gradeId) {
    where.gradeId = parseInt(gradeId);
  }

  const [classRecords, allConfiguredClasses, grades] = await Promise.all([
    prisma.class.findMany({
      where,
      include: {
        grade: true,
        supervisor: true,
        _count: {
          select: {
            students: true,
            lessons: true,
          },
        },
      },
    }),
    prisma.class.findMany({
      select: {
        id: true,
        name: true,
        gradeId: true,
      },
    }),
    prisma.grade.findMany({
      select: { id: true, level: true },
      orderBy: { level: "asc" },
    }),
  ]);

  const classes = sortClassesByGrade(classRecords, grades);
  const streamLayout = detectConfiguredStreamCount(allConfiguredClasses, grades);
  const hasConfiguredClasses = allConfiguredClasses.length > 0;
  const hasInconsistentStreams = grades
    .filter((grade) => isStreamedGradeLevel(grade.level))
    .some((grade) => {
      const gradeClassCount = allConfiguredClasses.filter(
        (classItem) => classItem.gradeId === grade.id
      ).length;

      return (
        gradeClassCount > 0 &&
        gradeClassCount !== streamLayout.configuredStreamCount
      );
    });
  const gradeStructures = grades.map((grade) => {
    const gradeClasses = classes.filter((classItem) => classItem.gradeId === grade.id);

    return {
      id: grade.id,
      label: getGradeLabel(grade.level),
      classes: gradeClasses,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Classes</h1>
          <p className="text-gray-500 mt-1">
            Manage the school&apos;s class structure from Creche to JHS 3, with
            streams applied consistently from KG 1 upward.
          </p>
        </div>
        <EditSchoolClassStructureButton
          currentStreamCount={streamLayout.configuredStreamCount}
          hasConfiguredClasses={hasConfiguredClasses}
          hasInconsistentStreams={hasInconsistentStreams}
        />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">School Class Structure</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              Creche to JHS 3
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Creche, Nursery 1, and Nursery 2 remain single classes, while{" "}
              {streamLayout.configuredStreamCount} stream
              {streamLayout.configuredStreamCount === 1 ? "" : "s"} run from KG 1 to JHS 3.
            </p>
          </div>
          <div
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              hasInconsistentStreams
                ? "bg-amber-100 text-amber-900"
                : "bg-emerald-100 text-emerald-900"
            }`}
          >
            {hasInconsistentStreams ? "Needs normalization" : "Consistent layout"}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <SearchBar placeholder="Search classes by name..." />
        <FilterSelect
          options={grades.map((g) => ({ 
            label: getGradeLabel(g.level), 
            value: g.id.toString() 
          }))}
          paramName="gradeId"
          placeholder="All Grades"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Grade Structure Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {gradeStructures.map((grade) => (
            <div
              key={grade.id}
              className={`rounded-xl border p-4 ${
                grade.classes.length > 0
                  ? "border-emerald-200 bg-emerald-50/60"
                  : "border-dashed border-slate-200 bg-slate-50/80"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-900">{grade.label}</p>
                <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {grade.classes.length === 0
                    ? "Not configured"
                    : grade.classes.length === 1
                      ? "1 class"
                      : `${grade.classes.length} classes`}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                {grade.classes.length === 0
                  ? "No class has been created for this grade yet."
                  : grade.classes.map((classItem) => classItem.name).join(", ")}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((classItem) => (
          <Card key={classItem.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{classItem.name}</span>
                <span className="text-sm font-normal text-gray-500">
                  {getGradeLabel(classItem.grade.level)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Students:</span>
                <span className="font-medium">
                  {classItem._count.students}/{classItem.capacity}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Lessons:</span>
                <span className="font-medium">{classItem._count.lessons}</span>
              </div>
              {classItem.supervisor && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Supervisor:</span>
                  <span className="font-medium">
                    {classItem.supervisor.name} {classItem.supervisor.surname}
                  </span>
                </div>
              )}
              <div className="pt-3 flex gap-2">
                <Link href={`/dashboard/classes/${classItem.id}`} className="flex-1">
                  <Button variant="outline" className="w-full" size="sm">
                    View Details
                  </Button>
                </Link>
                <ClassActions classData={classItem} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

