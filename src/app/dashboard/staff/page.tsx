import type { AdminRole, Prisma, StaffType } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  BarChart3,
  Calendar,
  CheckCircle,
  GraduationCap,
  MessageSquare,
  ShieldCheck,
  Users,
} from "lucide-react";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isMissingDatabaseObjectError } from "@/lib/prisma-errors";
import {
  hasAnyFeeAccess,
  normalizeUserPermissions,
} from "@/lib/user-permissions";
import { getSchoolAnalyticsSummary } from "@/lib/analytics";
import { AddAdminButton } from "@/components/forms/AddAdminButton";
import { AddTeacherButton } from "@/components/forms/AddTeacherButton";
import { DashboardMetricCard } from "@/components/DashboardMetricCard";
import { SearchBar } from "@/components/ui/search-bar";
import { FilterSelect } from "@/components/ui/filter-select";
import { PageSizeSelector } from "@/components/ui/PageSizeSelector";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type StaffDirectoryEntry = {
  id: string;
  staffId: string;
  username: string;
  name: string;
  surname: string | null;
  email: string | null;
  phone: string | null;
  img: string | null;
  createdAt: Date;
  staffType: "ADMIN" | "TEACHER";
  adminRole: AdminRole | null;
  permissions: unknown;
  subjectsHandled: string[];
  classesHandled: number;
  lessonsHandled: number;
};

type StaffMetrics = {
  totalStaff: number;
  totalTeachers: number;
  totalAdmins: number;
  payrollEnabled: number;
  salaryAdvanceEnabled: number;
  feeAccessEnabled: number;
  directContactCount: number;
};

type StaffDirectoryData = {
  entries: StaffDirectoryEntry[];
  total: number;
  metrics: StaffMetrics;
  unifiedMode: boolean;
};

const STAFF_TYPE_OPTIONS: Array<{ label: string; value: StaffType }> = [
  { label: "Admins", value: "ADMIN" },
  { label: "Teachers", value: "TEACHER" },
];

const ADMIN_ROLE_OPTIONS: Array<{ label: string; value: AdminRole }> = [
  { label: "Super Admin", value: "SUPER_ADMIN" },
  { label: "Admin", value: "ADMIN" },
];

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getStaffTypeLabel(staffType: "ADMIN" | "TEACHER") {
  return staffType === "ADMIN" ? "Admin" : "Teacher";
}

function getAdminRoleLabel(adminRole: AdminRole | null) {
  if (adminRole === "SUPER_ADMIN") {
    return "Super Admin";
  }

  if (adminRole === "ADMIN") {
    return "Admin";
  }

  return null;
}

function getInitials(name: string, surname?: string | null) {
  return `${name.charAt(0)}${surname?.charAt(0) ?? ""}`.toUpperCase();
}

function buildDirectoryUrl(
  params: URLSearchParams,
  nextPage: number
) {
  const nextParams = new URLSearchParams(params);
  nextParams.set("page", nextPage.toString());
  return `/dashboard/staff?${nextParams.toString()}`;
}

function buildSearchUrl(basePath: string, staffId: string) {
  const params = new URLSearchParams({ search: staffId });
  return `${basePath}?${params.toString()}`;
}

function mapStaffMetrics(
  records: Array<{
    staffType: "ADMIN" | "TEACHER";
    permissions: unknown;
    email: string | null;
    phone: string | null;
  }>
): StaffMetrics {
  return records.reduce<StaffMetrics>(
    (acc, record) => {
      const permissions = normalizeUserPermissions(record.permissions);

      acc.totalStaff += 1;
      if (record.staffType === "ADMIN") {
        acc.totalAdmins += 1;
      } else {
        acc.totalTeachers += 1;
      }
      if (permissions.salary) {
        acc.payrollEnabled += 1;
      }
      if (permissions.salaryAdvance) {
        acc.salaryAdvanceEnabled += 1;
      }
      if (hasAnyFeeAccess(permissions)) {
        acc.feeAccessEnabled += 1;
      }
      if (record.email || record.phone) {
        acc.directContactCount += 1;
      }

      return acc;
    },
    {
      totalStaff: 0,
      totalTeachers: 0,
      totalAdmins: 0,
      payrollEnabled: 0,
      salaryAdvanceEnabled: 0,
      feeAccessEnabled: 0,
      directContactCount: 0,
    }
  );
}

