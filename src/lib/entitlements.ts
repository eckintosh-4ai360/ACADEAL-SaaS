//* Server-side entitlement guards.
//*
//* proxy.ts gates navigation, but middleware does not protect a direct call to
//* a server action or route handler. These helpers are the layer that actually
//* stops a determined caller, so gated modules must use them rather than
//* relying on the edge check alone.

import {
  findControlPlaneSchoolTenantByHostname,
  getTenantBillingState,
} from "./control-plane";
import {
  PLANS,
  canAddStudent,
  isGatedModule,
  lowestTierWithModule,
  tierIncludesModule,
  type BillingState,
  type PlanTier,
} from "./plans";
import { getRequestHostname } from "./tenant";

export class EntitlementError extends Error {
  constructor(
    message: string,
    readonly code:
      | "PLAN_UPGRADE_REQUIRED"
      | "SUBSCRIPTION_INACTIVE"
      | "STUDENT_CAP_REACHED",
    readonly requiredTier: PlanTier | null = null
  ) {
    super(message);
    this.name = "EntitlementError";
  }
}

export type TenantEntitlements = {
  //* Null when no control-plane record matches, e.g. local development.
  //* Treated as unrestricted so a missing registry never blocks dev work.
  tenantId: string | null;
  schoolName: string | null;
  planTier: PlanTier;
  billing: BillingState | null;
  studentCap: number | null;
};

/** Resolve the current request's school and its plan. */
export async function getTenantEntitlements(): Promise<TenantEntitlements> {
  const hostname = await getRequestHostname();
  const tenant = await findControlPlaneSchoolTenantByHostname(hostname);

  if (!tenant) {
    return {
      tenantId: null,
      schoolName: null,
      planTier: "ENTERPRISE",
      billing: null,
      studentCap: null,
    };
  }

  return {
    tenantId: tenant.id,
    schoolName: tenant.schoolName,
    planTier: tenant.planTier,
    billing: getTenantBillingState(tenant),
    studentCap: PLANS[tenant.planTier].studentCap,
  };
}

/**
 * Throw unless the current school's plan includes this module and its
 * subscription is live. Call at the top of every gated server action.
 */
export async function requireModule(moduleSegment: string) {
  const entitlements = await getTenantEntitlements();

  //* No control-plane record: unrestricted (local dev, default tenant).
  if (!entitlements.tenantId) {
    return entitlements;
  }

  if (entitlements.billing && !entitlements.billing.hasAccess) {
    throw new EntitlementError(
      "This school does not have an active subscription.",
      "SUBSCRIPTION_INACTIVE"
    );
  }

  if (
    isGatedModule(moduleSegment) &&
    !tierIncludesModule(entitlements.planTier, moduleSegment)
  ) {
    throw new EntitlementError(
      `The ${moduleSegment} module is not included in the ${PLANS[entitlements.planTier].label} plan.`,
      "PLAN_UPGRADE_REQUIRED",
      lowestTierWithModule(moduleSegment)
    );
  }

  return entitlements;
}

/**
 * Throw if adding one more student would exceed the plan's ceiling. Enforced
 * at creation rather than at login: blocking the 151st student with a clear
 * message is honest, whereas discovering the overage at renewal is not.
 */
export async function requireStudentCapacity(currentStudentCount: number) {
  const entitlements = await getTenantEntitlements();

  if (!entitlements.tenantId) {
    return entitlements;
  }

  if (!canAddStudent(entitlements.planTier, currentStudentCount)) {
    const plan = PLANS[entitlements.planTier];
    throw new EntitlementError(
      `The ${plan.label} plan covers up to ${plan.studentCap} students. Upgrade the plan to add more.`,
      "STUDENT_CAP_REACHED",
      entitlements.planTier === "STARTER" ? "GROWTH" : "ENTERPRISE"
    );
  }

  return entitlements;
}

/** Narrow an unknown error to an entitlement failure, for action results. */
export function isEntitlementError(error: unknown): error is EntitlementError {
  return error instanceof EntitlementError;
}
