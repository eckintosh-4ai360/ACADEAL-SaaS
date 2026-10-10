"use client";

import { useState, useTransition, useCallback } from "react";
import {
  Banknote, Plus, ChevronDown, ChevronUp, Trash2, CheckCircle2, CreditCard, X,
  Users, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createPayrollRun, approvePayrollRun, markPayrollPaid, deletePayrollRun,
  upsertPayrollEntry, deletePayrollEntry, getPayrollRunDetail,
} from "@/lib/hrActions";
import { useRouter } from "next/navigation";

type PayrollRunRow = {
  id: number;
  period: string;
  periodType: string;
  status: "DRAFT" | "APPROVED" | "PAID";
  totalGross: number;
  totalNet: number;
  currency: string;
  entryCount: number;
  createdByName: string;
  approvedByName: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  updatedAt: string;
  createdAt: string;
};

type StaffOption = {
  id: string;
  staffId: string;
  displayName: string;
  staffType: "ADMIN" | "TEACHER";
};

type EntryRow = {
  staffId: string;
  staffName: string;
  staffType: string;
  grossSalary: number;
  taxDeduction: number;
  ssnitDeduction: number;
  otherDeductions: number;
  netSalary: number;
  notes: string | null;
};

type EntryForm = {
  staffId: string;
  grossSalary: string;
  taxDeduction: string;
  ssnitDeduction: string;
  otherDeductions: string;
  notes: string;
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700",
  APPROVED: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-700",
  PAID: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700",
};

