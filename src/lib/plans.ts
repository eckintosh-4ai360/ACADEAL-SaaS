//* Subscription plan definitions and module entitlements.
//* Single source of truth: nothing else in the app should hardcode a tier,
//* a student cap, a price, or a module-to-tier mapping.

export type PlanTier = "TRIAL" | "STARTER" | "GROWTH" | "ENTERPRISE";

export type BillingStatus =
  | "TRIALING" //* inside the trial window, full access
  | "ACTIVE" //* paid through a future date
  | "GRACE" //* paid-through passed, still usable, chasing payment
  | "SUSPENDED" //* grace exhausted, access blocked
  | "CLOSED"; //* ended deliberately, data retained

//* Payments are recorded by hand by the platform owner. There is no gateway:
//* mobile money and bank transfers are received directly and entered here the
//* same way cash is. The distinction is kept for reconciliation, not for
//* routing — nothing in the app talks to a payment provider.
export type PaymentMethod =
  | "CASH"
  | "MOBILE_MONEY"
  | "BANK_TRANSFER"
  | "COMPLIMENTARY";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  MOBILE_MONEY: "Mobile money",
  BANK_TRANSFER: "Bank transfer",
  COMPLIMENTARY: "Complimentary",
};

//* How long a grant runs. Ghanaian schools budget by term, so a term is the
//* natural unit; the custom option covers part-terms and negotiated dates.
export type GrantDuration = "ONE_TERM" | "TWO_TERMS" | "ONE_YEAR" | "CUSTOM";

export const GRANT_DURATION_LABELS: Record<GrantDuration, string> = {
  ONE_TERM: "One term (4 months)",
  TWO_TERMS: "Two terms (8 months)",
  ONE_YEAR: "Full year (12 months)",
  CUSTOM: "Custom date",
};

const GRANT_DURATION_MONTHS: Record<Exclude<GrantDuration, "CUSTOM">, number> = {
  ONE_TERM: 4,
  TWO_TERMS: 8,
  ONE_YEAR: 12,
};

/**
 * End date for a grant of the given duration, counted from `from`. Extending an
 * account that is still in credit should add to the remaining time rather than
 * replace it, so callers pass the later of today and the current paid-through.
 */
export function grantEndDate(duration: GrantDuration, from: Date) {
  if (duration === "CUSTOM") {
    return from;
  }

  const end = new Date(from);
  end.setMonth(end.getMonth() + GRANT_DURATION_MONTHS[duration]);
  return end;
}

/** Price for a duration, used to prefill the amount collected. */
export function priceForDuration(tier: PlanTier, duration: GrantDuration) {
  const plan = PLANS[tier];

  switch (duration) {
    case "ONE_TERM":
      return plan.termPricePesewas;
    case "TWO_TERMS":
      return plan.termPricePesewas * 2;
    case "ONE_YEAR":
      return plan.yearPricePesewas;
    default:
      return 0;
  }
}

export type ModuleBundle =
  | "FOUNDATION"
  | "ACADEMICS"
  | "ENGAGEMENT"
  | "FINANCE"
  | "MESSAGING"
  | "OPERATIONS"
  | "AI";

//* Days of continued access after paidThrough passes, before suspension.
//* Deliberately generous: a bursar releasing term funds late is normal, and
//* locking a school out mid-term costs far more than the delayed payment.
export const GRACE_PERIOD_DAYS = 21;

export const TRIAL_LENGTH_DAYS = 30;

//* Route segments under /dashboard that belong to each bundle.
//* /dashboard/platform is deliberately absent: it is the operator console,
//* gated by host + SUPER_ADMIN, and no subscription tier grants it.
export const BUNDLE_MODULES: Record<ModuleBundle, string[]> = {
  FOUNDATION: [
    "students",
    "staff",
    "teachers",
    "classes",
    "subjects",
    "admins",
    "settings",
  ],
  ACADEMICS: [
    "academics",
    "attendance",
    "exams",
    "assignments",
    "results",
    "lessons",
    "schedule",
    "student-report-cards",
    "parent-report-cards",
  ],
  ENGAGEMENT: [
    "announcements",
    "events",
    "messages",
    "notifications",
    "meetings",
    "parents",
  ],
  FINANCE: ["fees", "finance", "collections", "excursion", "inventory"],
  MESSAGING: ["sms", "email-templates"],
  OPERATIONS: ["hr", "my-payslips", "behavior", "analytics", "logs", "utilities"],
  AI: ["acadeal-ai", "system-chat"],
};

