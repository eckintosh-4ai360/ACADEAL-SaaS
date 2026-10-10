import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppraisalsClientPage } from "./AppraisalsClientPage";

export default async function AppraisalsPage({
  searchParams,
}: {
  searchParams: Promise<{ cycleId?: string; status?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const activeCycleId = params.cycleId ? parseInt(params.cycleId) : null;
  const statusFilter =
    params.status === "OPEN" || params.status === "CLOSED"
      ? (params.status as "OPEN" | "CLOSED")
      : undefined;

  const [cycles, staffList] = await Promise.all([
    prisma.appraisalCycle.findMany({
      include: { _count: { select: { records: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    // Staff for "Add Record" form
    prisma.staff.findMany({
      select: { id: true, staffId: true, name: true, surname: true, staffType: true },
      orderBy: { name: "asc" },
    }).catch(() => []),
  ]);

  let resolvedStaff = staffList as Array<{
    id: string;
    staffId: string;
    name: string;
    surname: string | null;
    staffType: string;
  }>;

  if (resolvedStaff.length === 0) {
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
    resolvedStaff = [
      ...teachers.map((t) => ({ ...t, staffType: "TEACHER" as const })),
      ...admins.map((a) => ({ ...a, surname: null, staffType: "ADMIN" as const })),
    ];
  }

  // If a cycle is selected, fetch its records
  let cycleRecords: Array<{
    id: number;
    staffId: string;
    staffName: string;
    staffType: string;
    score: number;
    recommendation: string;
    comments: string | null;
    reviewerName: string;
    createdAt: string;
  }> = [];

  if (activeCycleId) {
    const records = await prisma.appraisalRecord.findMany({
      where: { cycleId: activeCycleId },
      orderBy: { staffName: "asc" },
    });
    cycleRecords = records.map((r) => ({
      id: r.id,
      staffId: r.staffId,
      staffName: r.staffName,
      staffType: r.staffType,
      score: r.score,
      recommendation: r.recommendation,
      comments: r.comments,
      reviewerName: r.reviewerName,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  const filteredCycles = statusFilter
    ? cycles.filter((c) => c.status === statusFilter)
    : cycles;

  return (
    <AppraisalsClientPage
      cycles={filteredCycles.map((c) => ({
        id: c.id,
        title: c.title,
        period: c.period,
        status: c.status,
        startDate: c.startDate.toISOString(),
        endDate: c.endDate.toISOString(),
        createdByName: c.createdByName,
        recordCount: c._count.records,
        closedAt: c.closedAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
      }))}
      cycleRecords={cycleRecords}
      activeCycleId={activeCycleId}
      staffList={resolvedStaff.map((s) => ({
        id: s.id,
        staffId: s.staffId,
        displayName: s.surname ? `${s.name} ${s.surname}` : s.name,
        staffType: s.staffType as "ADMIN" | "TEACHER",
      }))}
      activeStatus={statusFilter}
    />
  );
}
