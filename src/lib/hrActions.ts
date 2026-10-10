"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type {
  PayrollStatus,
  LeaveType,
  LeaveStatus,
  AppraisalRecommendation,
} from "@prisma/client";
import { sendSMS, normalizePhoneNumber } from "@/lib/sms";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required.");
  }
  return session;
}

async function requireSuperAdminOrAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required.");
  }
  return session;
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYROLL ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export type CreatePayrollRunInput = {
  period: string;
  periodType?: "MONTHLY" | "TERM";
  currency?: string;
  notes?: string;
};

export async function createPayrollRun(input: CreatePayrollRunInput) {
  const session = await requireAdmin();
  const adminName = session.user.name ?? session.user.username ?? "Admin";

  const run = await prisma.payrollRun.create({
    data: {
      period: input.period,
      periodType: input.periodType ?? "MONTHLY",
      currency: input.currency ?? "GHS",
      notes: input.notes,
      createdById: session.user.id,
      createdByName: adminName,
    },
  });

  revalidatePath("/dashboard/hr/payroll");
  return { success: true, run };
}

export type PayrollEntryInput = {
  staffId: string;
  staffName: string;
  staffType: "ADMIN" | "TEACHER";
  staffProfileId?: string;
  grossSalary: number;
  taxDeduction?: number;
  ssnitDeduction?: number;
  otherDeductions?: number;
  notes?: string;
};

export async function upsertPayrollEntry(runId: number, input: PayrollEntryInput) {
  await requireAdmin();

  const net =
    input.grossSalary -
    (input.taxDeduction ?? 0) -
    (input.ssnitDeduction ?? 0) -
    (input.otherDeductions ?? 0);

  const entry = await prisma.payrollEntry.upsert({
    where: { runId_staffId: { runId, staffId: input.staffId } },
    create: {
      runId,
      staffId: input.staffId,
      staffName: input.staffName,
      staffType: input.staffType,
      staffProfileId: input.staffProfileId,
      grossSalary: input.grossSalary,
      taxDeduction: input.taxDeduction ?? 0,
      ssnitDeduction: input.ssnitDeduction ?? 0,
      otherDeductions: input.otherDeductions ?? 0,
      netSalary: net,
      notes: input.notes,
    },
    update: {
      staffName: input.staffName,
      staffType: input.staffType,
      staffProfileId: input.staffProfileId,
      grossSalary: input.grossSalary,
      taxDeduction: input.taxDeduction ?? 0,
      ssnitDeduction: input.ssnitDeduction ?? 0,
      otherDeductions: input.otherDeductions ?? 0,
      netSalary: net,
      notes: input.notes,
    },
  });

  // Recompute run totals
  const allEntries = await prisma.payrollEntry.findMany({ where: { runId } });
  await prisma.payrollRun.update({
    where: { id: runId },
    data: {
      totalGross: allEntries.reduce((sum, e) => sum + e.grossSalary, 0),
      totalNet: allEntries.reduce((sum, e) => sum + e.netSalary, 0),
    },
  });

  revalidatePath("/dashboard/hr/payroll");
  return { success: true, entry };
}

export async function deletePayrollEntry(runId: number, staffId: string) {
  await requireAdmin();

  await prisma.payrollEntry.delete({
    where: { runId_staffId: { runId, staffId } },
  });

  const allEntries = await prisma.payrollEntry.findMany({ where: { runId } });
  await prisma.payrollRun.update({
    where: { id: runId },
    data: {
      totalGross: allEntries.reduce((sum, e) => sum + e.grossSalary, 0),
      totalNet: allEntries.reduce((sum, e) => sum + e.netSalary, 0),
    },
  });

  revalidatePath("/dashboard/hr/payroll");
  return { success: true };
}

