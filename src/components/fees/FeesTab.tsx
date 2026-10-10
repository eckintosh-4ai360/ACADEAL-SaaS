"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordFeePayment, deleteAllFees, editFee, resendReceipt } from "@/lib/feeActions";
import { buildAcademicYearOptions } from "@/lib/academicYear";
import { formatTermLabel, normalizeTermValue } from "@/lib/termUtils";
import { toast } from "react-toastify";
import {
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  Filter,
  Loader2,
  Pencil,
  Printer,
  ReceiptText,
  RotateCcw,
  Search,
  Send,
  SlidersHorizontal,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

interface Student {
  id: string;
  studentId: string;
  name: string;
  surname: string;
  grade: { level: number };
  class: { name: string };
}

interface FeeRow {
  id: number;
  title: string;
  amount: number;
  paidAmount: number;
  status: string;
  term: string;
  academicYear: string;
  student: Student;
}

interface FeesTabProps {
  fees: FeeRow[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  gradeLevel: string;
  className: string;
  totalFees: number;
  totalPaid: number;
  totalArrears: number;
  /** All grade levels from the DB — used to populate the Level filter dropdown */
  allGradeLevels: number[];
  /** All class names from the DB — used to populate the Class filter dropdown */
  allClassNames: string[];
  allAcademicYears: string[];
  /** Currently selected term (from URL param or system default) */
  selectedTerm: string;
  /** Currently selected academic year (from URL param or system default) */
  selectedAcademicYear: string;
  /** System's current term (for highlighting) */
  currentTerm: string;
  /** System's current academic year (for highlighting) */
  currentAcademicYear: string;
  canEditFeeRecords: boolean;
  canRecordFeePayments: boolean;
  canViewPaymentList: boolean;
}

const GRADE_NAMES: Record<number, string> = {
  1: "CRECHE", 2: "NURSERY 1", 3: "NURSERY 2", 4: "KG 1", 5: "KG 2",
  6: "BASIC 1", 7: "BASIC 2", 8: "BASIC 3", 9: "BASIC 4", 10: "BASIC 5",
  11: "BASIC 6", 12: "JHS 1", 13: "JHS 2", 14: "JHS 3",
};

function formatCurrency(amount: number) {
  return `GH₵ ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Removed local formatTermLabel in favor of import from @/lib/termUtils

// ─── EDIT FEE MODAL ─────────────────────────────────
function EditFeeModal({ fee, onClose }: { fee: FeeRow; onClose: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(fee.title);
  const [amount, setAmount] = useState(String(fee.amount));
  const [paidAmount, setPaidAmount] = useState(String(fee.paidAmount));
  const [description, setDescription] = useState("");
  const [term, setTerm] = useState(fee.term);
  const [academicYear, setAcademicYear] = useState(fee.academicYear);
  const [status, setStatus] = useState<"PENDING" | "PAID" | "OVERDUE">(fee.status as "PENDING" | "PAID" | "OVERDUE");

  const handleSave = () => {
    const amt = parseFloat(amount);
    const paid = parseFloat(paidAmount);
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (isNaN(amt) || amt < 0) { toast.error("Enter a valid amount"); return; }
    if (isNaN(paid) || paid < 0) { toast.error("Enter a valid paid amount"); return; }
    if (paid > amt) { toast.error("Paid amount cannot exceed total amount"); return; }

    startTransition(async () => {
      const result = await editFee(fee.id, {
        title,
        amount: amt,
        paidAmount: paid,
        description,
        dueDate: new Date(),
        term,
        academicYear,
        status,
      });
      if (result.success) {
        toast.success("✅ Fee record updated successfully");
        router.refresh();
        onClose();
      } else {
        toast.error(result.message);
      }
    });
  };

  const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 transition focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-background/70 dark:text-foreground";
  const labelCls = "block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_32px_80px_-24px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 dark:border-white/10 dark:from-amber-500/10 dark:to-orange-500/10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <Pencil className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700/80 dark:text-amber-300/80">Super Admin Only</p>
              <h3 className="text-base font-semibold text-foreground">Edit Fee Record</h3>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-slate-100 dark:hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-2.5 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            ⚠️ Editing this record will be logged in the audit trail. Changes are irreversible.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Fee Title</label>
              <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Tuition Fee" />
            </div>
            <div>
              <label className={labelCls}>Total Amount (GHS)</label>
              <input className={inputCls} type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Paid Amount (GHS)</label>
              <input className={inputCls} type="number" min="0" step="0.01" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Term</label>
              <select className={inputCls} value={term} onChange={e => setTerm(e.target.value)}>
                <option value="One">Term One</option>
                <option value="Two">Term Two</option>
                <option value="Three">Term Three</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Academic Year</label>
              <input className={inputCls} value={academicYear} onChange={e => setAcademicYear(e.target.value)} placeholder="e.g. 2024/2025" />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={status} onChange={e => setStatus(e.target.value as "PENDING" | "PAID" | "OVERDUE")}>
                <option value="PENDING">PENDING</option>
                <option value="PAID">PAID</option>
                <option value="OVERDUE">OVERDUE</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Description (optional)</label>
              <input className={inputCls} value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional note" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-white/10">
          <button onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-background dark:text-foreground dark:hover:bg-white/[0.06]">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

interface ReceiptInfo {
  receiptNumber: string | null;
  receiptUrl: string | null;
  smsStatus: string | null;
  smsRecipient: string | null;
  smsError: string | null;
}

function SmsStatusBadge({ status, error }: { status: string | null; error: string | null }) {
  if (!status) return <span className="text-xs text-muted-foreground">No log</span>;
  const cls =
    status === "SENT"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
      : status === "FAILED"
        ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
        : status === "SKIPPED"
          ? "border-slate-200 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300"
          : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}
      title={error ?? undefined}
    >
      {status}
    </span>
  );
}

function PayRow({
  fee,
  canEditFeeRecords,
  canRecordFeePayments,
  onEdit,
}: {
  fee: FeeRow;
  canEditFeeRecords: boolean;
  canRecordFeePayments: boolean;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isResending, startResendTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [receiptInfo, setReceiptInfo] = useState<ReceiptInfo | null>(null);

  const arrears = Math.max(fee.amount - fee.paidAmount, 0);

  const handlePay = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (amt > arrears) { toast.error("Amount exceeds balance"); return; }
    startTransition(async () => {
      const result = await recordFeePayment(fee.id, amt, "CASH");
      if (result.success) {
        toast.success(`✅ Payment recorded. Receipt: ${result.receiptNumber}`);
        setAmount("");
        // Show inline receipt info
        if (result.receiptNumber) {
          setReceiptInfo({
            receiptNumber: result.receiptNumber,
            receiptUrl: `/receipt/${encodeURIComponent(result.receiptNumber)}`,
            smsStatus: "PENDING",
            smsRecipient: null,
            smsError: null,
          });
          // Refresh slightly delayed to let the DB settle
          setTimeout(() => router.refresh(), 500);
        } else {
          router.refresh();
        }
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleResend = () => {
    startResendTransition(async () => {
      const result = await resendReceipt(fee.id);
      if (result.success) {
        toast.success(`✅ ${result.message}`);
        setReceiptInfo(prev => prev ? { ...prev, smsStatus: "SENT", smsError: null } : prev);
        router.refresh();
      } else {
        toast.error(result.message);
        setReceiptInfo(prev => prev ? { ...prev, smsStatus: "FAILED", smsError: result.message } : prev);
      }
    });
  };

  return (
    <>
    <tr className="border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-white/5 dark:hover:bg-white/[0.03]">
      <td className="px-4 py-3 text-xs font-medium text-blue-600 dark:text-blue-300">
        {fee.student.studentId}
      </td>
      <td className="px-4 py-3 text-sm font-semibold text-foreground">
        {fee.student.name} {fee.student.surname}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {GRADE_NAMES[fee.student.grade.level] ?? `Grade ${fee.student.grade.level}`}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{fee.student.class.name}</td>
      <td className="px-4 py-3">
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
          fee.status === "PAID"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
            : fee.status === "OVERDUE"
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
              : "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300"
        }`}>
          {fee.status}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-sm font-medium text-foreground">
        {fee.amount.toFixed(2)}
      </td>
      <td className="px-4 py-3 text-right text-sm font-medium text-emerald-600 dark:text-emerald-400">
        {fee.paidAmount.toFixed(2)}
      </td>
      <td className={`px-4 py-3 text-right text-sm font-semibold ${arrears > 0 ? "text-orange-600 dark:text-orange-300" : "text-emerald-600 dark:text-emerald-300"}`}>
        {arrears.toFixed(2)}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="h-10 w-28 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.45)] transition placeholder:text-slate-400 focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-background/70 dark:text-foreground dark:shadow-sm dark:placeholder:text-muted-foreground/60"
            min="0"
            step="0.01"
            disabled={!canRecordFeePayments || fee.status === "PAID"}
          />
          <button
            onClick={handlePay}
            disabled={!canRecordFeePayments || isPending || fee.status === "PAID"}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100 dark:hover:bg-blue-500/15"
          >
            {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            {!canRecordFeePayments
              ? "No Receipt Access"
              : fee.status === "PAID"
                ? "Full Payment"
                : "Receive Payment"}
          </button>
          {canEditFeeRecords && (
            <button
              onClick={onEdit}
              title="Edit fee record (Super Admin only)"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700 transition hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* ── Receipt panel — shown immediately after payment is recorded ── */}
        {receiptInfo?.receiptNumber && (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-3 py-2 dark:border-emerald-500/20 dark:bg-emerald-500/10">
            <ReceiptText className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              {receiptInfo.receiptNumber}
            </span>
            <SmsStatusBadge status={receiptInfo.smsStatus} error={receiptInfo.smsError} />
            {receiptInfo.smsRecipient && (
              <span className="text-[10px] text-muted-foreground">{receiptInfo.smsRecipient}</span>
            )}
            <a
              href={receiptInfo.receiptUrl ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-background dark:text-foreground dark:hover:bg-white/[0.08]"
            >
              <Printer className="h-3 w-3" />
              Print
            </a>
            {canRecordFeePayments && (
              <button
                onClick={handleResend}
                disabled={isResending}
                title="Resend receipt SMS to parent"
                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100 dark:hover:bg-blue-500/15"
              >
                {isResending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                Resend SMS
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
    </>
  );
}

export function FeesTab({
  fees,
  total,
  page,
  pageSize,
  search,
  gradeLevel,
  className,
  totalFees,
  totalPaid,
  totalArrears,
  allGradeLevels,
  allClassNames,
  allAcademicYears,
  selectedTerm,
  selectedAcademicYear,
  currentTerm,
  currentAcademicYear,
  canEditFeeRecords,
  canRecordFeePayments,
  canViewPaymentList,
}: FeesTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingFee, setEditingFee] = useState<FeeRow | null>(null);
  const [searchText, setSearchText] = useState(search);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const academicYearOptions = buildAcademicYearOptions([
    currentAcademicYear,
    selectedAcademicYear,
    ...allAcademicYears,
  ]);
  const selectedAcademicYearLabel =
    academicYearOptions.find((option) => option.value === selectedAcademicYear)?.label ??
    selectedAcademicYear;
  const termOptions = Array.from(
    new Set(
      [selectedTerm, currentTerm, "One", "Two", "Three"].map(normalizeTermValue)
    )
  );
  const showingFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, total);
  const hasActiveFilters =
    Boolean(search.trim()) ||
    Boolean(gradeLevel) ||
    Boolean(className) ||
    selectedTerm !== currentTerm ||
    selectedAcademicYear !== currentAcademicYear;
  const fieldClassName =
    "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.45)] transition focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-background/70 dark:text-foreground dark:shadow-sm";
  const clearFiltersUrl = (() => {
    const params = new URLSearchParams();
    params.set("tab", "fees");
    params.set("page", "1");
    params.set("pageSize", String(pageSize));
    params.set("term", currentTerm);
    params.set("academicYear", currentAcademicYear);
    return `/dashboard/fees?${params.toString()}`;
  })();

  const handleDeleteAllFees = () => {
    if (!confirm("⚠️ This will DELETE ALL fee records from all students. This action cannot be undone. Continue?")) return;
    startTransition(async () => {
      const result = await deleteAllFees();
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const pageUrl = (p: number, filterGrade?: string, filterClass?: string, term?: string, year?: string) => {
    const params = new URLSearchParams();
    params.set("tab", "fees");
    params.set("page", String(p));
    params.set("pageSize", String(pageSize));
    if (search) params.set("search", search);
    // Term filter
    params.set("term", term !== undefined ? term : selectedTerm);
    params.set("academicYear", year !== undefined ? year : selectedAcademicYear);
    if (filterGrade !== undefined) {
      if (filterGrade) params.set("gradeLevel", filterGrade);
    } else if (gradeLevel) {
      params.set("gradeLevel", gradeLevel);
    }
    if (filterClass !== undefined) {
      if (filterClass) params.set("className", filterClass);
    } else if (className) {
      params.set("className", className);
    }
    return `/dashboard/fees?${params.toString()}`;
  };

  const searchUrl = (value: string) => {
    const params = new URLSearchParams();
    params.set("tab", "fees");
    params.set("page", "1");
    params.set("pageSize", String(pageSize));
    params.set("term", selectedTerm);
    params.set("academicYear", selectedAcademicYear);
    const trimmedValue = value.trim();
    if (trimmedValue) params.set("search", trimmedValue);
    if (gradeLevel) params.set("gradeLevel", gradeLevel);
    if (className) params.set("className", className);
    return `/dashboard/fees?${params.toString()}`;
  };

  const handleSearchChange = (value: string) => {
    setSearchText(value);
    startTransition(() => {
      router.replace(searchUrl(value));
    });
  };

  return (
    <>
    <div className="space-y-6">
      {/* ── Compact single-row header ─────────────────────────────────────── */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 shadow-sm dark:border-white/10 dark:bg-card/80">

        {/* Left: icon + title + pills */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
            <Banknote className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground leading-none mb-0.5">Finance Desk</p>
            <h2 className="text-base font-bold tracking-tight text-foreground leading-none">Student Fees</h2>
          </div>
          {/* Term / year / count pills */}
          <div className="hidden sm:flex items-center gap-1.5 ml-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-foreground">
              {formatTermLabel(selectedTerm)}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-foreground">
              {selectedAcademicYearLabel}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] text-slate-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-muted-foreground">
              {total} records
            </span>
          </div>
        </div>

        {/* Centre: 3 inline stat chips */}
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-1.5 dark:border-white/10 dark:bg-white/[0.04]">
            <Banknote className="h-3.5 w-3.5 text-cyan-500" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Fees</span>
            <span className="ml-1 font-bold text-foreground">{formatCurrency(totalFees)}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200/60 bg-emerald-50/60 px-3 py-1.5 dark:border-emerald-500/15 dark:bg-emerald-500/10">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Paid</span>
            <span className="ml-1 font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(totalPaid)}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl border border-orange-200/60 bg-orange-50/60 px-3 py-1.5 dark:border-orange-500/15 dark:bg-orange-500/10">
            <Wallet className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-400">Arrears</span>
            <span className="ml-1 font-bold text-orange-700 dark:text-orange-300">{formatCurrency(totalArrears)}</span>
          </div>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-2">
          {canViewPaymentList ? (
            <a
              href="/dashboard/fees?tab=payments"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-100 dark:hover:bg-blue-500/20"
            >
              <ReceiptText className="h-3.5 w-3.5" />
              Generate Receipt
              <ArrowUpRight className="h-3.5 w-3.5 opacity-70" />
            </a>
          ) : null}
          {canEditFeeRecords ? (
            <button
              onClick={handleDeleteAllFees}
              disabled={isPending || fees.length === 0}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-100 dark:hover:bg-red-500/15"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete All Fees
            </button>
          ) : null}
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.18)] backdrop-blur dark:border-white/10 dark:bg-card/70 dark:shadow-[0_24px_60px_-34px_rgba(15,23,42,0.9)]">
        {/* Top mini-bar: Filters label + count + reset */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 dark:border-white/10 dark:bg-background/60 dark:text-muted-foreground">
              Showing {showingFrom}–{showingTo} of {total}
            </span>
            {hasActiveFilters ? (
              <button
                onClick={() => {
                  setSearchText("");
                  router.push(clearFiltersUrl);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-foreground dark:hover:bg-white/[0.08]"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            ) : null}
          </div>
        </div>

        {/* All controls on one row at xl: 5 dropdowns (1 col each) + search (2 cols) = 7 */}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              Term
            </label>
            <select
              className={fieldClassName}
              value={selectedTerm}
              onChange={(e) => {
                router.push(pageUrl(1, undefined, undefined, e.target.value, undefined));
              }}
            >
              {termOptions.map((termOption) => (
                <option key={termOption} value={termOption}>
                  {termOption === currentTerm
                    ? `${formatTermLabel(termOption)} • Current`
                    : formatTermLabel(termOption)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              Academic Year
            </label>
            <select
              className={fieldClassName}
              value={selectedAcademicYear}
              onChange={(e) => {
                router.push(pageUrl(1, undefined, undefined, undefined, e.target.value));
              }}
            >
              {academicYearOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.value === currentAcademicYear
                    ? `${option.label} • Current`
                    : option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              Level
            </label>
            <select
              className={fieldClassName}
              value={gradeLevel}
              onChange={(e) => {
                router.push(pageUrl(1, e.target.value, undefined));
              }}
            >
              <option value="">All Levels</option>
              {allGradeLevels.map((level) => (
                <option key={level} value={String(level)}>
                  {GRADE_NAMES[level] ?? `Grade ${level}`}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              Class
            </label>
            <select
              className={fieldClassName}
              value={className}
              onChange={(e) => {
                router.push(pageUrl(1, undefined, e.target.value));
              }}
            >
              <option value="">All Classes</option>
              {allClassNames.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Page Size
            </label>
            <select
              className={fieldClassName}
              defaultValue={pageSize}
              onChange={(e) => {
                const params = new URLSearchParams();
                params.set("tab", "fees");
                params.set("pageSize", e.target.value);
                params.set("term", selectedTerm);
                params.set("academicYear", selectedAcademicYear);
                if (search) params.set("search", search);
                if (gradeLevel) params.set("gradeLevel", gradeLevel);
                if (className) params.set("className", className);
                router.push(`/dashboard/fees?${params.toString()}`);
              }}
            >
              {[5, 10, 25, 50, 100].map((count) => (
                <option key={count} value={count}>
                  {count} rows
                </option>
              ))}
            </select>
          </div>

          {/* Search spans 2 cols — fills the 7th col slot, giving a wider search box */}
          <div className="space-y-1.5 xl:col-span-2">
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Search
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
              <input
                type="text"
                placeholder="Search student name or ID"
                value={searchText}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.45)] transition placeholder:text-slate-400 focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-background/70 dark:text-foreground dark:shadow-sm dark:placeholder:text-muted-foreground/55"
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-card/80 dark:shadow-[0_24px_60px_-34px_rgba(15,23,42,0.9)]">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Fee Register
            </p>
            <h3 className="text-base font-semibold text-foreground">
              Student balances and payment intake
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Active window: {formatTermLabel(selectedTerm)} • {selectedAcademicYearLabel}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:bg-white/[0.03] dark:text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Student ID</th>
                <th className="px-4 py-3 text-left font-semibold">Full Name</th>
                <th className="px-4 py-3 text-left font-semibold">Level</th>
                <th className="px-4 py-3 text-left font-semibold">Class</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Total Fees</th>
                <th className="px-4 py-3 text-right font-semibold">Paid</th>
                <th className="px-4 py-3 text-right font-semibold">Arrears</th>
                <th className="px-4 py-3 text-left font-semibold">Receive Payment</th>
              </tr>
            </thead>
            <tbody>
              {fees.map((fee) => (
                <PayRow
                  key={fee.id}
                  fee={fee}
                  canEditFeeRecords={canEditFeeRecords}
                  canRecordFeePayments={canRecordFeePayments}
                  onEdit={() => setEditingFee(fee)}
                />
              ))}
              {fees.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center">
                    <div className="mx-auto max-w-md space-y-2">
                      <p className="text-base font-semibold text-foreground">
                        No fee records match these filters
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Try a different term, academic year, class, or search value.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-[0_18px_38px_-34px_rgba(15,23,42,0.3)] sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-card/50 dark:text-muted-foreground dark:shadow-none">
        <span>
          Showing {showingFrom} to {showingTo} of {total} entries
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => router.push(pageUrl(1))}
            className="rounded-xl border border-slate-200 px-3 py-1.5 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/[0.04]"
          >
            First
          </button>
          {page > 1 ? (
            <button
              onClick={() => router.push(pageUrl(page - 1))}
              className="rounded-xl border border-slate-200 px-3 py-1.5 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/[0.04]"
            >
              Previous
            </button>
          ) : null}
          {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
            const pageNum = Math.max(1, page - 2) + index;
            if (pageNum > totalPages) return null;

            return (
              <button
                key={pageNum}
                onClick={() => router.push(pageUrl(pageNum))}
                className={`rounded-xl border px-3 py-1.5 transition ${
                  pageNum === page
                    ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/60 dark:bg-blue-500/15 dark:text-blue-100"
                    : "border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/[0.04]"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          {page < totalPages ? (
            <button
              onClick={() => router.push(pageUrl(page + 1))}
              className="rounded-xl border border-slate-200 px-3 py-1.5 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/[0.04]"
            >
              Next
            </button>
          ) : null}
          <button
            onClick={() => router.push(pageUrl(totalPages))}
            className="rounded-xl border border-slate-200 px-3 py-1.5 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/[0.04]"
          >
            Last
          </button>
        </div>
      </div>
    </div>

    {/* Edit Fee Modal — Super Admin Only */}
    {editingFee && (
      <EditFeeModal
        fee={editingFee}
        onClose={() => setEditingFee(null)}
      />
    )}
    </>
  );
}
