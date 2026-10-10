import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AddTeacherButton } from "@/components/forms/AddTeacherButton";
import { SearchBar } from "@/components/ui/search-bar";
import { FilterSelect } from "@/components/ui/filter-select";
import { TeacherTableRow } from "@/components/tables/TeacherTableRow";
import { PageSizeSelector } from "@/components/ui/PageSizeSelector";
import { ExportButton } from "@/components/ui/export-button";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

export default async function TeachersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; subjectId?: string; pageSize?: string }>;
}) {
  //* RBAC — admin only
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const pageSize = parseInt(params.pageSize || "15");
  const search = params.search || "";
  const subjectId = params.subjectId || "";

  const where: Prisma.TeacherWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { surname: { contains: search, mode: "insensitive" } },
      { staffId: { contains: search, mode: "insensitive" } },
      { username: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (subjectId) {
    where.subjects = {
      some: {
        id: parseInt(subjectId),
      },
    };
  }

  const [teachers, total, subjects, exportTeachers] = await Promise.all([
    prisma.teacher.findMany({
      where,
      include: {
        subjects: true,
        _count: {
          select: {
            lessons: true,
            classes: true,
          },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.teacher.count({ where }),
    prisma.subject.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.teacher.findMany({
      where,
      include: {
        subjects: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            lessons: true,
            classes: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize);
  const exportDate = new Date().toISOString().split("T")[0];
  const teacherExportData = exportTeachers.map((teacher) => ({
    staffId: teacher.staffId,
    username: teacher.username,
    firstName: teacher.name,
    lastName: teacher.surname,
    email: teacher.email || "",
    phone: teacher.phone || "",
    sex: teacher.sex,
    birthday: teacher.birthday ? new Date(teacher.birthday).toISOString().split("T")[0] : "",
    address: teacher.address,
    subjects: teacher.subjects.map((subject) => subject.name).join(", "),
    subjectIds: teacher.subjects.map((subject) => subject.id).join(", "),
    classesAssigned: teacher._count.classes,
    lessonsAssigned: teacher._count.lessons,
  }));

  const getPageUrl = (p: number) => {
    const urlParams = new URLSearchParams();
    if (search) urlParams.set("search", search);
    if (subjectId) urlParams.set("subjectId", subjectId);
    if (pageSize !== 15) urlParams.set("pageSize", pageSize.toString());
    urlParams.set("page", p.toString());
    return `/dashboard/teachers?${urlParams.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teachers</h1>
          <p className="text-gray-500 mt-1">Manage all teachers in the system</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            data={teacherExportData}
            filename={`teachers_${exportDate}`}
            fieldsToRemove={[]}
          />
          <AddTeacherButton subjects={subjects} />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <SearchBar placeholder="Search teachers by name, teacher ID, username, or email..." />
        <FilterSelect
          options={subjects.map((s) => ({ label: s.name, value: s.id.toString() }))}
          paramName="subjectId"
          placeholder="All Subjects"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>All Teachers ({total})</CardTitle>
          <PageSizeSelector />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Teacher</th>
                  <th className="text-left p-4 font-medium">Teacher ID</th>
                  <th className="text-left p-4 font-medium">Subjects</th>
                  <th className="text-left p-4 font-medium">Classes</th>
                  <th className="text-left p-4 font-medium">Lessons</th>
                  <th className="text-left p-4 font-medium">Contact</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher) => (
                  <TeacherTableRow 
                    key={teacher.id} 
                    teacher={{
                      ...teacher,
                      subjects: teacher.subjects.map(s => ({ id: s.id, name: s.name })),
                      _count: teacher._count,
                    }}
                    allSubjects={subjects}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center space-x-2">
                {page > 1 && (
                  <Link href={getPageUrl(page - 1)}>
                    <Button variant="outline" size="sm">Previous</Button>
                  </Link>
                )}
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
