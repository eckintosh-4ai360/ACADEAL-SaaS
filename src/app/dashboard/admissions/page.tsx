import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { format, isSameDay, isValid, parse, startOfDay, endOfDay } from "date-fns";
import { CalendarDays, GraduationCap, UserPlus, Users } from "lucide-react";
import type { Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getCurrentTeacherPermissions } from "@/lib/user-permissions-server";
import { GRADE_NAMES } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExportButton } from "@/components/ui/export-button";

export const dynamic = "force-dynamic";

type AdmissionsSearchParams = {
  date?: string | string[];
  from?: string | string[];
  to?: string | string[];
};

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseDateInput(value: string | undefined) {
  if (!value) return null;

  const parsed = parse(value, "yyyy-MM-dd", new Date());
  return isValid(parsed) && format(parsed, "yyyy-MM-dd") === value ? parsed : null;
}

export default async function AdmissionsPage({
  searchParams,
}: {
  searchParams: Promise<AdmissionsSearchParams>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;
  if (role !== "admin" && role !== "teacher") {
    redirect("/dashboard");
  }

  if (role === "teacher") {
    const permissions = await getCurrentTeacherPermissions(session.user);
    if (!permissions.admissions) {
      redirect("/dashboard");
    }
  }

  const params = await searchParams;
  const today = startOfDay(new Date());
  const todayInput = format(today, "yyyy-MM-dd");
  const requestedDate = parseDateInput(getSearchParam(params.date));
  const requestedFrom = parseDateInput(getSearchParam(params.from));
  const requestedTo = parseDateInput(getSearchParam(params.to));

  const initialFrom = requestedDate ?? requestedFrom ?? requestedTo ?? today;
  const initialTo = requestedDate ?? requestedTo ?? requestedFrom ?? today;
  const rangeStart = startOfDay(initialFrom <= initialTo ? initialFrom : initialTo);
  const rangeEnd = endOfDay(initialFrom <= initialTo ? initialTo : initialFrom);
  const fromInput = format(rangeStart, "yyyy-MM-dd");
  const toInput = format(rangeEnd, "yyyy-MM-dd");

  const where: Prisma.StudentWhereInput = {
    admissionDate: {
      gte: rangeStart,
      lte: rangeEnd,
    },
  };

  const [admissions, total] = await Promise.all([
    prisma.student.findMany({
      where,
      select: {
        id: true,
        name: true,
        surname: true,
        otherNames: true,
        studentId: true,
        admissionDate: true,
        email: true,
        phone: true,
        class: { select: { name: true } },
        grade: { select: { level: true } },
        parent: { select: { name: true, surname: true, phone: true } },
      },
      orderBy: [{ admissionDate: "desc" }, { surname: "asc" }, { name: "asc" }],
    }),
    prisma.student.count({ where }),
  ]);

  const sameDate = isSameDay(rangeStart, rangeEnd);
  const rangeLabel = sameDate
    ? format(rangeStart, "MMMM d, yyyy")
    : `${format(rangeStart, "MMM d, yyyy")} – ${format(rangeEnd, "MMM d, yyyy")}`;
  const exportDate = format(new Date(), "yyyy-MM-dd");
  const exportData = admissions.map((student) => ({
    student: `${student.name} ${student.otherNames ? `${student.otherNames} ` : ""}${student.surname}`,
    studentId: student.studentId,
    admissionDate: student.admissionDate ? format(student.admissionDate, "yyyy-MM-dd") : "",
    class: student.class.name,
    grade: GRADE_NAMES[student.grade.level] || `Grade ${student.grade.level}`,
    parent: student.parent ? `${student.parent.name} ${student.parent.surname}` : "",
    contact: student.parent?.phone || student.phone || student.email || "",
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Student Admissions</h1>
              <p className="mt-1 text-muted-foreground">Students admitted during the selected period</p>
            </div>
          </div>
        </div>
        <ExportButton
          data={exportData}
          filename={`student_admissions_${exportDate}`}
          fieldsToRemove={[]}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-violet-600" />
            Filter admissions
          </CardTitle>
          <CardDescription>
            Select the same date in both fields for one day, or choose a start and end date for a range.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form method="get" className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] md:items-end">
            <div className="space-y-2">
              <label htmlFor="admissions-from" className="text-sm font-medium">From</label>
              <input
                id="admissions-from"
                name="from"
                type="date"
                defaultValue={fromInput || todayInput}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="admissions-to" className="text-sm font-medium">To</label>
              <input
                id="admissions-to"
                name="to"
                type="date"
                defaultValue={toInput || todayInput}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <Button type="submit" className="w-full md:w-auto">Apply filter</Button>
            <Button asChild type="button" variant="outline" className="w-full md:w-auto">
              <Link href="/dashboard/admissions">Today</Link>
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Admissions found</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Showing</p>
              <p className="text-lg font-semibold">{rangeLabel}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Admissions for {rangeLabel}</CardTitle>
          <CardDescription>
            Only students with an admission date in this period are shown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="p-4 text-left text-sm font-medium">Student</th>
                  <th className="p-4 text-left text-sm font-medium">Student ID</th>
                  <th className="p-4 text-left text-sm font-medium">Admission date</th>
                  <th className="p-4 text-left text-sm font-medium">Class</th>
                  <th className="p-4 text-left text-sm font-medium">Grade</th>
                  <th className="p-4 text-left text-sm font-medium">Parent / contact</th>
                  <th className="p-4 text-left text-sm font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {admissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-muted-foreground">
                      No admissions were recorded for this period.
                    </td>
                  </tr>
                ) : (
                  admissions.map((student) => (
                    <tr key={student.id} className="border-b transition-colors last:border-0 hover:bg-muted/30">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                            {student.name.charAt(0)}{student.surname.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{student.name} {student.otherNames ? `${student.otherNames} ` : ""}{student.surname}</p>
                            <p className="text-xs text-muted-foreground">{student.email || student.phone || "No contact recorded"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4"><Badge variant="outline">{student.studentId || "PENDING"}</Badge></td>
                      <td className="p-4 text-sm">{student.admissionDate ? format(student.admissionDate, "MMM d, yyyy") : "—"}</td>
                      <td className="p-4 text-sm">{student.class.name}</td>
                      <td className="p-4 text-sm">{GRADE_NAMES[student.grade.level] || `Grade ${student.grade.level}`}</td>
                      <td className="p-4 text-sm">
                        <div>{student.parent ? `${student.parent.name} ${student.parent.surname}` : "No parent linked"}</div>
                        <div className="text-xs text-muted-foreground">{student.parent?.phone || student.phone || "—"}</div>
                      </td>
                      <td className="p-4">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/dashboard/students/${student.id}`}>View profile</Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