export type PlanDefinition = {
  tier: PlanTier;
  label: string;
  //* null means no enrollment ceiling
  studentCap: number | null;
  //* Prices in pesewas (GHS minor units) to keep money off floating point.
  //* 100 pesewas = GHS 1.
  termPricePesewas: number;
  yearPricePesewas: number;
  bundles: ModuleBundle[];
  //* SMS credits granted per billing term; 0 means the module is unavailable.
  smsCreditsPerTerm: number;
  blurb: string;
};

export const PLANS: Record<PlanTier, PlanDefinition> = {
  TRIAL: {
    tier: "TRIAL",
    label: "Trial",
    studentCap: null,
    termPricePesewas: 0,
    yearPricePesewas: 0,
    bundles: [
      "FOUNDATION",
      "ACADEMICS",
      "ENGAGEMENT",
      "FINANCE",
      "MESSAGING",
      "OPERATIONS",
      "AI",
    ],
    smsCreditsPerTerm: 50,
    blurb: "Full access for 30 days. No payment details required.",
  },
  STARTER: {
    tier: "STARTER",
    label: "Starter",
    studentCap: 150,
    termPricePesewas: 60_000, //* GHS 600
    yearPricePesewas: 150_000, //* GHS 1,500
    bundles: ["FOUNDATION", "ACADEMICS"],
    smsCreditsPerTerm: 0,
    blurb: "Core records and academics for small private schools.",
  },
  GROWTH: {
    tier: "GROWTH",
    label: "Growth",
    studentCap: 600,
    termPricePesewas: 180_000, //* GHS 1,800
    yearPricePesewas: 450_000, //* GHS 4,500
    bundles: [
      "FOUNDATION",
      "ACADEMICS",
      "ENGAGEMENT",
      "FINANCE",
      "MESSAGING",
    ],
    smsCreditsPerTerm: 500,
    blurb: "Adds fees, finance, parent engagement and messaging.",
  },
  ENTERPRISE: {
    tier: "ENTERPRISE",
    label: "Enterprise",
    studentCap: null,
    termPricePesewas: 450_000, //* GHS 4,500
    yearPricePesewas: 1_125_000, //* GHS 11,250
    bundles: [
      "FOUNDATION",
      "ACADEMICS",
      "ENGAGEMENT",
      "FINANCE",
      "MESSAGING",
      "OPERATIONS",
      "AI",
    ],
    smsCreditsPerTerm: 2_000,
    blurb: "Everything, uncapped, including HR, analytics and AI features.",
  },
};

export const PLAN_TIERS = Object.keys(PLANS) as PlanTier[];

export function isPlanTier(value: unknown): value is PlanTier {
  return typeof value === "string" && value in PLANS;
}

export function getPlan(tier: PlanTier) {
  return PLANS[tier];
}

//* Flattened tier -> allowed module segments, built once at module load.
const TIER_MODULES: Record<PlanTier, Set<string>> = PLAN_TIERS.reduce(
  (accumulator, tier) => {
    const modules = new Set<string>();

    for (const bundle of PLANS[tier].bundles) {
      for (const moduleSegment of BUNDLE_MODULES[bundle]) {
        modules.add(moduleSegment);
      }
    }

    accumulator[tier] = modules;
    return accumulator;
  },
  {} as Record<PlanTier, Set<string>>
);

//* Every module segment that belongs to some bundle. A dashboard route that is
//* not in this set is ungated (dashboard home, platform console, etc.).
const ALL_GATED_MODULES = new Set(
  Object.values(BUNDLE_MODULES).flat()
);

/**
 * Extract the module segment from a pathname, e.g.
 * "/dashboard/fees/my-fees" -> "fees". Returns null for non-dashboard paths
 * and for /dashboard itself.
 */
export function getModuleSegmentFromPath(pathname: string) {
  const normalized = pathname.split("?")[0]?.split("#")[0] ?? pathname;
  const segments = normalized.split("/").filter(Boolean);

  if (segments[0] !== "dashboard" || !segments[1]) {
    return null;
  }

  return segments[1];
}

/** Is this module segment gated by subscription tier at all? */
export function isGatedModule(moduleSegment: string) {
  return ALL_GATED_MODULES.has(moduleSegment);
}

