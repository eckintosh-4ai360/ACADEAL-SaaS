import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Banknote,
  CalendarCheck,
  Star,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default async function HRIndexPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    payrollSummary,
    leaveSummary,
    appraisalSummary,
    recentLeave,
    recentPayroll,
  ] = await Promise.all([
    // Payroll stats
    Promise.all([
      prisma.payrollRun.count({ where: { status: "DRAFT" } }),
      prisma.payrollRun.count({ where: { status: "APPROVED" } }),
      prisma.payrollRun.count({ where: { status: "PAID" } }),
      prisma.payrollRun.aggregate({ _sum: { totalNet: true }, where: { status: "PAID" } }),
    ]),
    // Leave stats
    Promise.all([
      prisma.leaveRequest.count({ where: { status: "PENDING" } }),
      prisma.leaveRequest.count({ where: { status: "APPROVED", reviewedAt: { gte: monthStart } } }),
      prisma.leaveRequest.count(),
    ]),
    // Appraisal stats
    Promise.all([
      prisma.appraisalCycle.count({ where: { status: "OPEN" } }),
      prisma.appraisalCycle.count({ where: { status: "CLOSED" } }),
      prisma.appraisalRecord.count(),
    ]),
    // Recent leave requests
    prisma.leaveRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        staffName: true,
        staffType: true,
        leaveType: true,
        startDate: true,
        endDate: true,
        totalDays: true,
        status: true,
      },
    }),
    // Recent payroll runs
    prisma.payrollRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { _count: { select: { entries: true } } },
    }),
  ]);

  const [draftRuns, approvedRuns, paidRuns, paidTotals] = payrollSummary;
  const [pendingLeave, approvedLeaveThisMonth, totalLeave] = leaveSummary;
  const [openCycles, closedCycles, totalReviews] = appraisalSummary;

  const LEAVE_TYPE_LABELS: Record<string, string> = {
    ANNUAL: "Annual", SICK: "Sick", MATERNITY: "Maternity",
    PATERNITY: "Paternity", UNPAID: "Unpaid", EMERGENCY: "Emergency",
  };

  const STATUS_COLORS: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800",
    APPROVED: "bg-emerald-100 text-emerald-800",
    REJECTED: "bg-red-100 text-red-700",
  };

  const PAYROLL_STATUS_COLORS: Record<string, string> = {
    DRAFT: "bg-amber-100 text-amber-800",
    APPROVED: "bg-sky-100 text-sky-800",
    PAID: "bg-emerald-100 text-emerald-800",
  };

  function fmt(amount: number) {
    return `GHS ${amount.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`;
  }

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-violet-900 p-8 text-white shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">
          Human Resources
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">
          HR Workspace Overview
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          All three HR modules are live — manage payroll runs, approve staff leave
          requests, and run formal appraisal cycles from a single workspace.
        </p>
      </div>

      {/* Module stat cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        {/* Payroll */}
        <Link href="/dashboard/hr/payroll" className="group block">
          <div className="h-full rounded-2xl border bg-card p-6 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="rounded-xl bg-indigo-100 p-3">
                <Banknote className="h-6 w-6 text-indigo-700" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
            <p className="mt-4 text-2xl font-black">{draftRuns + approvedRuns + paidRuns}</p>
            <p className="text-sm font-semibold">Payroll Runs</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">{draftRuns} Draft</span>
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-800">{approvedRuns} Approved</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">{paidRuns} Paid</span>
            </div>
            {(paidTotals._sum.totalNet ?? 0) > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                Total disbursed: <span className="font-semibold text-foreground">{fmt(paidTotals._sum.totalNet!)}</span>
              </p>
            )}
          </div>
        </Link>

        {/* Leave */}
        <Link href="/dashboard/hr/leave" className="group block">
          <div className="h-full rounded-2xl border bg-card p-6 shadow-sm transition-all hover:border-sky-300 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="rounded-xl bg-sky-100 p-3">
                <CalendarCheck className="h-6 w-6 text-sky-700" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
            <p className="mt-4 text-2xl font-black">{totalLeave}</p>
            <p className="text-sm font-semibold">Leave Requests</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">{pendingLeave} Pending</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">{approvedLeaveThisMonth} Approved this month</span>
            </div>
            {pendingLeave > 0 && (
              <p className="mt-3 flex items-center gap-1 text-xs text-amber-700">
                <AlertCircle className="h-3 w-3" />
                {pendingLeave} request{pendingLeave !== 1 ? "s" : ""} awaiting review
              </p>
            )}
          </div>
        </Link>

        {/* Appraisals */}
        <Link href="/dashboard/hr/appraisals" className="group block">
          <div className="h-full rounded-2xl border bg-card p-6 shadow-sm transition-all hover:border-violet-300 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="rounded-xl bg-violet-100 p-3">
                <Star className="h-6 w-6 text-violet-700" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
            <p className="mt-4 text-2xl font-black">{openCycles + closedCycles}</p>
            <p className="text-sm font-semibold">Appraisal Cycles</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">{openCycles} Open</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">{closedCycles} Closed</span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {totalReviews} total reviews completed
            </p>
          </div>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Leave Requests */}
        <div className="rounded-2xl border bg-card">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <h2 className="font-bold text-lg">Recent Leave Requests</h2>
              <p className="text-xs text-muted-foreground">Latest submissions across all staff</p>
            </div>
            <Link href="/dashboard/hr/leave" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y">
            {recentLeave.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                No leave requests yet.
              </div>
            ) : (
              recentLeave.map((req) => (
                <div key={req.id} className="flex items-center gap-4 px-6 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{req.staffName}</p>
                    <p className="text-xs text-muted-foreground">
                      {LEAVE_TYPE_LABELS[req.leaveType] ?? req.leaveType} ·{" "}
                      {req.totalDays} day{req.totalDays !== 1 ? "s" : ""} ·{" "}
                      {new Date(req.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[req.status] ?? "bg-muted text-muted-foreground"}`}>
                    {req.status}
                  </span>
                </div>
              ))
            )}
          </div>
          {pendingLeave > 0 && (
            <div className="border-t px-6 py-3">
              <Link href="/dashboard/hr/leave?status=PENDING" className="flex items-center gap-2 text-sm font-semibold text-amber-700 hover:underline">
                <Clock className="h-4 w-4" />
                Review {pendingLeave} pending request{pendingLeave !== 1 ? "s" : ""}
              </Link>
            </div>
          )}
        </div>

        {/* Recent Payroll Runs */}
        <div className="rounded-2xl border bg-card">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <h2 className="font-bold text-lg">Recent Payroll Runs</h2>
              <p className="text-xs text-muted-foreground">Most recent payroll activity</p>
            </div>
            <Link href="/dashboard/hr/payroll" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              Manage <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y">
            {recentPayroll.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                No payroll runs yet. Create the first one in Payroll.
              </div>
            ) : (
              recentPayroll.map((run) => (
                <div key={run.id} className="flex items-center gap-4 px-6 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{run.period}</p>
                    <p className="text-xs text-muted-foreground">
                      {run.periodType} · {run._count.entries} staff entries ·{" "}
                      Net: {fmt(run.totalNet)}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${PAYROLL_STATUS_COLORS[run.status] ?? "bg-muted text-muted-foreground"}`}>
                    {run.status}
                  </span>
                </div>
              ))
            )}
          </div>
          {approvedRuns > 0 && (
            <div className="border-t px-6 py-3">
              <Link href="/dashboard/hr/payroll" className="flex items-center gap-2 text-sm font-semibold text-sky-700 hover:underline">
                <CheckCircle2 className="h-4 w-4" />
                {approvedRuns} approved run{approvedRuns !== 1 ? "s" : ""} ready to mark as paid
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Open Appraisal Cycles",
            value: openCycles,
            icon: Star,
            href: "/dashboard/hr/appraisals",
            color: "violet",
          },
          {
            label: "Pending Leave",
            value: pendingLeave,
            icon: Clock,
            href: "/dashboard/hr/leave?status=PENDING",
            color: "amber",
          },
          {
            label: "Draft Payrolls",
            value: draftRuns,
            icon: Banknote,
            href: "/dashboard/hr/payroll",
            color: "indigo",
          },
          {
            label: "Total Appraisal Reviews",
            value: totalReviews,
            icon: TrendingUp,
            href: "/dashboard/hr/appraisals",
            color: "emerald",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href} className="group block">
              <div className="rounded-2xl border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
                <p className="mt-2 text-2xl font-black">{stat.value}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
