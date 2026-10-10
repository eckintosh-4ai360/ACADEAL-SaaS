"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "./auth";
import {
  clearControlPlaneSchoolTenantCache,
  getControlPlaneSchoolTenantById,
  isControlPlaneConfigured,
  listControlPlaneSchoolPayments,
  recordControlPlaneSchoolPayment,
  updateControlPlaneSchoolBilling,
} from "./control-plane";
import { requirePlatformRequest } from "./platformAccess";
import {
  PLANS,
  TRIAL_LENGTH_DAYS,
  grantEndDate,
  isPlanTier,
  type GrantDuration,
  type PaymentMethod,
} from "./plans";
import { clearTenantRegistryCache } from "./tenant";

export type BillingActionResult = {
  success: boolean;
  error: boolean;
  message: string;
};

//* Same gate as school onboarding: SUPER_ADMIN *and* on the platform host.
//* Duplicated rather than imported so the guard is never exposed as its own
//* server-action endpoint.
async function requirePlatformAdmin() {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    session.user.role !== "admin" ||
    session.user.adminRole !== "SUPER_ADMIN"
  ) {
    throw new Error("Only super admins can manage subscriptions.");
  }

  await requirePlatformRequest();

  return session;
}

function invalidateBillingViews() {
  clearControlPlaneSchoolTenantCache();
  clearTenantRegistryCache();
  revalidatePath("/dashboard/platform/schools");
}

function toActionErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

/**
 * FormData.get returns null for a field that is not in the submitted form, and
 * Zod's .optional() accepts undefined but not null. Several fields here are
 * conditionally rendered — a trial submits no duration or amount, and a fixed
 * duration submits no end date — so every read goes through this.
 */
function readField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

const grantSchema = z.object({
  tenantId: z.string().trim().min(1, "Select a school."),
  planTier: z.string().refine(isPlanTier, "Choose a valid plan."),
  //* Unused on the trial path, so it must tolerate being absent.
  duration: z
    .enum(["ONE_TERM", "TWO_TERMS", "ONE_YEAR", "CUSTOM"])
    .optional()
    .default("ONE_TERM"),
  customEndDate: z.string().trim().optional().default(""),
  method: z
    .enum(["CASH", "MOBILE_MONEY", "BANK_TRANSFER", "COMPLIMENTARY"])
    .optional()
    .default("CASH"),
  //* Cedis as typed by the operator; converted to pesewas before storing.
  amountCedis: z.string().trim().optional().default(""),
  receiptReference: z.string().trim().optional().default(""),
  note: z.string().trim().optional().default(""),
});

/**
 * Grant or extend a school's subscription after receiving payment in person.
 *
 * A trial sets an expiry and records no payment. Any paid tier writes a ledger
 * row and moves paidThrough. Both paths always produce an end date, because a
 * grant without one is a school that never has to pay again.
 */
