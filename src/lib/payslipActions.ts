"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { isAuthorizationError, requireAdmin } from "@/lib/security/guard";
import { isMissingDatabaseObjectError } from "@/lib/prisma-errors";
import {
  computePayslipTotals,
  formatSalaryMonth,
  isSalaryMonth,
  roundMoney,
  type PayslipDraft,
  type PayslipLine,
  type ResolvedPayslipDraft,
} from "@/lib/payslip";
import { findStaffProfile, resolvePayslipDraft } from "@/lib/payslip-server";

const PAYSLIPS_PATH = "/dashboard/hr/payslips";
const MY_PAYSLIPS_PATH = "/dashboard/my-payslips";

const STORAGE_MISSING_MESSAGE =
  "Payslips can't be saved yet because this school's database has no Payslip table. " +
  "Ask the platform administrator to run the tenant migrations.";

type ActionFailure = { success: false; error: string };

//* Errors whose message is written for the admin and safe to show as-is.
class PayslipInputError extends Error {}

function toFailure(error: unknown, fallback: string): ActionFailure {
  if (isAuthorizationError(error) || error instanceof PayslipInputError) {
    return { success: false, error: error.message };
  }
  if (isMissingDatabaseObjectError(error)) {
    return { success: false, error: STORAGE_MISSING_MESSAGE };
  }
  console.error("[Payslips]", error);
  return { success: false, error: fallback };
}

//* Teachers' My Payslips pages change whenever an admin saves or publishes.
function revalidatePayslipPages() {
  revalidatePath(PAYSLIPS_PATH);
  revalidatePath(MY_PAYSLIPS_PATH);
}

function prismaErrorCode(error: unknown) {
  return typeof error === "object" && error !== null
    ? (error as { code?: unknown }).code
    : undefined;
}

const text = (max: number) => z.string().trim().max(max);

const linesSchema = z
  .array(
    z.object({
      label: text(80),
      amount: z
        .number()
        .min(0, "Amounts cannot be negative.")
        .max(1_000_000_000, "An amount is too large."),
    })
  )
  .max(30, "A section can have at most 30 lines.");

const draftSchema = z.object({
  staffId: z.string().trim().min(1, "Choose a staff member."),
  staffType: z.enum(["ADMIN", "TEACHER"]),
  salaryMonth: z.string().refine(isSalaryMonth, "Choose a valid salary month."),
  employeeId: text(60),
  title: text(20),
  fullName: text(120).min(1, "Enter the employee's full name."),
  designation: text(80),
  gradeLevel: text(80),
  phone: text(40),
  email: text(120),
  bankName: text(80),
  accountNumber: text(60),
  bankBranch: text(80),
  ssnitNumber: text(60),
  ssnitBranch: text(80),
  earnings: linesSchema,
  otherClaims: linesSchema,
  deductions: linesSchema,
  otherDeductions: linesSchema,
  preparedBy: text(80),
  footerNote: text(300),
});

//* Drops untouched blank rows; a row with an amount must say what it is for.
function cleanLines(lines: PayslipLine[], section: string) {
  const kept = lines.filter((line) => line.label || line.amount);
  if (kept.some((line) => !line.label)) {
    throw new PayslipInputError(`Give every ${section} amount a label.`);
  }
  return kept.map((line) => ({ label: line.label, amount: roundMoney(line.amount) }));
}

export type LoadPayslipDraftResult =
  | ({ success: true } & ResolvedPayslipDraft)
  | ActionFailure;

export async function loadPayslipDraft(input: {
  staffId: string;
  salaryMonth: string;
}): Promise<LoadPayslipDraftResult> {
  try {
    const actor = await requireAdmin();

    if (!isSalaryMonth(input.salaryMonth)) {
      return { success: false, error: "Choose a valid salary month." };
    }

    const resolved = await resolvePayslipDraft({
      staffId: input.staffId,
      salaryMonth: input.salaryMonth,
      preparedBy: actor.name || actor.username,
    });
    if (!resolved) {
      return { success: false, error: "That staff member could not be found." };
    }

    return { success: true, ...resolved };
  } catch (error) {
    return toFailure(error, "Unable to load the payslip details. Please try again.");
  }
}

export type SavePayslipResult =
  | { success: true; payslipId: number; savedAt: string; publishedAt: string | null }
  | ActionFailure;

