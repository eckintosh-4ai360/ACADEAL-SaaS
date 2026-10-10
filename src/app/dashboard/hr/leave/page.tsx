import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LeaveClientPage } from "./LeaveClientPage";

export default async function LeavePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; page?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1"));
  const pageSize = 15;

  const statusFilter =
    params.status === "PENDING" ||
    params.status === "APPROVED" ||
    params.status === "REJECTED"
      ? (params.status as "PENDING" | "APPROVED" | "REJECTED")
      : undefined;

  const typeFilter =
    params.type === "ANNUAL" ||
    params.type === "SICK" ||
    params.type === "MATERNITY" ||
    params.type === "PATERNITY" ||
    params.type === "UNPAID" ||
    params.type === "EMERGENCY"
      ? (params.type as "ANNUAL" | "SICK" | "MATERNITY" | "PATERNITY" | "UNPAID" | "EMERGENCY")
      : undefined;

  const where = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(typeFilter ? { leaveType: typeFilter } : {}),
  };

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [requests, total, pendingCount, approvedThisMonth] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.leaveRequest.count({ where }),
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
    prisma.leaveRequest.count({
      where: { status: "APPROVED", reviewedAt: { gte: monthStart } },
    }),
  ]);

  // Staff list for "Submit Request" form
  let staffList: Array<{
    id: string;
    staffId: string;
    displayName: string;
    staffType: "ADMIN" | "TEACHER";
  }> = [];

  try {
    const staffRows = await prisma.staff.findMany({
      select: { id: true, staffId: true, name: true, surname: true, staffType: true },
      orderBy: { name: "asc" },
    });
    staffList = staffRows.map((s) => ({
      id: s.id,
      staffId: s.staffId,
      displayName: s.surname ? `${s.name} ${s.surname}` : s.name,
      staffType: s.staffType as "ADMIN" | "TEACHER",
    }));
  } catch {
    const [teachers, admins] = await Promise.all([
      prisma.teacher.findMany({
        select: { id: true, staffId: true, name: true, surname: true },
        orderBy: { name: "asc" },
      }),
      prisma.admin.findMany({
        select: { id: true, staffId: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);
    staffList = [
      ...teachers.map((t) => ({
        id: t.id,
        staffId: t.staffId,
        displayName: t.surname ? `${t.name} ${t.surname}` : t.name,
        staffType: "TEACHER" as const,
      })),
      ...admins.map((a) => ({
        id: a.id,
        staffId: a.staffId,
        displayName: a.name,
        staffType: "ADMIN" as const,
      })),
    ];
  }

  return (
    <LeaveClientPage
      requests={requests.map((r) => ({
        ...r,
        startDate: r.startDate.toISOString(),
        endDate: r.endDate.toISOString(),
        createdAt: r.createdAt.toISOString(),
        reviewedAt: r.reviewedAt?.toISOString() ?? null,
      }))}
      total={total}
      page={page}
      pageSize={pageSize}
      pendingCount={pendingCount}
      approvedThisMonth={approvedThisMonth}
      staffList={staffList}
      activeStatus={statusFilter}
      activeType={typeFilter}
    />
  );
}
