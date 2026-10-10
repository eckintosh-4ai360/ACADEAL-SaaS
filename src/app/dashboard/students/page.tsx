import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AddStudentButton } from "@/components/forms/AddStudentButton";
import { SearchBar } from "@/components/ui/search-bar";
import { FilterSelect } from "@/components/ui/filter-select";
import { StudentsTableClient } from "@/components/tables/StudentsTableClient";
import { ExportButton } from "@/components/ui/export-button";
import { GRADE_NAMES } from "@/lib/utils";
import { sortClassesByGrade } from "@/lib/class-management";
import { getSystemSettings } from "@/lib/settings";
import { PageSizeSelector } from "@/components/ui/PageSizeSelector";
import { SendCredentialsBulkButton } from "@/components/ui/SendCredentialsBulkButton";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { getCurrentTeacherPermissions } from "@/lib/user-permissions-server";
import { getActiveStudentWhere } from "@/lib/active-students";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; gradeId?: string; classId?: string; pageSize?: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/sign-in");
  }

  const userRole = session.user.role;
  const canManage = userRole === "admin";
  const canRecordStudents =
    userRole === "admin" ||
    (userRole === "teacher" &&
      (await getCurrentTeacherPermissions(session.user)).recordStudents);

  const resolvedParams = await searchParams;
  const page = Number(resolvedParams.page) || 1;
  const search = resolvedParams.search || "";
  const gradeId = resolvedParams.gradeId;
  const classId = resolvedParams.classId;
  const pageSize = Number(resolvedParams.pageSize) || 15;

  const where: Prisma.StudentWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { surname: { contains: search, mode: "insensitive" } },
      { username: { contains: search, mode: "insensitive" } },
      { studentId: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (gradeId) {
    where.gradeId = Number(gradeId);
  }

  if (classId) {
    where.classId = Number(classId);
  }

  const activeStudentWhere = await getActiveStudentWhere();
  const activeStudentsWhere: Prisma.StudentWhereInput = {
    AND: [where, activeStudentWhere],
  };

  const [students, total, parents, classRecords, grades, settings, exportStudents] = await Promise.all([
    prisma.student.findMany({
      where: activeStudentsWhere,
      include: {
        class: true,
        grade: true,
        parent: true,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.student.count({ where: activeStudentsWhere }),
    prisma.parent.findMany({
      select: { id: true, name: true, surname: true, parentUserId: true },
      orderBy: { name: "asc" },
    }),
    prisma.class.findMany({
      select: { id: true, name: true, gradeId: true },
      orderBy: { name: "asc" },
    }),
    prisma.grade.findMany({
      select: { id: true, level: true },
      orderBy: { level: "asc" },
    }),
    getSystemSettings(),
    prisma.student.findMany({
      where: activeStudentsWhere,
      include: {
        class: true,
        grade: true,
        parent: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const classes = sortClassesByGrade(classRecords, grades);

  const totalPages = Math.ceil(total / pageSize);

  const getPageUrl = (p: number) => {
    const urlParams = new URLSearchParams();
    if (search) urlParams.set("search", search);
    if (gradeId) urlParams.set("gradeId", gradeId);
    if (classId) urlParams.set("classId", classId);
    if (pageSize !== 15) urlParams.set("pageSize", pageSize.toString());
    urlParams.set("page", p.toString());
    return `/dashboard/students?${urlParams.toString()}`;
  };

  const studentIdInitials =
    typeof (settings as { studentIdInitials?: unknown } | null)?.studentIdInitials === "string"
      ? ((settings as { studentIdInitials?: string } | null)?.studentIdInitials || "STU")
      : "STU";
  const exportDate = new Date().toISOString().split("T")[0];
  const studentExportData = exportStudents.map((student) => ({
    studentId: student.studentId || "",
    firstName: student.name,
    lastName: student.surname,
    otherNames: student.otherNames || "",
    sex: student.sex,
    birthday: student.birthday ? new Date(student.birthday).toISOString().split("T")[0] : "",
    grade: GRADE_NAMES[student.grade.level] || `Grade ${student.grade.level}`,
    class: student.class.name,
    residencyStatus: student.residencyStatus || "",
    house: student.house || "",
    parentName: student.parent ? `${student.parent.name} ${student.parent.surname}`.trim() : "",
    parentPhone: student.parent?.phone || "",
    email: student.email || "",
    phone: student.phone || "",
    guardianName: student.guardianName || "",
    contactNumber: student.contactNumber || "",
    occupation: student.occupation || "",
    nhisNumber: student.nhisNumber || "",
    admissionDate: student.admissionDate ? new Date(student.admissionDate).toISOString().split("T")[0] : "",
    emergencyContact: student.emergencyContact || "",
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Students</h1>
          <p className="text-gray-500 mt-1">Manage all students in the system</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            data={studentExportData}
            filename={`students_${exportDate}`}
            fieldsToRemove={[]}
          />
          <SendCredentialsBulkButton />
          {canRecordStudents && (
            <AddStudentButton
              parents={parents}
              classes={classes}
              grades={grades}
              studentIdInitials={studentIdInitials}
              canImport={canManage}
            />
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <SearchBar placeholder="Search students by name, username, student ID, or email..." />
        <FilterSelect
          options={grades.map((g) => ({ 
            label: GRADE_NAMES[g.level] || `Grade ${g.level}`, 
            value: g.id.toString() 
          }))}
          paramName="gradeId"
          placeholder="All Grades"
        />
        <FilterSelect
          options={classes
            .filter((c) => !gradeId || Number(c.gradeId) === Number(gradeId))
            .map((c) => ({ label: c.name, value: c.id.toString() }))}
          paramName="classId"
          placeholder="All Classes"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>All Students ({total})</CardTitle>
          <PageSizeSelector />
        </CardHeader>
        <CardContent>
          <StudentsTableClient
            students={students}
            grades={grades}
            classes={classes}
            parents={parents}
            userRole={userRole}
            canManage={canManage}
          />

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-600">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} students
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