export async function approvePayrollRun(runId: number) {
  const session = await requireAdmin();
  const adminName = session.user.name ?? session.user.username ?? "Admin";

  const run = await prisma.payrollRun.findUnique({ where: { id: runId } });
  if (!run || run.status !== "DRAFT") {
    throw new Error("Only DRAFT payroll runs can be approved.");
  }

  await prisma.payrollRun.update({
    where: { id: runId },
    data: {
      status: "APPROVED",
      approvedById: session.user.id,
      approvedByName: adminName,
      approvedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/hr/payroll");
  return { success: true };
}

export async function markPayrollPaid(runId: number) {
  await requireAdmin();

  const run = await prisma.payrollRun.findUniqueOrThrow({
    where: { id: runId },
    include: { entries: true },
  });

  if (run.status !== "APPROVED") {
    throw new Error("Only APPROVED payroll runs can be marked as paid.");
  }

  await prisma.payrollRun.update({
    where: { id: runId },
    data: { status: "PAID", paidAt: new Date() },
  });

  revalidatePath("/dashboard/hr/payroll");

  // ── Send SMS notifications to each staff member ──────────────────────────
  const periodLabel = run.periodType === "TERM" ? `${run.period}` : run.period;
  const currency = run.currency;

  // Resolve phones in parallel — try Staff (unified) → Teacher → Admin
  const smsJobs = run.entries.map(async (entry) => {
    try {
      let phone: string | null = null;

      // 1. Try unified Staff table (most reliable)
      const staffRecord = await prisma.staff.findUnique({
        where: { id: entry.staffId },
        select: { phone: true, name: true, surname: true },
      }).catch(() => null);

      if (staffRecord?.phone) {
        phone = staffRecord.phone;
      } else {
        // 2. Fall back to Teacher or Admin tables
        if (entry.staffType === "TEACHER") {
          const teacher = await prisma.teacher.findUnique({
            where: { id: entry.staffId },
            select: { phone: true },
          }).catch(() => null);
          phone = teacher?.phone ?? null;
        } else {
          const admin = await prisma.admin.findUnique({
            where: { id: entry.staffId },
            select: { phone: true },
          }).catch(() => null);
          phone = admin?.phone ?? null;
        }
      }

      if (!phone) {
        console.log(`[Payroll SMS] No phone for ${entry.staffName} — skipping.`);
        return { staffName: entry.staffName, sent: false, reason: "no_phone" };
      }

      const normalized = normalizePhoneNumber(phone);
      if (!normalized) {
        console.log(`[Payroll SMS] Invalid phone for ${entry.staffName}: ${phone} — skipping.`);
        return { staffName: entry.staffName, sent: false, reason: "invalid_phone" };
      }

      const net = entry.netSalary.toLocaleString("en-GH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      const message =
        `Dear ${entry.staffName},\n` +
        `Your salary of ${currency} ${net} for ${periodLabel} has been processed and paid.\n` +
        `Gross: ${currency} ${entry.grossSalary.toFixed(2)}, ` +
        `Deductions: ${currency} ${(entry.grossSalary - entry.netSalary).toFixed(2)}.\n` +
        `For queries, contact the school administration. Thank you.`;

      const result = await sendSMS(normalized, message);
      return { staffName: entry.staffName, sent: result.success, reason: result.error };
    } catch (err) {
      console.error(`[Payroll SMS] Error sending to ${entry.staffName}:`, err);
      return { staffName: entry.staffName, sent: false, reason: "error" };
    }
  });

  const smsResults = await Promise.allSettled(smsJobs);
  const sent = smsResults.filter(
    (r) => r.status === "fulfilled" && r.value.sent
  ).length;
  console.log(`[Payroll SMS] Payroll run #${runId} paid — notified ${sent}/${run.entries.length} staff.`);

  return { success: true, smsSent: sent, smsTotal: run.entries.length };
}

export async function deletePayrollRun(runId: number) {
  await requireAdmin();

  const run = await prisma.payrollRun.findUnique({ where: { id: runId } });
  if (!run || run.status !== "DRAFT") {
    throw new Error("Only DRAFT payroll runs can be deleted.");
  }

  await prisma.payrollRun.delete({ where: { id: runId } });
  revalidatePath("/dashboard/hr/payroll");
  return { success: true };
}

export async function getPayrollRuns(filters?: {
  status?: PayrollStatus;
  page?: number;
  pageSize?: number;
}) {
  await requireAdmin();

  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 10;
  const where = filters?.status ? { status: filters.status } : {};

  const [runs, total] = await Promise.all([
    prisma.payrollRun.findMany({
      where,
      include: { _count: { select: { entries: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.payrollRun.count({ where }),
  ]);

  return { runs, total, page, pageSize };
}

export async function getPayrollRunDetail(runId: number) {
  await requireAdmin();

  return prisma.payrollRun.findUniqueOrThrow({
    where: { id: runId },
    include: { entries: { orderBy: { staffName: "asc" } } },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// LEAVE ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export type SubmitLeaveInput = {
  staffId: string;
  staffName: string;
  staffType: "ADMIN" | "TEACHER";
  staffProfileId?: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  reason: string;
};

export async function submitLeaveRequest(input: SubmitLeaveInput) {
  await requireAdmin();

  // Calculate working days (Mon–Fri only)
  const totalDays = countWorkingDays(input.startDate, input.endDate);

  const request = await prisma.leaveRequest.create({
    data: {
      staffId: input.staffId,
      staffName: input.staffName,
      staffType: input.staffType,
      staffProfileId: input.staffProfileId,
      leaveType: input.leaveType,
      startDate: input.startDate,
      endDate: input.endDate,
      totalDays,
      reason: input.reason,
    },
  });

  revalidatePath("/dashboard/hr/leave");
  return { success: true, request };
}

export async function reviewLeaveRequest(
  id: number,
  decision: "APPROVED" | "REJECTED",
  note?: string
) {
  const session = await requireAdmin();
  const adminName = session.user.name ?? session.user.username ?? "Admin";

  const req = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!req || req.status !== "PENDING") {
    throw new Error("Only PENDING leave requests can be reviewed.");
  }

  await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: decision as LeaveStatus,
      reviewedById: session.user.id,
      reviewedByName: adminName,
      reviewNote: note ?? null,
      reviewedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/hr/leave");
  return { success: true };
}

export async function deleteLeaveRequest(id: number) {
  await requireAdmin();

  const req = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!req || req.status !== "PENDING") {
    throw new Error("Only PENDING leave requests can be deleted.");
  }

  await prisma.leaveRequest.delete({ where: { id } });
  revalidatePath("/dashboard/hr/leave");
  return { success: true };
}

export async function getLeaveRequests(filters?: {
  status?: LeaveStatus;
  leaveType?: LeaveType;
  staffId?: string;
  page?: number;
  pageSize?: number;
}) {
  await requireAdmin();

  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 15;

  const where: Record<string, unknown> = {};
  if (filters?.status) where.status = filters.status;
  if (filters?.leaveType) where.leaveType = filters.leaveType;
  if (filters?.staffId) where.staffId = filters.staffId;

  const [requests, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.leaveRequest.count({ where }),
  ]);

  // Summary stats
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [pendingCount, approvedThisMonth] = await Promise.all([
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
    prisma.leaveRequest.count({
      where: { status: "APPROVED", reviewedAt: { gte: monthStart } },
    }),
  ]);

  return { requests, total, page, pageSize, pendingCount, approvedThisMonth };
}

// ─────────────────────────────────────────────────────────────────────────────
// APPRAISAL ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export type CreateAppraisalCycleInput = {
  title: string;
  period: string;
  startDate: Date;
  endDate: Date;
  description?: string;
};

export async function createAppraisalCycle(input: CreateAppraisalCycleInput) {
  const session = await requireAdmin();
  const adminName = session.user.name ?? session.user.username ?? "Admin";

  const cycle = await prisma.appraisalCycle.create({
    data: {
      title: input.title,
      period: input.period,
      startDate: input.startDate,
      endDate: input.endDate,
      description: input.description,
      createdById: session.user.id,
      createdByName: adminName,
    },
  });

  revalidatePath("/dashboard/hr/appraisals");
  return { success: true, cycle };
}

export async function closeAppraisalCycle(cycleId: number) {
  await requireAdmin();

  const cycle = await prisma.appraisalCycle.findUnique({ where: { id: cycleId } });
  if (!cycle || cycle.status !== "OPEN") {
    throw new Error("Only OPEN appraisal cycles can be closed.");
  }

  await prisma.appraisalCycle.update({
    where: { id: cycleId },
    data: { status: "CLOSED", closedAt: new Date() },
  });

  revalidatePath("/dashboard/hr/appraisals");
  return { success: true };
}

export async function deleteAppraisalCycle(cycleId: number) {
  await requireAdmin();

  const cycle = await prisma.appraisalCycle.findUnique({ where: { id: cycleId } });
  if (!cycle || cycle.status !== "OPEN") {
    throw new Error("Only OPEN appraisal cycles can be deleted.");
  }

  await prisma.appraisalCycle.delete({ where: { id: cycleId } });
  revalidatePath("/dashboard/hr/appraisals");
  return { success: true };
}

export type AppraisalRecordInput = {
  staffId: string;
  staffName: string;
  staffType: "ADMIN" | "TEACHER";
  staffProfileId?: string;
  score: number;
  teachingScore?: number;
  professionalScore?: number;
  conductScore?: number;
  comments?: string;
  strengths?: string;
  improvements?: string;
  recommendation: AppraisalRecommendation;
};

export async function upsertAppraisalRecord(
  cycleId: number,
  input: AppraisalRecordInput
) {
  const session = await requireAdmin();
  const adminName = session.user.name ?? session.user.username ?? "Admin";

  const cycle = await prisma.appraisalCycle.findUnique({ where: { id: cycleId } });
  if (!cycle || cycle.status !== "OPEN") {
    throw new Error("Records can only be added to OPEN appraisal cycles.");
  }

  const record = await prisma.appraisalRecord.upsert({
    where: { cycleId_staffId: { cycleId, staffId: input.staffId } },
    create: {
      cycleId,
      staffId: input.staffId,
      staffName: input.staffName,
      staffType: input.staffType,
      staffProfileId: input.staffProfileId,
      score: input.score,
      teachingScore: input.teachingScore,
      professionalScore: input.professionalScore,
      conductScore: input.conductScore,
      comments: input.comments,
      strengths: input.strengths,
      improvements: input.improvements,
      recommendation: input.recommendation,
      reviewerId: session.user.id,
      reviewerName: adminName,
    },
    update: {
      score: input.score,
      teachingScore: input.teachingScore,
      professionalScore: input.professionalScore,
      conductScore: input.conductScore,
      comments: input.comments,
      strengths: input.strengths,
      improvements: input.improvements,
      recommendation: input.recommendation,
      reviewerId: session.user.id,
      reviewerName: adminName,
    },
  });

  revalidatePath("/dashboard/hr/appraisals");
  return { success: true, record };
}

export async function deleteAppraisalRecord(cycleId: number, staffId: string) {
  await requireAdmin();

  const cycle = await prisma.appraisalCycle.findUnique({ where: { id: cycleId } });
  if (!cycle || cycle.status !== "OPEN") {
    throw new Error("Records can only be removed from OPEN appraisal cycles.");
  }

  await prisma.appraisalRecord.delete({
    where: { cycleId_staffId: { cycleId, staffId } },
  });

  revalidatePath("/dashboard/hr/appraisals");
  return { success: true };
}

export async function getAppraisalCycles(filters?: {
  status?: "OPEN" | "CLOSED";
  page?: number;
  pageSize?: number;
}) {
  await requireAdmin();

  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 10;
  const where = filters?.status ? { status: filters.status as "OPEN" | "CLOSED" } : {};

  const [cycles, total] = await Promise.all([
    prisma.appraisalCycle.findMany({
      where,
      include: { _count: { select: { records: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.appraisalCycle.count({ where }),
  ]);

  return { cycles, total, page, pageSize };
}

export async function getCycleRecords(
  cycleId: number,
  filters?: { staffType?: string; recommendation?: AppraisalRecommendation }
) {
  await requireAdmin();

  const where: Record<string, unknown> = { cycleId };
  if (filters?.staffType) where.staffType = filters.staffType;
  if (filters?.recommendation) where.recommendation = filters.recommendation;

  const records = await prisma.appraisalRecord.findMany({
    where,
    orderBy: { staffName: "asc" },
  });

  return records;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────

function countWorkingDays(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}