export async function grantSchoolPlanAction(
  formData: FormData
): Promise<BillingActionResult> {
  try {
    const session = await requirePlatformAdmin();

    if (!isControlPlaneConfigured()) {
      return {
        success: false,
        error: true,
        message: "Add CONTROL_PLANE_DATABASE_URL before managing subscriptions.",
      };
    }

    const parsed = grantSchema.safeParse({
      tenantId: readField(formData, "tenantId"),
      planTier: readField(formData, "planTier"),
      duration: readField(formData, "duration"),
      customEndDate: readField(formData, "customEndDate"),
      method: readField(formData, "method"),
      amountCedis: readField(formData, "amountCedis"),
      receiptReference: readField(formData, "receiptReference"),
      note: readField(formData, "note"),
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      //* Name the field: a bare "expected string, received null" is unusable
      //* when eight fields could have produced it.
      const field = issue?.path?.join(".") ?? "";

      return {
        success: false,
        error: true,
        message: issue
          ? `${issue.message}${field ? ` (${field})` : ""}`
          : "Check the form and retry.",
      };
    }

    const input = parsed.data;
    const tenant = await getControlPlaneSchoolTenantById(input.tenantId);

    if (!tenant) {
      return { success: false, error: true, message: "School not found." };
    }

    const now = new Date();
    const recordedBy = session.user.email ?? session.user.name ?? "platform";

    //* ── Trial ────────────────────────────────
    if (input.planTier === "TRIAL") {
      const trialEnds = new Date(
        now.getTime() + TRIAL_LENGTH_DAYS * 86_400_000
      );

      await updateControlPlaneSchoolBilling(tenant.id, {
        planTier: "TRIAL",
        paidThrough: null,
        trialEndsAt: trialEnds,
        closed: false,
        billingNotes:
          input.note ||
          `Trial started ${now.toDateString()} by ${recordedBy}.`,
      });

      invalidateBillingViews();

      return {
        success: true,
        error: false,
        message: `${tenant.schoolName} is on a trial until ${trialEnds.toDateString()}.`,
      };
    }

    //* ── Paid grant ───────────────────────────
    //* Renewing early adds to remaining time rather than replacing it, so the
    //* new period starts from whichever is later: today or the current expiry.
    const existingPaidThrough = tenant.paidThrough
      ? new Date(tenant.paidThrough)
      : null;
    const periodStart =
      existingPaidThrough && existingPaidThrough > now
        ? existingPaidThrough
        : now;

    let periodEnd: Date;

    if (input.duration === "CUSTOM") {
      if (!input.customEndDate) {
        return {
          success: false,
          error: true,
          message: "Enter the date this subscription runs until.",
        };
      }

      periodEnd = new Date(input.customEndDate);

      if (Number.isNaN(periodEnd.getTime())) {
        return {
          success: false,
          error: true,
          message: "That end date could not be read. Use the date picker.",
        };
      }

      if (periodEnd <= now) {
        return {
          success: false,
          error: true,
          message: "The end date must be in the future.",
        };
      }
    } else {
      periodEnd = grantEndDate(input.duration as GrantDuration, periodStart);
    }

    const amountPesewas = input.amountCedis
      ? Math.round(Number(input.amountCedis) * 100)
      : 0;

    if (Number.isNaN(amountPesewas) || amountPesewas < 0) {
      return {
        success: false,
        error: true,
        message: "Enter the amount received as a number, in cedis.",
      };
    }

    const result = await recordControlPlaneSchoolPayment({
      tenantId: tenant.id,
      planTier: input.planTier,
      method: input.method as PaymentMethod,
      amountPesewas,
      periodStart,
      periodEnd,
      receiptReference: input.receiptReference || null,
      recordedBy,
      note: input.note || null,
    });

    if (!result.applied) {
      return {
        success: false,
        error: true,
        message: `Receipt ${input.receiptReference} has already been recorded. Nothing was changed.`,
      };
    }

    invalidateBillingViews();

    return {
      success: true,
      error: false,
      message: `${tenant.schoolName} is on ${PLANS[input.planTier].label} until ${periodEnd.toDateString()}.`,
    };
  } catch (error) {
    return { success: false, error: true, message: toActionErrorMessage(error) };
  }
}

const closeSchema = z.object({
  tenantId: z.string().trim().min(1),
  closed: z.enum(["true", "false"]),
  note: z.string().trim().optional().default(""),
});

/** Close or reopen a school's account without deleting anything. */
export async function setSchoolAccountClosedAction(
  formData: FormData
): Promise<BillingActionResult> {
  try {
    await requirePlatformAdmin();

    const parsed = closeSchema.safeParse({
      tenantId: readField(formData, "tenantId"),
      closed: readField(formData, "closed"),
      note: readField(formData, "note"),
    });

    if (!parsed.success) {
      return { success: false, error: true, message: "Invalid request." };
    }

    const tenant = await getControlPlaneSchoolTenantById(parsed.data.tenantId);

    if (!tenant) {
      return { success: false, error: true, message: "School not found." };
    }

    const closed = parsed.data.closed === "true";

    await updateControlPlaneSchoolBilling(tenant.id, {
      planTier: tenant.planTier,
      paidThrough: tenant.paidThrough ? new Date(tenant.paidThrough) : null,
      trialEndsAt: tenant.trialEndsAt ? new Date(tenant.trialEndsAt) : null,
      closed,
      billingNotes: parsed.data.note || tenant.billingNotes,
    });

    invalidateBillingViews();

    return {
      success: true,
      error: false,
      message: closed
        ? `${tenant.schoolName}'s account is closed. Records are retained.`
        : `${tenant.schoolName}'s account is open again.`,
    };
  } catch (error) {
    return { success: false, error: true, message: toActionErrorMessage(error) };
  }
}

/** Payment history for one school, for the console's detail view. */
export async function getSchoolPaymentHistoryAction(tenantId: string) {
  await requirePlatformAdmin();
  return listControlPlaneSchoolPayments(tenantId);
}