/** Does this tier include this module segment? */
export function tierIncludesModule(tier: PlanTier, moduleSegment: string) {
  return TIER_MODULES[tier].has(moduleSegment);
}

/**
 * Entitlement check for a dashboard pathname. Ungated paths always pass, so
 * callers can apply this uniformly without special-casing.
 */
export function tierAllowsPath(tier: PlanTier, pathname: string) {
  const moduleSegment = getModuleSegmentFromPath(pathname);

  if (!moduleSegment || !isGatedModule(moduleSegment)) {
    return true;
  }

  return tierIncludesModule(tier, moduleSegment);
}

/** Lowest tier that includes this module, for "upgrade to X" messaging. */
export function lowestTierWithModule(moduleSegment: string): PlanTier | null {
  const paidOrder: PlanTier[] = ["STARTER", "GROWTH", "ENTERPRISE"];
  return paidOrder.find((tier) => tierIncludesModule(tier, moduleSegment)) ?? null;
}

export type BillingStateInput = {
  planTier: PlanTier;
  //* End of the paid period. Null for a school that has never paid.
  paidThrough: Date | null;
  //* End of the trial window. Null once the school has converted.
  trialEndsAt: Date | null;
  //* Operator kill switch, independent of payment.
  enabled: boolean;
  closed?: boolean;
  now?: Date;
};

export type BillingState = {
  status: BillingStatus;
  //* Can the school use the app at all right now?
  hasAccess: boolean;
  //* Days until access is lost. Null when not counting down.
  daysRemaining: number | null;
  //* Show a pay-now banner without blocking use.
  showPaymentWarning: boolean;
};

const MS_PER_DAY = 86_400_000;

function wholeDaysBetween(from: Date, to: Date) {
  return Math.ceil((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/**
 * Derive billing status from dates rather than storing it. A stored status is
 * a status that drifts: it needs a cron job to stay truthful, and it lies
 * between runs. paidThrough plus the clock is always correct.
 */
export function deriveBillingState(input: BillingStateInput): BillingState {
  const now = input.now ?? new Date();

  if (input.closed) {
    return {
      status: "CLOSED",
      hasAccess: false,
      daysRemaining: null,
      showPaymentWarning: false,
    };
  }

  //* Trial is only meaningful while the school has never paid.
  if (input.planTier === "TRIAL" && input.trialEndsAt && !input.paidThrough) {
    if (input.trialEndsAt > now) {
      return {
        status: "TRIALING",
        hasAccess: true,
        daysRemaining: wholeDaysBetween(now, input.trialEndsAt),
        showPaymentWarning: wholeDaysBetween(now, input.trialEndsAt) <= 7,
      };
    }

    return {
      status: "SUSPENDED",
      hasAccess: false,
      daysRemaining: 0,
      showPaymentWarning: true,
    };
  }

  if (!input.paidThrough) {
    return {
      status: "SUSPENDED",
      hasAccess: false,
      daysRemaining: 0,
      showPaymentWarning: true,
    };
  }

  if (input.paidThrough > now) {
    return {
      status: "ACTIVE",
      hasAccess: true,
      daysRemaining: wholeDaysBetween(now, input.paidThrough),
      showPaymentWarning: wholeDaysBetween(now, input.paidThrough) <= 14,
    };
  }

  const graceEnds = new Date(
    input.paidThrough.getTime() + GRACE_PERIOD_DAYS * MS_PER_DAY
  );

  if (graceEnds > now) {
    return {
      status: "GRACE",
      hasAccess: true,
      daysRemaining: wholeDaysBetween(now, graceEnds),
      showPaymentWarning: true,
    };
  }

  return {
    status: "SUSPENDED",
    hasAccess: false,
    daysRemaining: 0,
    showPaymentWarning: true,
  };
}

/** Formats pesewas as a display string, e.g. 60000 -> "GHS 600.00". */
export function formatPesewas(pesewas: number) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
  }).format(pesewas / 100);
}

/** Is this school over its enrollment ceiling? */
export function isOverStudentCap(tier: PlanTier, studentCount: number) {
  const cap = PLANS[tier].studentCap;
  return cap !== null && studentCount > cap;
}

/** Can one more student be added under this tier? */
export function canAddStudent(tier: PlanTier, currentStudentCount: number) {
  const cap = PLANS[tier].studentCap;
  return cap === null || currentStudentCount < cap;
}