async function loadStaffDirectoryData(params: {
  search: string;
  staffType: StaffType | "";
  adminRole: AdminRole | "";
  page: number;
  pageSize: number;
}): Promise<StaffDirectoryData> {
  const { search, staffType, adminRole, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  try {
    const where: Prisma.StaffWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { surname: { contains: search, mode: "insensitive" } },
        { staffId: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    if (staffType) {
      where.staffType = staffType;
    }

    if (adminRole) {
      where.adminRole = adminRole;
      if (!staffType) {
        where.staffType = "ADMIN";
      }
    }

    const [entries, total, metricRecords] = await Promise.all([
      prisma.staff.findMany({
        where,
        select: {
          id: true,
          staffId: true,
          username: true,
          name: true,
          surname: true,
          email: true,
          phone: true,
          img: true,
          createdAt: true,
          staffType: true,
          adminRole: true,
          permissions: true,
          teacher: {
            select: {
              subjects: {
                select: {
                  name: true,
                },
                orderBy: {
                  name: "asc",
                },
              },
              _count: {
                select: {
                  classes: true,
                  lessons: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: pageSize,
      }),
      prisma.staff.count({ where }),
      prisma.staff.findMany({
        select: {
          staffType: true,
          permissions: true,
          email: true,
          phone: true,
        },
      }),
    ]);

    return {
      entries: entries.map((entry) => ({
        id: entry.id,
        staffId: entry.staffId,
        username: entry.username,
        name: entry.name,
        surname: entry.surname,
        email: entry.email,
        phone: entry.phone,
        img: entry.img,
        createdAt: entry.createdAt,
        staffType: entry.staffType,
        adminRole: entry.adminRole,
        permissions: entry.permissions,
        subjectsHandled: entry.teacher?.subjects.map((subject) => subject.name) ?? [],
        classesHandled: entry.teacher?._count.classes ?? 0,
        lessonsHandled: entry.teacher?._count.lessons ?? 0,
      })),
      total,
      metrics: mapStaffMetrics(metricRecords),
      unifiedMode: true,
    };
  } catch (error) {
    if (!isMissingDatabaseObjectError(error)) {
      throw error;
    }
  }

  const adminWhere: Prisma.AdminWhereInput = {};
  const teacherWhere: Prisma.TeacherWhereInput = {};

  if (search) {
    adminWhere.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { staffId: { contains: search, mode: "insensitive" } },
      { username: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];

    teacherWhere.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { surname: { contains: search, mode: "insensitive" } },
      { staffId: { contains: search, mode: "insensitive" } },
      { username: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }

  if (adminRole) {
    adminWhere.role = adminRole;
  }

  const includeAdmins = !staffType || staffType === "ADMIN";
  const includeTeachers =
    (!staffType || staffType === "TEACHER") && !adminRole;

  const [admins, teachers, adminMetricRecords, teacherMetricRecords] =
    await Promise.all([
      includeAdmins
        ? prisma.admin.findMany({
            where: adminWhere,
            select: {
              id: true,
              staffId: true,
              username: true,
              name: true,
              email: true,
              phone: true,
              img: true,
              role: true,
              permissions: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          })
        : Promise.resolve([]),
      includeTeachers
        ? prisma.teacher.findMany({
            where: teacherWhere,
            select: {
              id: true,
              staffId: true,
              username: true,
              name: true,
              surname: true,
              email: true,
              phone: true,
              img: true,
              permissions: true,
              createdAt: true,
              subjects: {
                select: {
                  name: true,
                },
                orderBy: {
                  name: "asc",
                },
              },
              _count: {
                select: {
                  classes: true,
                  lessons: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          })
        : Promise.resolve([]),
      prisma.admin.findMany({
        select: {
          email: true,
          phone: true,
          permissions: true,
        },
      }),
      prisma.teacher.findMany({
        select: {
          email: true,
          phone: true,
          permissions: true,
        },
      }),
    ]);

  const mergedEntries: StaffDirectoryEntry[] = [
    ...admins.map((admin) => ({
      id: admin.id,
      staffId: admin.staffId,
      username: admin.username,
      name: admin.name,
      surname: null,
      email: admin.email,
      phone: admin.phone,
      img: admin.img,
      createdAt: admin.createdAt,
      staffType: "ADMIN" as const,
      adminRole: admin.role,
      permissions: admin.permissions,
      subjectsHandled: [],
      classesHandled: 0,
      lessonsHandled: 0,
    })),
    ...teachers.map((teacher) => ({
      id: teacher.id,
      staffId: teacher.staffId,
      username: teacher.username,
      name: teacher.name,
      surname: teacher.surname,
      email: teacher.email,
      phone: teacher.phone,
      img: teacher.img,
      createdAt: teacher.createdAt,
      staffType: "TEACHER" as const,
      adminRole: null,
      permissions: teacher.permissions,
      subjectsHandled: teacher.subjects.map((subject) => subject.name),
      classesHandled: teacher._count.classes,
      lessonsHandled: teacher._count.lessons,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const metricRecords = [
    ...adminMetricRecords.map((admin) => ({
      staffType: "ADMIN" as const,
      permissions: admin.permissions,
      email: admin.email,
      phone: admin.phone,
    })),
    ...teacherMetricRecords.map((teacher) => ({
      staffType: "TEACHER" as const,
      permissions: teacher.permissions,
      email: teacher.email,
      phone: teacher.phone,
    })),
  ];

  return {
    entries: mergedEntries.slice(skip, skip + pageSize),
    total: mergedEntries.length,
    metrics: mapStaffMetrics(metricRecords),
    unifiedMode: false,
  };
}

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
    type?: string;
    adminRole?: string;
  }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const isSuperAdmin = session.user.adminRole === "SUPER_ADMIN";
  const params = await searchParams;
  const page = parsePositiveInt(params.page, 1);
  const pageSize = parsePositiveInt(params.pageSize, 15);
  const search = params.search?.trim() ?? "";
  const staffType =
    params.type === "ADMIN" || params.type === "TEACHER"
      ? params.type
      : "";
  const adminRole =
    params.adminRole === "ADMIN" || params.adminRole === "SUPER_ADMIN"
      ? params.adminRole
      : "";

  const [subjects, analytics, directoryData] = await Promise.all([
    prisma.subject.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    getSchoolAnalyticsSummary(),
    loadStaffDirectoryData({
      search,
      staffType,
      adminRole,
      page,
      pageSize,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(directoryData.total / pageSize));
  const currentParams = new URLSearchParams();

  if (search) {
    currentParams.set("search", search);
  }
  if (staffType) {
    currentParams.set("type", staffType);
  }
  if (adminRole) {
    currentParams.set("adminRole", adminRole);
  }
  if (pageSize !== 15) {
    currentParams.set("pageSize", pageSize.toString());
  }

  const teachersNeedingSupport = analytics.teacherMetrics
    .filter(
      (metric) =>
        metric.status === "Critical" || metric.status === "Watch"
    )
    .slice(0, 3);
  const topTeachers = [...analytics.teacherMetrics]
    .sort((a, b) => b.effectivenessScore - a.effectivenessScore)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-none shadow-[0_24px_70px_-48px_rgba(15,23,42,0.9)]">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-800 text-white">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className={
                      directoryData.unifiedMode
                        ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-50"
                        : "border-amber-300/30 bg-amber-400/15 text-amber-50"
                    }
                    variant="outline"
                  >
                    {directoryData.unifiedMode
                      ? "Unified staff profiles live"
                      : "Legacy sync mode"}
                  </Badge>
                  <Badge className="border-white/15 bg-white/10 text-white" variant="outline">
                    Staff &amp; HR Workspace
                  </Badge>
                </div>

                <div>
                  <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                    Staff &amp; HR Management
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm text-slate-200 sm:text-base">
                    Your shared staff directory is now visible in the dashboard.
                    This view brings admin records, teacher records, permissions,
                    responsibilities, and performance signals into one place.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-300">
                      Shared Profiles
                    </p>
                    <p className="mt-2 text-2xl font-black">
                      {directoryData.metrics.totalStaff}
                    </p>
                    <p className="mt-1 text-xs text-slate-200">
                      Visible across teaching and admin teams.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-300">
                      Performance Watchlist
                    </p>
                    <p className="mt-2 text-2xl font-black">
                      {analytics.kpis.teachersNeedingSupport}
                    </p>
                    <p className="mt-1 text-xs text-slate-200">
                      Teachers currently flagged for support.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-300">
                      HR Controls
                    </p>
                    <p className="mt-2 text-2xl font-black">
                      {directoryData.metrics.payrollEnabled}
                    </p>
                    <p className="mt-1 text-xs text-slate-200">
                      Staff with salary-related permissions enabled.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex w-full max-w-xl flex-col gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button asChild className="justify-between">
                    <Link href="/dashboard/analytics">
                      Performance Analytics
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  {isSuperAdmin ? (
                    <Button
                      asChild
                      variant="outline"
                      className="justify-between border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
                    >
                      <Link href="/dashboard/settings?tab=permissions">
                        Manage Permissions
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      asChild
                      variant="outline"
                      className="justify-between border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
                    >
                      <Link href="/dashboard/teachers">
                        Teacher Directory
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <AddTeacherButton subjects={subjects} />
                  {isSuperAdmin ? <AddAdminButton /> : null}
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-sm text-slate-200">
                  <p className="font-semibold text-white">HR modules — all live ✓</p>
                  <p className="mt-1">
                    Payroll processing, leave approvals, and staff appraisal cycles
                    are fully operational. Open the HR workspace to manage them.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href="/dashboard/hr" className="rounded-lg bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 transition-colors">
                      HR Overview
                    </Link>
                    <Link href="/dashboard/hr/payroll" className="rounded-lg bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 transition-colors">
                      Payroll
                    </Link>
                    <Link href="/dashboard/hr/leave" className="rounded-lg bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 transition-colors">
                      Leave
                    </Link>
                    <Link href="/dashboard/hr/appraisals" className="rounded-lg bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 transition-colors">
                      Appraisals
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <DashboardMetricCard
          title="Total Staff"
          value={directoryData.metrics.totalStaff.toString()}
          description="Combined teaching and administrative headcount."
          icon={Users}
          tone="emerald"
          badge="Directory"
          detail={`${directoryData.total} filtered`}
        />
        <DashboardMetricCard
          title="Teachers"
          value={directoryData.metrics.totalTeachers.toString()}
          description="Staff with classroom ownership, lessons, and subjects."
          icon={GraduationCap}
          tone="sky"
          badge="Teaching"
        />
        <DashboardMetricCard
          title="Admins"
          value={directoryData.metrics.totalAdmins.toString()}
          description="Operational leadership and system management staff."
          icon={ShieldCheck}
          tone="violet"
          badge="Operations"
        />
        <DashboardMetricCard
          title="Payroll Permissions"
          value={directoryData.metrics.payrollEnabled.toString()}
          description="Staff currently prepared for salary-related access."
          icon={Banknote}
          tone="amber"
          badge="Compensation"
          detail={`${directoryData.metrics.salaryAdvanceEnabled} advance-enabled`}
        />
        <DashboardMetricCard
          title="Direct Contacts"
          value={directoryData.metrics.directContactCount.toString()}
          description="Profiles with at least one live contact channel."
          icon={MessageSquare}
          tone="indigo"
          badge="Reachability"
        />
        <DashboardMetricCard
          title="Teachers Needing Support"
          value={analytics.kpis.teachersNeedingSupport.toString()}
          description="Pulled from the performance analytics watchlist."
          icon={AlertCircle}
          tone="rose"
          badge="Performance"
          detail={`${analytics.kpis.totalAssessments} recent assessments`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <Card className="border-border/70">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="flex items-center gap-2 text-xl">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              HR Foundation Coverage
            </CardTitle>
            <CardDescription>
              What the current Staff &amp; HR rollout already supports today.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
              <p className="text-sm font-semibold text-emerald-900">
                Unified staff records
              </p>
              <p className="mt-2 text-sm text-emerald-800">
                Admins and teachers now surface through one shared directory
                with the same identity, contact, and permission language.
              </p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4">
              <p className="text-sm font-semibold text-sky-900">
                Responsibilities tracking
              </p>
              <p className="mt-2 text-sm text-sky-800">
                Teacher assignments, class load, subject coverage, and admin
                role ownership are visible from a single staff view.
              </p>
            </div>
            <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
              <p className="text-sm font-semibold text-violet-900">
                Permission management
              </p>
              <p className="mt-2 text-sm text-violet-800">
                Salary, salary advance, messaging, and finance access controls
                remain connected to each staff profile.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
              <Link href="/dashboard/hr/payroll" className="group block">
                <p className="text-sm font-semibold text-emerald-900 group-hover:underline">
                  Payroll Processing
                </p>
                <p className="mt-2 text-sm text-emerald-800">
                  Create and manage monthly or term payroll runs — add salary entries, apply deductions, approve and mark as paid.
                </p>
                <p className="mt-2 text-xs font-semibold text-emerald-700 group-hover:underline">Open Payroll →</p>
              </Link>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4">
              <Link href="/dashboard/hr/leave" className="group block">
                <p className="text-sm font-semibold text-sky-900 group-hover:underline">
                  Leave Approval
                </p>
                <p className="mt-2 text-sm text-sky-800">
                  Submit and review staff leave requests across all leave types. Approve or reject with reviewer notes.
                </p>
                <p className="mt-2 text-xs font-semibold text-sky-700 group-hover:underline">Open Leave →</p>
              </Link>
            </div>
            <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
              <Link href="/dashboard/hr/appraisals" className="group block">
                <p className="text-sm font-semibold text-violet-900 group-hover:underline">
                  Staff Appraisals
                </p>
                <p className="mt-2 text-sm text-violet-800">
                  Create appraisal cycles, rate staff 1–5 stars with written comments and formal recommendations.
                </p>
                <p className="mt-2 text-xs font-semibold text-violet-700 group-hover:underline">Open Appraisals →</p>
              </Link>
            </div>

          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card className="border-border/70">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="flex items-center gap-2 text-xl">
                <BarChart3 className="h-5 w-5 text-rose-600" />
                Support Watchlist
              </CardTitle>
              <CardDescription>
                Teachers who currently need the most instructional support.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-6">
              {teachersNeedingSupport.length > 0 ? (
                teachersNeedingSupport.map((teacher) => (
                  <div
                    key={teacher.teacherId}
                    className="rounded-2xl border border-border/70 bg-background p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">{teacher.teacherName}</p>
                        <p className="text-sm text-muted-foreground">
                          {teacher.subjectsHandled.join(", ") || "No subjects assigned"}
                        </p>
                      </div>
                      <Badge
                        variant={
                          teacher.status === "Critical"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {teacher.status}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>Effectiveness {teacher.effectivenessScore}%</span>
                      <span>Pass rate {teacher.passRate}%</span>
                      <span>{teacher.classesHandled} classes</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                  No teachers are currently flagged for support in the analytics
                  window.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Calendar className="h-5 w-5 text-emerald-600" />
                Strongest Performers
              </CardTitle>
              <CardDescription>
                Staff members currently leading academic outcomes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-6">
              {topTeachers.map((teacher) => (
                <div
                  key={teacher.teacherId}
                  className="rounded-2xl border border-border/70 bg-background p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{teacher.teacherName}</p>
                      <p className="text-sm text-muted-foreground">
                        {teacher.subjectsHandled.join(", ") || "No subjects assigned"}
                      </p>
                    </div>
                    <Badge variant="default">{teacher.status}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>Effectiveness {teacher.effectivenessScore}%</span>
                    <span>Average score {teacher.averageScore}%</span>
                    <span>{teacher.studentsReached} students reached</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-border/70">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-2xl">Staff Directory</CardTitle>
              <CardDescription className="mt-1">
                Search across the unified staff workspace and jump back into the
                dedicated admin or teacher management flows when needed.
              </CardDescription>
            </div>
            <PageSizeSelector />
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <SearchBar placeholder="Search by name, staff ID, username, email, or phone..." />
            <FilterSelect
              options={STAFF_TYPE_OPTIONS}
              paramName="type"
              placeholder="All Staff Types"
            />
            <FilterSelect
              options={ADMIN_ROLE_OPTIONS}
              paramName="adminRole"
              placeholder="All Admin Roles"
            />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border/70">
            <table className="w-full min-w-[960px]">
              <thead className="bg-muted/30 text-left">
                <tr>
                  <th className="p-4 text-sm font-semibold">Staff</th>
                  <th className="p-4 text-sm font-semibold">Staff ID</th>
                  <th className="p-4 text-sm font-semibold">Type</th>
                  <th className="p-4 text-sm font-semibold">Responsibilities</th>
                  <th className="p-4 text-sm font-semibold">Permissions</th>
                  <th className="p-4 text-sm font-semibold">Contact</th>
                  <th className="p-4 text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {directoryData.entries.length > 0 ? (
                  directoryData.entries.map((entry) => {
                    const permissions = normalizeUserPermissions(entry.permissions);
                    const teacherManageUrl = buildSearchUrl(
                      "/dashboard/teachers",
                      entry.staffId
                    );
                    const adminManageUrl = buildSearchUrl(
                      "/dashboard/admins",
                      entry.staffId
                    );

                    return (
                      <tr
                        key={`${entry.staffType}-${entry.id}`}
                        className="border-t border-border/60 transition-colors hover:bg-muted/20"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {entry.img ? (
                              <div className="relative h-11 w-11 overflow-hidden rounded-full border border-border/70">
                                <Image
                                  src={entry.img}
                                  alt={`${entry.name} ${entry.surname ?? ""}`.trim()}
                                  fill
                                  sizes="44px"
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                                {getInitials(entry.name, entry.surname)}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold">
                                {entry.name}
                                {entry.surname ? ` ${entry.surname}` : ""}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                @{entry.username}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="font-mono text-sm font-semibold">
                              {entry.staffId}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Added {new Date(entry.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </td>
                        <td className="p-4 align-top">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">
                              {getStaffTypeLabel(entry.staffType)}
                            </Badge>
                            {entry.adminRole ? (
                              <Badge variant="secondary">
                                {getAdminRoleLabel(entry.adminRole)}
                              </Badge>
                            ) : null}
                          </div>
                        </td>
                        <td className="p-4 align-top">
                          {entry.staffType === "TEACHER" ? (
                            <div className="space-y-2 text-sm">
                              <p className="font-medium">
                                {entry.classesHandled} classes • {entry.lessonsHandled} lessons
                              </p>
                              <p className="text-muted-foreground">
                                {entry.subjectsHandled.length > 0
                                  ? entry.subjectsHandled.join(", ")
                                  : "No subjects assigned"}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2 text-sm">
                              <p className="font-medium">
                                {getAdminRoleLabel(entry.adminRole) ?? "Admin team"}
                              </p>
                              <p className="text-muted-foreground">
                                System oversight, staff permissions, and operational support.
                              </p>
                            </div>
                          )}
                        </td>
                        <td className="p-4 align-top">
                          <div className="flex flex-wrap gap-2">
                            {permissions.salary ? (
                              <Badge variant="outline">Salary</Badge>
                            ) : null}
                            {permissions.salaryAdvance ? (
                              <Badge variant="outline">Salary Advance</Badge>
                            ) : null}
                            {permissions.message ? (
                              <Badge variant="outline">Messaging</Badge>
                            ) : null}
                            {hasAnyFeeAccess(permissions) ? (
                              <Badge variant="outline">Finance Access</Badge>
                            ) : null}
                            {!permissions.salary &&
                            !permissions.salaryAdvance &&
                            !permissions.message &&
                            !hasAnyFeeAccess(permissions) ? (
                              <span className="text-sm text-muted-foreground">
                                Standard access
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="p-4 align-top text-sm text-muted-foreground">
                          <div>{entry.email || "No email"}</div>
                          <div>{entry.phone || "No phone"}</div>
                        </td>
                        <td className="p-4 align-top">
                          <div className="flex flex-wrap gap-2">
                            {entry.staffType === "TEACHER" || isSuperAdmin ? (
                              <Button asChild size="sm" variant="outline">
                                <Link
                                  href={
                                    entry.staffType === "TEACHER"
                                      ? teacherManageUrl
                                      : adminManageUrl
                                  }
                                >
                                  Manage Record
                                </Link>
                              </Button>
                            ) : (
                              <span className="self-center text-xs text-muted-foreground">
                                Super admin only
                              </span>
                            )}
                            {isSuperAdmin ? (
                              <Button asChild size="sm" variant="ghost">
                                <Link href="/dashboard/settings?tab=permissions">
                                  Permissions
                                </Link>
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-10 text-center text-sm text-muted-foreground"
                    >
                      No staff records matched the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {directoryData.total > pageSize ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                {page > 1 ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={buildDirectoryUrl(currentParams, page - 1)}>
                      Previous
                    </Link>
                  </Button>
                ) : null}
                {page < totalPages ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={buildDirectoryUrl(currentParams, page + 1)}>
                      Next
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
