"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileText, Loader2, Plus, Search, Send, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deletePayslip, publishPayslips } from "@/lib/payslipActions";
import { formatCedis, formatSalaryMonth } from "@/lib/payslip";

type PayslipRow = {
  id: number;
  staffId: string;
  staffType: string;
  salaryMonth: string;
  employeeId: string | null;
  title: string | null;
  fullName: string;
  designation: string | null;
  totalGross: number;
  totalDeductions: number;
  netSalary: number;
  publishedAt: string | null;
  updatedAt: string;
};

const ALL_MONTHS = "ALL";

export function PayslipsClientPage({
  payslips,
  storageReady,
}: {
  payslips: PayslipRow[];
  storageReady: boolean;
}) {
  const router = useRouter();
  const [month, setMonth] = useState(ALL_MONTHS);
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  //* Rows arrive newest month first, so this list is already in order.
  const months = [...new Set(payslips.map((payslip) => payslip.salaryMonth))];
  const needle = query.trim().toLowerCase();
  const visible = payslips.filter(
    (payslip) =>
      (month === ALL_MONTHS || payslip.salaryMonth === month) &&
      (!needle ||
        payslip.fullName.toLowerCase().includes(needle) ||
        (payslip.employeeId ?? "").toLowerCase().includes(needle))
  );
  const totalGross = visible.reduce((sum, payslip) => sum + payslip.totalGross, 0);
  const totalNet = visible.reduce((sum, payslip) => sum + payslip.netSalary, 0);
  //* Bulk publishing acts on exactly what the filters show, so pick a month to
  //* release that month's payslips to every teacher at once.
  const drafts = visible.filter((payslip) => !payslip.publishedAt);
  const monthScope = month === ALL_MONTHS ? "" : ` for ${formatSalaryMonth(month)}`;

  async function handlePublishAll() {
    if (drafts.length === 0) return;
    const count = `${drafts.length} draft payslip${drafts.length === 1 ? "" : "s"}${monthScope}`;
    const confirmed = window.confirm(
      `Publish ${count}? Each teacher will be able to view and print their own payslip under My Payslips.`
    );
    if (!confirmed) return;

    setPublishing(true);
    setError(null);
    setNotice(null);
    try {
      const result = await publishPayslips(drafts.map((payslip) => payslip.id));
      if (!result.success) {
        setError(result.error);
        return;
      }
      setNotice(`Published ${result.count} payslip${result.count === 1 ? "" : "s"}${monthScope}.`);
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setPublishing(false);
    }
  }

  async function handleDelete(payslip: PayslipRow) {
    const label = `${payslip.fullName}'s payslip for ${formatSalaryMonth(payslip.salaryMonth)}`;
    const warning = payslip.publishedAt ? " The teacher will no longer be able to see it." : "";
    if (!window.confirm(`Delete ${label}?${warning} This cannot be undone.`)) return;

    setDeletingId(payslip.id);
    setError(null);
    setNotice(null);
    try {
      const result = await deletePayslip(payslip.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Payslips", value: String(visible.length) },
          { label: "Published", value: `${visible.length - drafts.length} of ${visible.length}` },
          { label: "Total gross", value: formatCedis(totalGross) },
          { label: "Total net pay", value: formatCedis(totalNet) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-black">{stat.value}</p>
          </div>
        ))}
      </div>

      {!storageReady && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Payslip storage isn&apos;t set up for this school yet. You can still prepare and print payslips,
          but they won&apos;t be saved until the platform administrator runs the tenant migrations.
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {notice}
          </span>
          <button type="button" aria-label="Dismiss" onClick={() => setNotice(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
          <button type="button" aria-label="Dismiss" onClick={() => setError(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Payslips</h2>
          <p className="text-sm text-muted-foreground">
            One payslip per staff member per month. Teachers see a payslip under My Payslips once it
            is published.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/dashboard/hr/payslips/new">
            <Plus className="h-4 w-4" /> New payslip
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search payslips</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm"
            placeholder="Search by name or employee ID"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="sm:w-56">
          <span className="sr-only">Salary month</span>
          <select
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          >
            <option value={ALL_MONTHS}>All months</option>
            {months.map((value) => (
              <option key={value} value={value}>
                {formatSalaryMonth(value)}
              </option>
            ))}
          </select>
        </label>
        {visible.length > 0 && (
          <Button
            onClick={handlePublishAll}
            disabled={!storageReady || publishing || drafts.length === 0}
            className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {publishing
              ? "Publishing…"
              : drafts.length === 0
                ? "All published"
                : query.trim()
                  ? `Publish shown drafts (${drafts.length})`
                  : `Publish to all teachers (${drafts.length})`}
          </Button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
          <FileText className="mx-auto h-8 w-8" />
          <p className="mt-3 text-sm">
            {payslips.length === 0
              ? "No payslips yet. Create the first one for a teacher or staff member."
              : "No payslips match this search."}
          </p>
          {payslips.length === 0 && (
            <Button asChild variant="outline" size="sm" className="mt-4 gap-2">
              <Link href="/dashboard/hr/payslips/new">
                <Plus className="h-4 w-4" /> New payslip
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-muted/30 text-left">
              <tr>
                <th className="px-4 py-2.5 text-xs font-semibold">Staff</th>
                <th className="px-4 py-2.5 text-xs font-semibold">Designation</th>
                <th className="px-4 py-2.5 text-xs font-semibold">Salary month</th>
                <th className="px-4 py-2.5 text-xs font-semibold">Status</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold">Total gross</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold">Deductions</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold">Net salary</th>
                <th className="px-4 py-2.5 text-xs font-semibold">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((payslip) => (
                <tr key={payslip.id} className="border-t transition-colors hover:bg-muted/20">
                  <td className="px-4 py-2.5">
                    <Link href={`/dashboard/hr/payslips/${payslip.id}`} className="font-medium hover:underline">
                      {[payslip.title, payslip.fullName].filter(Boolean).join(" ")}
                    </Link>
                    {payslip.employeeId && (
                      <p className="text-xs text-muted-foreground">{payslip.employeeId}</p>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{payslip.designation || "—"}</td>
                  <td className="px-4 py-2.5">{formatSalaryMonth(payslip.salaryMonth)}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                        payslip.publishedAt
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                      }`}
                    >
                      {payslip.publishedAt ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">{formatCedis(payslip.totalGross)}</td>
                  <td className="px-4 py-2.5 text-right text-red-600">
                    {payslip.totalDeductions > 0 ? `-${formatCedis(payslip.totalDeductions)}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold">{formatCedis(payslip.netSalary)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/dashboard/hr/payslips/${payslip.id}`}>Open</Link>
                      </Button>
                      <button
                        type="button"
                        aria-label={`Delete ${payslip.fullName}'s payslip for ${formatSalaryMonth(payslip.salaryMonth)}`}
                        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/40"
                        disabled={deletingId !== null}
                        onClick={() => handleDelete(payslip)}
                      >
                        {deletingId === payslip.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
