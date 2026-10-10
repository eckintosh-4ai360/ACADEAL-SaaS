"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Wallet, TrendingUp, TrendingDown, Plus, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OperationsReportExport } from "@/components/reports/OperationsReportExport";
import {
  createFinanceEntry,
  updateFinanceEntry,
  deleteFinanceEntry,
} from "@/lib/financeActions";

type FinanceEntryRow = {
  id: number;
  type: "INCOME" | "EXPENSE";
  category: string;
  amount: number;
  description: string;
  paymentMethod: string;
  entryDate: string;
  recordedByName: string;
  createdAt: string;
};

const INCOME_CATEGORIES = ["Donations", "Grants", "Rental Income", "Fundraising", "Other Income"];
const EXPENSE_CATEGORIES = [
  "Utilities",
  "Maintenance",
  "Supplies",
  "Transport",
  "Marketing",
  "Other Expense",
];
const PAYMENT_METHODS = ["CASH", "MOMO", "ONLINE"] as const;

function currency(amount: number) {
  return `GHS ${amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function FinanceClientPage({
  entries,
  total,
  page,
  pageSize,
  totalIncome,
  totalExpense,
  incomeThisMonth,
  expenseThisMonth,
  activeType,
}: {
  entries: FinanceEntryRow[];
  total: number;
  page: number;
  pageSize: number;
  totalIncome: number;
  totalExpense: number;
  incomeThisMonth: number;
  expenseThisMonth: number;
  activeType?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const emptyForm = {
    type: "INCOME" as "INCOME" | "EXPENSE",
    category: "",
    amount: "",
    description: "",
    paymentMethod: "CASH" as (typeof PAYMENT_METHODS)[number],
    entryDate: new Date().toISOString().slice(0, 10),
  };
  const [form, setForm] = useState(emptyForm);

  const netBalance = totalIncome - totalExpense;
  const netThisMonth = incomeThisMonth - expenseThisMonth;

  function openCreateForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(entry: FinanceEntryRow) {
    setForm({
      type: entry.type,
      category: entry.category,
      amount: String(entry.amount),
      description: entry.description,
      paymentMethod: entry.paymentMethod as (typeof PAYMENT_METHODS)[number],
      entryDate: entry.entryDate.slice(0, 10),
    });
    setEditingId(entry.id);
    setShowForm(true);
  }

  async function handleSubmit() {
    const amount = parseFloat(form.amount);
    if (!form.category.trim()) { setError("Category is required."); return; }
    if (!form.description.trim()) { setError("Description is required."); return; }
    if (!amount || amount <= 0) { setError("Enter a valid amount."); return; }
    setError(null);

    const input = {
      type: form.type,
      category: form.category.trim(),
      amount,
      description: form.description.trim(),
      paymentMethod: form.paymentMethod,
      entryDate: new Date(form.entryDate),
    };

    startTransition(async () => {
      try {
        if (editingId) {
          await updateFinanceEntry(editingId, input);
        } else {
          await createFinanceEntry(input);
        }
        setShowForm(false);
        setEditingId(null);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  async function handleDelete() {
    if (deleteTarget === null) return;
    startTransition(async () => {
      try {
        await deleteFinanceEntry(deleteTarget);
        setDeleteTarget(null);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  const totalPages = Math.ceil(total / pageSize);
  const categorySuggestions = form.type === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  function buildUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const merged = { type: activeType, page: page.toString(), ...overrides };
    Object.entries(merged).forEach(([k, v]) => { if (v) p.set(k, v); });
    return `/dashboard/finance?${p.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-900 p-6 text-white shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Finance</p>
        <h1 className="text-3xl font-black tracking-tight">Income & Expense Management</h1>
        <p className="mt-1 max-w-xl text-sm text-slate-300">
          Track non-fee income and running expenses in a single categorized ledger.
        </p>
        <div className="mt-6">
          <OperationsReportExport kind="finance" />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border bg-emerald-50 border-emerald-200 p-4 dark:bg-emerald-950/30 dark:border-emerald-800">
          <p className="text-xs text-emerald-700 uppercase tracking-wide dark:text-emerald-400">Total Income</p>
          <p className="mt-1 text-xl font-black text-emerald-800 dark:text-emerald-300">{currency(totalIncome)}</p>
        </div>
        <div className="rounded-2xl border bg-red-50 border-red-200 p-4 dark:bg-red-950/30 dark:border-red-800">
          <p className="text-xs text-red-700 uppercase tracking-wide dark:text-red-400">Total Expenses</p>
          <p className="mt-1 text-xl font-black text-red-800 dark:text-red-300">{currency(totalExpense)}</p>
        </div>
        <div className={`rounded-2xl border p-4 ${netBalance >= 0 ? "bg-sky-50 border-sky-200 dark:bg-sky-950/30 dark:border-sky-800" : "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"}`}>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Net Balance</p>
          <p className="mt-1 text-xl font-black">{currency(netBalance)}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Net This Month</p>
          <p className="mt-1 text-xl font-black">{currency(netThisMonth)}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap gap-2">
          {["", "INCOME", "EXPENSE"].map((t) => (
            <Link key={t || "all"} href={buildUrl({ type: t || undefined, page: "1" })}>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                (activeType ?? "") === t ? "bg-foreground text-background" : "bg-card hover:bg-muted"
              }`}>
                {t === "INCOME" ? "Income" : t === "EXPENSE" ? "Expenses" : "All"}
              </span>
            </Link>
          ))}
        </div>
        <Button onClick={openCreateForm} className="gap-2">
          <Plus className="h-4 w-4" /> Add Entry
        </Button>
      </div>

      {showForm && (
        <Card className="border-2 border-dashed border-emerald-300 bg-emerald-50/50 dark:border-emerald-600/40 dark:bg-emerald-950/30">
          <CardHeader><CardTitle className="text-base">{editingId ? "Edit Entry" : "Add Finance Entry"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Type *</label>
                <select className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "INCOME" | "EXPENSE", category: "" }))}>
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Category *</label>
                <input list="category-suggestions" className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. Utilities" />
                <datalist id="category-suggestions">
                  {categorySuggestions.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Amount (GHS) *</label>
                <input type="number" min="0" step="0.01" className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Date *</label>
                <input type="date" className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  value={form.entryDate} onChange={(e) => setForm((f) => ({ ...f, entryDate: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Payment Method</label>
                <select className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  value={form.paymentMethod}
                  onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value as (typeof PAYMENT_METHODS)[number] }))}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Description *</label>
              <textarea rows={2} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSubmit} disabled={isPending}>
                {isPending ? "Saving…" : editingId ? "Save Changes" : "Add Entry"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
          No finance entries match your current filters.
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`rounded-xl p-2 ${entry.type === "INCOME" ? "bg-emerald-50 dark:bg-emerald-900/30" : "bg-red-50 dark:bg-red-900/30"}`}>
                    {entry.type === "INCOME"
                      ? <TrendingUp className="h-5 w-5 text-emerald-600" />
                      : <TrendingDown className="h-5 w-5 text-red-600" />}
                  </div>
                  <div>
                    <p className="font-semibold">{entry.category}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.entryDate).toLocaleDateString()} · {entry.paymentMethod} · by {entry.recordedByName}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{entry.description}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-lg font-black ${entry.type === "INCOME" ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
                    {entry.type === "INCOME" ? "+" : "-"}{currency(entry.amount)}
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openEditForm(entry)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setDeleteTarget(entry.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={buildUrl({ page: (page - 1).toString() })}>
                <Button variant="outline" size="sm">Previous</Button>
              </Link>
            )}
            {page < totalPages && (
              <Link href={buildUrl({ page: (page + 1).toString() })}>
                <Button variant="outline" size="sm">Next</Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {deleteTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Wallet className="h-5 w-5" /> Delete Finance Entry
            </h3>
            <p className="text-sm text-muted-foreground">
              This will permanently remove this entry from the ledger. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button onClick={handleDelete} disabled={isPending} className="bg-red-600 hover:bg-red-700 text-white">
                {isPending ? "Deleting…" : "Confirm Delete"}
              </Button>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
