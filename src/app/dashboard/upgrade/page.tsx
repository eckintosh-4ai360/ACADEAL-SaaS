import { Lock, Check } from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { findControlPlaneSchoolTenantByHostname } from "@/lib/control-plane";
import { getRequestHostname } from "@/lib/tenant";
import {
  BUNDLE_MODULES,
  PLANS,
  formatPesewas,
  lowestTierWithModule,
  type PlanTier,
} from "@/lib/plans";

export const dynamic = "force-dynamic";

type UpgradePageProps = {
  searchParams?: Promise<{ module?: string }>;
};

//* Route segment -> the name a headteacher would actually use for it.
const MODULE_LABELS: Record<string, string> = {
  fees: "Fees",
  finance: "Finance",
  collections: "Collections",
  excursion: "Excursions",
  inventory: "Inventory",
  sms: "SMS",
  "email-templates": "Email templates",
  hr: "HR & Payroll",
  "my-payslips": "Teacher payslips",
  behavior: "Behaviour",
  analytics: "Analytics",
  logs: "Activity logs",
  utilities: "Utilities",
  "acadeal-ai": "AI Assistant",
  "system-chat": "System chat",
  announcements: "Announcements",
  events: "Events",
  messages: "Messages",
  notifications: "Notifications",
  meetings: "Parent meetings",
  parents: "Parents",
};

function moduleLabel(segment: string) {
  return MODULE_LABELS[segment] ?? segment.replace(/-/g, " ");
}

function modulesAddedBy(tier: PlanTier, currentTier: PlanTier) {
  const current = new Set(
    PLANS[currentTier].bundles.flatMap((bundle) => BUNDLE_MODULES[bundle])
  );

  return PLANS[tier].bundles
    .flatMap((bundle) => BUNDLE_MODULES[bundle])
    .filter((segment) => !current.has(segment));
}

export default async function UpgradePage({ searchParams }: UpgradePageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const resolved = searchParams ? await searchParams : undefined;
  const requestedModule = resolved?.module?.trim() ?? "";

  const hostname = await getRequestHostname();
  const tenant = await findControlPlaneSchoolTenantByHostname(hostname);
  const currentTier: PlanTier = tenant?.planTier ?? "ENTERPRISE";

  const requiredTier = requestedModule
    ? lowestTierWithModule(requestedModule)
    : null;
  const targetTier: PlanTier = requiredTier ?? "GROWTH";
  const targetPlan = PLANS[targetTier];
  const unlocked = modulesAddedBy(targetTier, currentTier);
  const isAdmin = session.user.role === "admin";

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/40 dark:bg-amber-950/20">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-amber-100 p-3 dark:bg-amber-900/40">
            <Lock className="h-6 w-6 text-amber-700 dark:text-amber-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {requestedModule
                ? `${moduleLabel(requestedModule)} is not on your current plan`
                : "This feature is not on your current plan"}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Your school is on the{" "}
              <strong>{PLANS[currentTier].label}</strong> plan. Moving to{" "}
              <strong>{targetPlan.label}</strong> unlocks it.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {targetPlan.label}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {targetPlan.blurb}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
              {formatPesewas(targetPlan.termPricePesewas)}
            </p>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              per term
            </p>
          </div>
        </div>

        <dl className="mt-5 grid gap-3 border-t border-gray-100 pt-5 text-sm dark:border-gray-700 sm:grid-cols-2">
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Student limit</dt>
            <dd className="font-semibold text-gray-900 dark:text-gray-100">
              {targetPlan.studentCap === null
                ? "Unlimited"
                : `Up to ${targetPlan.studentCap.toLocaleString()}`}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Paid yearly</dt>
            <dd className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">
              {formatPesewas(targetPlan.yearPricePesewas)}{" "}
              <span className="font-normal text-emerald-600 dark:text-emerald-400">
                (save {formatPesewas(
                  targetPlan.termPricePesewas * 3 - targetPlan.yearPricePesewas
                )})
              </span>
            </dd>
          </div>
        </dl>

        {unlocked.length > 0 && (
          <div className="mt-5 border-t border-gray-100 pt-5 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              What this adds
            </h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {unlocked.map((segment) => (
                <li
                  key={segment}
                  className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="capitalize">{moduleLabel(segment)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800/50">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          {isAdmin ? "How to upgrade" : "Ask your administrator"}
        </h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {isAdmin
            ? "Contact the platform team to change your plan. Payment can be made by mobile money, bank transfer or cash, and the new modules become available as soon as the payment is recorded."
            : "Only a school administrator can change the school's plan. Let them know which feature you needed."}
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