function fmt(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`;
}

export function PayrollClientPage({
  initialRuns,
  staffList,
}: {
  initialRuns: PayrollRunRow[];
  staffList: StaffOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showNewRunForm, setShowNewRunForm] = useState(false);
  const [expandedRun, setExpandedRun] = useState<number | null>(null);
  const [runEntries, setRunEntries] = useState<Record<number, EntryRow[]>>({});
  const [loadingEntries, setLoadingEntries] = useState<number | null>(null);

  // New Run form state
  const [newRunPeriod, setNewRunPeriod] = useState("");
  const [newRunType, setNewRunType] = useState<"MONTHLY" | "TERM">("MONTHLY");
  const [newRunCurrency, setNewRunCurrency] = useState("GHS");
  const [newRunNotes, setNewRunNotes] = useState("");

  // Entry form state
  const [entryForm, setEntryForm] = useState<EntryForm>({
    staffId: "", grossSalary: "", taxDeduction: "", ssnitDeduction: "", otherDeductions: "", notes: "",
  });
  const [addingEntryToRun, setAddingEntryToRun] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [smsNotice, setSmsNotice] = useState<string | null>(null);

  // Load entries for a run when expanded
  const loadEntries = useCallback(async (runId: number) => {
    setLoadingEntries(runId);
    try {
      const detail = await getPayrollRunDetail(runId);
      setRunEntries((prev) => ({
        ...prev,
        [runId]: detail.entries.map((e) => ({
          staffId: e.staffId,
          staffName: e.staffName,
          staffType: e.staffType,
          grossSalary: e.grossSalary,
          taxDeduction: e.taxDeduction,
          ssnitDeduction: e.ssnitDeduction,
          otherDeductions: e.otherDeductions,
          netSalary: e.netSalary,
          notes: e.notes,
        })),
      }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingEntries(null);
    }
  }, []);

  function handleToggleExpand(runId: number) {
    if (expandedRun === runId) {
      setExpandedRun(null);
    } else {
      setExpandedRun(runId);
      // Load entries if not cached
      if (!runEntries[runId]) {
        loadEntries(runId);
      }
    }
  }

  async function handleCreateRun() {
    if (!newRunPeriod.trim()) { setError("Period is required."); return; }
    setError(null);
    startTransition(async () => {
      try {
        await createPayrollRun({ period: newRunPeriod.trim(), periodType: newRunType, currency: newRunCurrency, notes: newRunNotes || undefined });
        setShowNewRunForm(false);
        setNewRunPeriod(""); setNewRunNotes("");
        router.refresh();
      } catch (e) { setError((e as Error).message); }
    });
  }

  async function handleApprove(runId: number) {
    startTransition(async () => {
      try { await approvePayrollRun(runId); router.refresh(); }
      catch (e) { setError((e as Error).message); }
    });
  }

  async function handleMarkPaid(runId: number) {
    startTransition(async () => {
      try {
        const result = await markPayrollPaid(runId);
        router.refresh();
        // Surface SMS delivery summary to the admin
        if (result.smsTotal > 0) {
          const msg =
            result.smsSent === result.smsTotal
              ? `Payroll marked as paid. ✓ SMS sent to all ${result.smsSent} staff member${result.smsSent !== 1 ? "s" : ""}.`
              : `Payroll marked as paid. SMS sent to ${result.smsSent} of ${result.smsTotal} staff (${result.smsTotal - result.smsSent} had no phone on record).`;
          setError(null);
          setSmsNotice(msg);
        }
      }
      catch (e) { setError((e as Error).message); }
    });
  }

  async function handleDelete(runId: number) {
    if (!confirm("Delete this DRAFT payroll run? This cannot be undone.")) return;
    startTransition(async () => {
      try { await deletePayrollRun(runId); router.refresh(); }
      catch (e) { setError((e as Error).message); }
    });
  }

  async function handleAddEntry(runId: number, currency: string) {
    const staff = staffList.find((s) => s.id === entryForm.staffId);
    if (!staff) { setError("Select a staff member."); return; }
    const gross = parseFloat(entryForm.grossSalary);
    if (isNaN(gross) || gross <= 0) { setError("Gross salary must be a positive number."); return; }
    setError(null);
    startTransition(async () => {
      try {
        await upsertPayrollEntry(runId, {
          staffId: staff.id,
          staffName: staff.displayName,
          staffType: staff.staffType,
          staffProfileId: staff.staffId,
          grossSalary: gross,
          taxDeduction: parseFloat(entryForm.taxDeduction) || 0,
          ssnitDeduction: parseFloat(entryForm.ssnitDeduction) || 0,
          otherDeductions: parseFloat(entryForm.otherDeductions) || 0,
          notes: entryForm.notes || undefined,
        });
        setEntryForm({ staffId: "", grossSalary: "", taxDeduction: "", ssnitDeduction: "", otherDeductions: "", notes: "" });
        setAddingEntryToRun(null);
        // Refresh cached entries
        await loadEntries(runId);
        router.refresh();
      } catch (e) { setError((e as Error).message); }
    });
  }

  async function handleDeleteEntry(runId: number, staffId: string) {
    if (!confirm("Remove this salary entry?")) return;
    startTransition(async () => {
      try {
        await deletePayrollEntry(runId, staffId);
        await loadEntries(runId);
        router.refresh();
      }
      catch (e) { setError((e as Error).message); }
    });
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Runs", value: initialRuns.length },
          { label: "Draft", value: initialRuns.filter((r) => r.status === "DRAFT").length },
          { label: "Approved", value: initialRuns.filter((r) => r.status === "APPROVED").length },
          { label: "Paid", value: initialRuns.filter((r) => r.status === "PAID").length },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border bg-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
            <p className="mt-1 text-2xl font-black">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* SMS notice */}
      {smsNotice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-center justify-between">
          <span>{smsNotice}</span>
          <button onClick={() => setSmsNotice(null)}><X className="h-4 w-4 text-emerald-600" /></button>
        </div>
      )}

      {/* Actions row */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Payroll Runs</h2>
        <Button onClick={() => setShowNewRunForm((v) => !v)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Payroll Run
        </Button>
      </div>

      {/* New run form */}
      {showNewRunForm && (
        <Card className="border-2 border-dashed border-indigo-300 bg-indigo-50/50 dark:border-indigo-500/40 dark:bg-indigo-950/30">
          <CardHeader>
            <CardTitle className="text-base">Create Payroll Run</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Period *</label>
                <input
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  placeholder="e.g. 2025-01 or 2025 Term 1"
                  value={newRunPeriod}
                  onChange={(e) => setNewRunPeriod(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Period Type</label>
                <select
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  value={newRunType}
                  onChange={(e) => setNewRunType(e.target.value as "MONTHLY" | "TERM")}
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="TERM">Term</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Currency</label>
                <select
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  value={newRunCurrency}
                  onChange={(e) => setNewRunCurrency(e.target.value)}
                >
                  <option value="GHS">GHS (Cedi)</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Notes (optional)</label>
              <textarea
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                rows={2}
                value={newRunNotes}
                onChange={(e) => setNewRunNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateRun} disabled={isPending} size="sm">
                {isPending ? "Creating…" : "Create Run"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowNewRunForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Run list */}
      {initialRuns.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
          No payroll runs yet. Create your first run to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {initialRuns.map((run) => {
            const isExpanded = expandedRun === run.id;
            const entries = runEntries[run.id] ?? [];
            const isLoadingThisRun = loadingEntries === run.id;

            return (
              <Card key={run.id} className="overflow-hidden">
                {/* Run header row */}
                <div
                  className="flex cursor-pointer items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                  onClick={() => handleToggleExpand(run.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-indigo-50 p-2 dark:bg-indigo-900/30">
                      <Banknote className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-semibold">{run.period}</p>
                      <p className="text-xs text-muted-foreground">
                        {run.periodType} · {run.entryCount} staff · Created by {run.createdByName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-bold">{fmt(run.totalNet, run.currency)}</p>
                      <p className="text-xs text-muted-foreground">Gross: {fmt(run.totalGross, run.currency)}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[run.status]}`}>
                      {run.status}
                    </span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t bg-muted/10 p-4 space-y-4">
                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                      {run.status === "DRAFT" && (
                        <>
                          <Button size="sm" variant="outline" className="gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            onClick={() => handleApprove(run.id)} disabled={isPending}>
                            <CheckCircle2 className="h-4 w-4" /> Approve Run
                          </Button>
                          <Button size="sm" variant="outline"
                            onClick={() => setAddingEntryToRun(addingEntryToRun === run.id ? null : run.id)} disabled={isPending}>
                            <Plus className="h-4 w-4" /> Add Staff Entry
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleDelete(run.id)} disabled={isPending}>
                            <Trash2 className="h-4 w-4" /> Delete
                          </Button>
                        </>
                      )}
                      {run.status === "APPROVED" && (
                        <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleMarkPaid(run.id)} disabled={isPending}>
                          <CreditCard className="h-4 w-4" /> Mark as Paid
                        </Button>
                      )}
                      {run.status === "PAID" && run.paidAt && (
                        <p className="text-xs text-muted-foreground self-center">
                          Paid on {new Date(run.paidAt).toLocaleDateString()} · Approved by {run.approvedByName}
                        </p>
                      )}
                    </div>

                    {/* Add entry form */}
                    {addingEntryToRun === run.id && run.status === "DRAFT" && (
                      <div className="rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 p-4 space-y-3 dark:border-indigo-500/40 dark:bg-indigo-950/30">
                        <p className="text-sm font-semibold">Add Staff Salary Entry</p>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          <div>
                            <label className="text-xs font-semibold text-muted-foreground">Staff Member *</label>
                            <select className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                              value={entryForm.staffId}
                              onChange={(e) => setEntryForm((f) => ({ ...f, staffId: e.target.value }))}>
                              <option value="">Select staff…</option>
                              {staffList.map((s) => (
                                <option key={s.id} value={s.id}>{s.displayName} ({s.staffType})</option>
                              ))}
                            </select>
                          </div>
                          {[
                            { key: "grossSalary", label: "Gross Salary *" },
                            { key: "taxDeduction", label: "Tax Deduction" },
                            { key: "ssnitDeduction", label: "SSNIT Deduction" },
                            { key: "otherDeductions", label: "Other Deductions" },
                          ].map(({ key, label }) => (
                            <div key={key}>
                              <label className="text-xs font-semibold text-muted-foreground">{label}</label>
                              <input type="number" min="0" step="0.01"
                                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                                value={entryForm[key as keyof EntryForm]}
                                onChange={(e) => setEntryForm((f) => ({ ...f, [key]: e.target.value }))} />
                            </div>
                          ))}
                          <div>
                            <label className="text-xs font-semibold text-muted-foreground">Notes</label>
                            <input className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                              value={entryForm.notes}
                              onChange={(e) => setEntryForm((f) => ({ ...f, notes: e.target.value }))} />
                          </div>
                        </div>
                        {entryForm.grossSalary && (
                          <p className="text-xs text-muted-foreground">
                            Net salary: <span className="font-semibold text-foreground">{fmt(
                              parseFloat(entryForm.grossSalary || "0") -
                              parseFloat(entryForm.taxDeduction || "0") -
                              parseFloat(entryForm.ssnitDeduction || "0") -
                              parseFloat(entryForm.otherDeductions || "0"),
                              run.currency
                            )}</span>
                          </p>
                        )}
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleAddEntry(run.id, run.currency)} disabled={isPending}>
                            {isPending ? "Saving…" : "Add Entry"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setAddingEntryToRun(null)}>Cancel</Button>
                        </div>
                      </div>
                    )}

                    {/* Entries table */}
                    {isLoadingThisRun ? (
                      <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading salary entries…
                      </div>
                    ) : entries.length === 0 ? (
                      <div className="flex items-center gap-2 rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {run.status === "DRAFT"
                          ? "No salary entries yet. Add staff entries above."
                          : "No salary entries were recorded for this run."}
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border">
                        <table className="w-full min-w-[640px] text-sm">
                          <thead className="bg-muted/30 text-left">
                            <tr>
                              <th className="px-4 py-2.5 font-semibold text-xs">Staff</th>
                              <th className="px-4 py-2.5 font-semibold text-xs">Type</th>
                              <th className="px-4 py-2.5 font-semibold text-xs text-right">Gross</th>
                              <th className="px-4 py-2.5 font-semibold text-xs text-right">Tax</th>
                              <th className="px-4 py-2.5 font-semibold text-xs text-right">SSNIT</th>
                              <th className="px-4 py-2.5 font-semibold text-xs text-right">Other</th>
                              <th className="px-4 py-2.5 font-semibold text-xs text-right">Net</th>
                              {run.status === "DRAFT" && (
                                <th className="px-4 py-2.5 font-semibold text-xs" />
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {entries.map((entry) => (
                              <tr key={entry.staffId} className="border-t hover:bg-muted/20 transition-colors">
                                <td className="px-4 py-2.5 font-medium">{entry.staffName}</td>
                                <td className="px-4 py-2.5 text-muted-foreground">{entry.staffType}</td>
                                <td className="px-4 py-2.5 text-right">{fmt(entry.grossSalary, run.currency)}</td>
                                <td className="px-4 py-2.5 text-right text-red-600">
                                  {entry.taxDeduction > 0 ? `-${fmt(entry.taxDeduction, run.currency)}` : "—"}
                                </td>
                                <td className="px-4 py-2.5 text-right text-red-600">
                                  {entry.ssnitDeduction > 0 ? `-${fmt(entry.ssnitDeduction, run.currency)}` : "—"}
                                </td>
                                <td className="px-4 py-2.5 text-right text-red-600">
                                  {entry.otherDeductions > 0 ? `-${fmt(entry.otherDeductions, run.currency)}` : "—"}
                                </td>
                                <td className="px-4 py-2.5 text-right font-bold">{fmt(entry.netSalary, run.currency)}</td>
                                {run.status === "DRAFT" && (
                                  <td className="px-4 py-2.5">
                                    <button
                                      className="text-muted-foreground hover:text-red-600 transition-colors"
                                      onClick={() => handleDeleteEntry(run.id, entry.staffId)}
                                      disabled={isPending}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="border-t bg-muted/20">
                            <tr>
                              <td colSpan={2} className="px-4 py-2.5 text-xs font-semibold">
                                {entries.length} staff member{entries.length !== 1 ? "s" : ""}
                              </td>
                              <td className="px-4 py-2.5 text-right text-xs font-semibold">
                                {fmt(run.totalGross, run.currency)}
                              </td>
                              <td colSpan={3} />
                              <td className="px-4 py-2.5 text-right text-xs font-bold text-emerald-700">
                                {fmt(run.totalNet, run.currency)}
                              </td>
                              {run.status === "DRAFT" && <td />}
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
