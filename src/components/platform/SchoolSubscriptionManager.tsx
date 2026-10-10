"use client";

import { useActionState, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, CreditCard, TriangleAlert } from "lucide-react";
import {
  grantSchoolPlanAction,
  type BillingActionResult,
} from "@/lib/billingActions";
import {
  GRANT_DURATION_LABELS,
  PAYMENT_METHOD_LABELS,
  PLANS,
  PLAN_TIERS,
  formatPesewas,
  priceForDuration,
  type GrantDuration,
  type PaymentMethod,
  type PlanTier,
} from "@/lib/plans";

export type SubscriptionSchoolRow = {
  id: string;
  schoolName: string;
  slug: string;
  planTier: PlanTier;
  planLabel: string;
  billingStatus: string;
  hasAccess: boolean;
  daysRemaining: number | null;
  paidThrough: string | null;
  trialEndsAt: string | null;
  studentCap: number | null;
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300",
  TRIALING:
    "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950/40 dark:text-sky-300",
  GRACE:
    "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-300",
  SUSPENDED:
    "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-300",
  CLOSED:
    "bg-gray-100 text-gray-600 ring-gray-500/20 dark:bg-gray-800 dark:text-gray-300",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  //* Far-future dates are the grandfather backfill, not a real expiry.
  if (parsed.getUTCFullYear() >= 2099) return "Grandfathered";
  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function SchoolSubscriptionManager({
  schools,
}: {
  schools: SubscriptionSchoolRow[];
}) {
  const [selectedId, setSelectedId] = useState(schools[0]?.id ?? "");
  const [tier, setTier] = useState<PlanTier>("STARTER");
  const [duration, setDuration] = useState<GrantDuration>("ONE_TERM");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [amountTouched, setAmountTouched] = useState(false);
  const [amount, setAmount] = useState("");

  const [state, formAction, pending] = useActionState(
    async (_previous: BillingActionResult | null, formData: FormData) =>
      grantSchoolPlanAction(formData),
    null
  );

  const selected = schools.find((school) => school.id === selectedId) ?? null;
  const isTrial = tier === "TRIAL";

  //* Suggested amount follows the tier and duration until the operator types
  //* their own figure, since cash received is often a negotiated number.
  const suggestedAmount = useMemo(() => {
    if (isTrial || duration === "CUSTOM") return "";
    return (priceForDuration(tier, duration) / 100).toFixed(2);
  }, [tier, duration, isTrial]);

  const amountValue = amountTouched ? amount : suggestedAmount;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-2">
        <CreditCard className="h-6 w-6 text-emerald-600" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Subscriptions
        </h2>
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Payments are collected in person. Record one here to grant or extend a
        school&apos;s access.
      </p>

      {/* ── Current state ─────────────────────── */}
      <div className="mt-5 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full min-w-[46rem] text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 font-semibold">School</th>
              <th className="px-4 py-3 font-semibold">Plan</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Runs until</th>
              <th className="px-4 py-3 font-semibold">Remaining</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {schools.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-gray-500 dark:text-gray-400"
                >
                  No schools onboarded yet.
                </td>
              </tr>
            )}
            {schools.map((school) => (
              <tr
                key={school.id}
                className={
                  school.id === selectedId
                    ? "bg-emerald-50/50 dark:bg-emerald-950/20"
                    : undefined
                }
              >
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setSelectedId(school.id)}
                    className="text-left font-medium text-gray-900 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:text-gray-100"
                  >
                    {school.schoolName}
                  </button>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {school.slug}
                  </p>
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                  {school.planLabel}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {school.studentCap === null
                      ? "Unlimited students"
                      : `Up to ${school.studentCap}`}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                      STATUS_STYLES[school.billingStatus] ?? STATUS_STYLES.CLOSED
                    }`}
                  >
                    {school.billingStatus}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums text-gray-700 dark:text-gray-300">
                  {formatDate(school.paidThrough ?? school.trialEndsAt)}
                </td>
                <td className="px-4 py-3 tabular-nums text-gray-700 dark:text-gray-300">
                  {school.daysRemaining === null
                    ? "—"
                    : `${school.daysRemaining} days`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Grant form ────────────────────────── */}
      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="tenantId" value={selectedId} />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              School
            </span>
            <select
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            >
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.schoolName}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Plan
            </span>
            <select
              name="planTier"
              value={tier}
              onChange={(event) => setTier(event.target.value as PlanTier)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            >
              {PLAN_TIERS.map((planTier) => (
                <option key={planTier} value={planTier}>
                  {PLANS[planTier].label}
                  {planTier !== "TRIAL" &&
                    ` — ${formatPesewas(PLANS[planTier].termPricePesewas)}/term`}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isTrial ? (
          <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-200">
            <CalendarClock className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              A 30-day trial will start today. No payment is recorded, and the
              school loses access when the trial expires unless a paid plan is
              granted.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Paid for
                </span>
                <select
                  name="duration"
                  value={duration}
                  onChange={(event) =>
                    setDuration(event.target.value as GrantDuration)
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                >
                  {(
                    Object.keys(GRANT_DURATION_LABELS) as GrantDuration[]
                  ).map((value) => (
                    <option key={value} value={value}>
                      {GRANT_DURATION_LABELS[value]}
                    </option>
                  ))}
                </select>
              </label>

              {duration === "CUSTOM" ? (
                <label className="block">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Runs until
                  </span>
                  <input
                    type="date"
                    name="customEndDate"
                    required
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  />
                </label>
              ) : (
                <label className="block">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    How paid
                  </span>
                  <select
                    name="method"
                    value={method}
                    onChange={(event) =>
                      setMethod(event.target.value as PaymentMethod)
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  >
                    {(
                      Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]
                    ).map((value) => (
                      <option key={value} value={value}>
                        {PAYMENT_METHOD_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {duration === "CUSTOM" && (
                <label className="block">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    How paid
                  </span>
                  <select
                    name="method"
                    value={method}
                    onChange={(event) =>
                      setMethod(event.target.value as PaymentMethod)
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  >
                    {(
                      Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]
                    ).map((value) => (
                      <option key={value} value={value}>
                        {PAYMENT_METHOD_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Amount received (GHS)
                </span>
                <input
                  type="number"
                  name="amountCedis"
                  min="0"
                  step="0.01"
                  value={amountValue}
                  onChange={(event) => {
                    setAmountTouched(true);
                    setAmount(event.target.value);
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm tabular-nums text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Receipt number
                </span>
                <input
                  type="text"
                  name="receiptReference"
                  placeholder="e.g. RCPT-0142"
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                />
                <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                  Optional, but prevents recording the same payment twice.
                </span>
              </label>
            </div>
          </>
        )}

        <label className="block">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Note
          </span>
          <input
            type="text"
            name="note"
            placeholder="Anything worth remembering about this payment"
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
        </label>

        {selected && !isTrial && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {selected.schoolName} is currently on{" "}
            <strong>{selected.planLabel}</strong>. Granting early adds to the
            remaining time rather than replacing it.
          </p>
        )}

        {state && (
          <div
            className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
              state.success
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200"
                : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200"
            }`}
          >
            {state.success ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            ) : (
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
            )}
            <p>{state.message}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={pending || !selectedId}
          className="inline-flex items-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending
            ? "Saving…"
            : isTrial
              ? "Start trial"
              : "Record payment and grant access"}
        </button>
      </form>
    </section>
  );
}