//* `publish: true` also releases the payslip to the teacher in the same write.
//* Without it, a published payslip stays published and the teacher sees the edit.
export async function savePayslip(input: {
  payslipId: number | null;
  draft: PayslipDraft;
  publish?: boolean;
}): Promise<SavePayslipResult> {
  try {
    const actor = await requireAdmin();

    const parsed = draftSchema.safeParse(input.draft);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Check the payslip details and try again.",
      };
    }
    const draft = parsed.data;
    const payslipId =
      typeof input.payslipId === "number" && Number.isInteger(input.payslipId) && input.payslipId > 0
        ? input.payslipId
        : null;

    const lines = {
      earnings: cleanLines(draft.earnings, "earnings"),
      otherClaims: cleanLines(draft.otherClaims, "other claims"),
      deductions: cleanLines(draft.deductions, "deductions"),
      otherDeductions: cleanLines(draft.otherDeductions, "other deductions"),
    };
    if (lines.earnings.length === 0) {
      return { success: false, error: "Add at least one earnings line, such as the basic salary." };
    }

    //* Totals are always recomputed here; the client's figures are display-only.
    const totals = computePayslipTotals(lines);
    if (totals.netSalary < 0) {
      return { success: false, error: "Total deductions are more than the total gross salary." };
    }

    //* A new payslip needs a current staff member. An existing one stays
    //* editable after the person leaves, keeping its recorded staff type.
    const staff = await findStaffProfile(draft.staffId);
    if (!staff && !payslipId) {
      return { success: false, error: "That staff member could not be found." };
    }

    const data = {
      staffId: draft.staffId,
      staffType: staff?.staffType ?? draft.staffType,
      salaryMonth: draft.salaryMonth,
      employeeId: draft.employeeId || null,
      title: draft.title || null,
      fullName: draft.fullName,
      designation: draft.designation || null,
      gradeLevel: draft.gradeLevel || null,
      phone: draft.phone || null,
      email: draft.email || null,
      bankName: draft.bankName || null,
      accountNumber: draft.accountNumber || null,
      bankBranch: draft.bankBranch || null,
      ssnitNumber: draft.ssnitNumber || null,
      ssnitBranch: draft.ssnitBranch || null,
      ...lines,
      grossSalary: totals.grossSalary,
      totalGross: totals.totalGross,
      totalDeductions: totals.totalDeductions,
      netSalary: totals.netSalary,
      preparedBy: draft.preparedBy || null,
      footerNote: draft.footerNote || null,
    };

    const publish = input.publish === true;
    const payslip = payslipId
      ? await prisma.payslip.update({
          where: { id: payslipId },
          data: publish ? { ...data, publishedAt: new Date() } : data,
        })
      : await prisma.payslip.create({
          data: {
            ...data,
            publishedAt: publish ? new Date() : null,
            createdById: actor.id,
            createdByName: actor.name || actor.username || "Admin",
          },
        });

    revalidatePayslipPages();
    return {
      success: true,
      payslipId: payslip.id,
      savedAt: payslip.updatedAt.toISOString(),
      publishedAt: payslip.publishedAt?.toISOString() ?? null,
    };
  } catch (error) {
    const code = prismaErrorCode(error);
    if (code === "P2002") {
      return {
        success: false,
        error: `This staff member already has a payslip for ${formatSalaryMonth(
          input.draft?.salaryMonth ?? ""
        )}. Open it from the payslip list to edit it.`,
      };
    }
    if (code === "P2025") {
      return {
        success: false,
        error: "This payslip was deleted by someone else. Start a new payslip from the payslip list.",
      };
    }
    return toFailure(error, "Unable to save the payslip. Please try again.");
  }
}

export async function deletePayslip(id: number): Promise<{ success: true } | ActionFailure> {
  try {
    await requireAdmin();

    if (!Number.isInteger(id) || id <= 0) {
      return { success: false, error: "Invalid payslip." };
    }

    await prisma.payslip.deleteMany({ where: { id } });
    revalidatePayslipPages();
    return { success: true };
  } catch (error) {
    return toFailure(error, "Unable to delete the payslip. Please try again.");
  }
}

export async function setPayslipPublished(
  id: number,
  published: boolean
): Promise<{ success: true; savedAt: string; publishedAt: string | null } | ActionFailure> {
  try {
    await requireAdmin();

    if (!Number.isInteger(id) || id <= 0) {
      return { success: false, error: "Invalid payslip." };
    }

    const payslip = await prisma.payslip.update({
      where: { id },
      data: { publishedAt: published ? new Date() : null },
    });
    revalidatePayslipPages();
    return {
      success: true,
      savedAt: payslip.updatedAt.toISOString(),
      publishedAt: payslip.publishedAt?.toISOString() ?? null,
    };
  } catch (error) {
    if (prismaErrorCode(error) === "P2025") {
      return { success: false, error: "This payslip was deleted by someone else." };
    }
    return toFailure(error, "Unable to update the payslip. Please try again.");
  }
}

//* Releases many drafts at once, e.g. a whole month's payslips to all teachers.
//* Already-published payslips are left alone, so their publish date stands.
export async function publishPayslips(
  ids: number[]
): Promise<{ success: true; count: number } | ActionFailure> {
  try {
    await requireAdmin();

    const payslipIds = Array.isArray(ids)
      ? [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))]
      : [];
    if (payslipIds.length === 0) {
      return { success: false, error: "There are no draft payslips to publish." };
    }
    if (payslipIds.length > 1000) {
      return { success: false, error: "Publish at most 1,000 payslips at a time." };
    }

    const { count } = await prisma.payslip.updateMany({
      where: { id: { in: payslipIds }, publishedAt: null },
      data: { publishedAt: new Date() },
    });
    revalidatePayslipPages();
    return { success: true, count };
  } catch (error) {
    return toFailure(error, "Unable to publish the payslips. Please try again.");
  }
}
