import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PayrollClientPage } from "./PayrollClientPage";

export default async function PayrollPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const [runs, staffList] = await Promise.all([
    prisma.payrollRun.findMany({
      include: { _count: { select: { entries: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    // Unified staff from Staff table (falls back gracefully)
    prisma.staff.findMany({
      select: {
        id: true,
        staffId: true,
        name: true,
        surname: true,
        staffType: true,
      },
      orderBy: { name: "asc" },
    }).catch(() => []),
  ]);

  // If Staff table is empty or doesn't exist, merge from Teacher + Admin tables
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
      ...admins.map((a) => ({
        ...a,
        surname: null,
        staffType: "ADMIN" as const,
      })),
    ];
  }

  return (
    <PayrollClientPage
      initialRuns={runs.map((r) => ({
        ...r,
        totalGross: r.totalGross,
        totalNet: r.totalNet,
        entryCount: r._count.entries,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        approvedAt: r.approvedAt?.toISOString() ?? null,
        paidAt: r.paidAt?.toISOString() ?? null,
      }))}
      staffList={resolvedStaff.map((s) => ({
        id: s.id,
        staffId: s.staffId,
        displayName: s.surname ? `${s.name} ${s.surname}` : s.name,
        staffType: s.staffType as "ADMIN" | "TEACHER",
      }))}
    />
  );
}
