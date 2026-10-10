"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  FileDown,
  FileText,
  FileUp,
  Loader2,
  Printer,
  ReceiptText,
  Search,
  Send,
  Wallet,
} from "lucide-react";
import { toast } from "react-toastify";
import { resendReceipt } from "@/lib/feeActions";
import {
  exportPaymentListToExcel,
  exportPaymentListToPDF,
} from "@/lib/fee-payment-list-export";
import { ImportFeesModal } from "@/components/fees/ImportFeesModal";
import {
  getPaymentFilterLabel,
  type PaymentListFilter,
  type PaymentListRecord,
  type PaymentRecordStatus,
} from "@/lib/fee-payment-list";

const GRADE_NAMES: Record<number, string> = {
  1: "CRECHE",
  2: "NURSERY 1",
  3: "NURSERY 2",
  4: "KG 1",
  5: "KG 2",
  6: "BASIC 1",
  7: "BASIC 2",
  8: "BASIC 3",
  9: "BASIC 4",
  10: "BASIC 5",
  11: "BASIC 6",
  12: "JHS 1",
  13: "JHS 2",
  14: "JHS 3",
};

const FILTER_OPTIONS: Array<{
  value: PaymentListFilter;
  label: string;
  description: string;
}> = [
  {
    value: "all",
    label: "All Records",
    description: "Every billed fee item in the payment list.",
  },
  {
    value: "full",
    label: "Full Payment",
    description: "Only fully settled fee records.",
  },
  {
    value: "arrears",
    label: "Arrears",
    description: "Part payment and no payment records.",
  },
];

interface PaymentListTabProps {
  payments: PaymentListRecord[];
  exportPayments: PaymentListRecord[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  paymentStatus: PaymentListFilter;
  totalBilled: number;
  totalPaid: number;
  totalBalance: number;
  fullPaymentCount: number;
  arrearsCount: number;
  canRecordFeePayments?: boolean;
  canEditFeeRecords?: boolean;
}

function formatCurrency(amount: number) {
  return `GHS ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getGradeLabel(level: number) {
  return GRADE_NAMES[level] ?? `Grade ${level}`;
}

function getStatusBadgeClass(status: PaymentRecordStatus) {
  if (status === "Full Payment") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";
  }

  if (status === "Part Payment") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
  }

  return "border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200";
}

function getMethodBadgeClass(method: string | null) {
  if (method === "CASH") {
    return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300";
  }

  if (method === "MOMO") {
    return "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300";
  }

  if (method === "ONLINE") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
  }

  return "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300";
}

function getDeliveryBadgeClass(status: PaymentListRecord["receiptDeliveryStatus"]) {
  if (status === "SENT") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";
  }

  if (status === "FAILED") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300";
  }

  if (status === "PENDING") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
  }

  if (status === "SKIPPED") {
    return "border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200";
  }

  return "border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-muted-foreground";
}

export function PaymentListTab({
  payments,
  exportPayments,
  total,
  page,
  pageSize,
  search,
  paymentStatus,
  totalBilled,
  totalPaid,
  totalBalance,
  fullPaymentCount,
  arrearsCount,
  canRecordFeePayments = false,
  canEditFeeRecords = false,
}: PaymentListTabProps) {
  const router = useRouter();
  const [searchText, setSearchText] = useState(search);
  const [isSearchPending, startSearchTransition] = useTransition();
  const [resendingFeeId, setResendingFeeId] = useState<number | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const handleResend = async (feeId: number) => {
    setResendingFeeId(feeId);
    try {
      const result = await resendReceipt(feeId);
      if (result.success) {
        toast.success(`✅ ${result.message}`);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Resend error:", error);
      toast.error("An unexpected error occurred while resending the receipt.");
    } finally {
      setResendingFeeId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const showingFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, total);
  const hasRecords = exportPayments.length > 0;

  const buildUrl = (overrides?: {
    page?: number;
    pageSize?: number;
    paymentStatus?: PaymentListFilter;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    const nextPage = overrides?.page ?? page;
    const nextPageSize = overrides?.pageSize ?? pageSize;
    const nextPaymentStatus = overrides?.paymentStatus ?? paymentStatus;
    const nextSearch = overrides?.search ?? search;

    params.set("tab", "payments");
    params.set("page", String(nextPage));
    params.set("pageSize", String(nextPageSize));

    if (nextSearch.trim()) {
      params.set("search", nextSearch.trim());
    }

    if (nextPaymentStatus !== "all") {
      params.set("paymentStatus", nextPaymentStatus);
    }

    return `/dashboard/fees?${params.toString()}`;
  };

  const handleSearchChange = (value: string) => {
    setSearchText(value);
    startSearchTransition(() => {
      router.replace(buildUrl({ page: 1, search: value }));
    });
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-orange-50/70 p-6 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.22)] dark:border-white/10 dark:from-slate-950 dark:via-card dark:to-slate-900/80 dark:shadow-[0_24px_70px_-36px_rgba(15,23,42,0.95)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50/90 px-3 py-3 dark:border-orange-500/20 dark:bg-orange-500/10">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                <ReceiptText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-700/80 dark:text-orange-200/80">
                  Finance Desk
                </p>
                <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Payment List
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-foreground">
                {getPaymentFilterLabel(paymentStatus)}
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-muted-foreground">
                {total} record{total !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 xl:justify-end">
            <button
              type="button"
              onClick={() => exportPaymentListToExcel(exportPayments, paymentStatus)}
              disabled={!hasRecords}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100 dark:hover:bg-emerald-500/15"
            >
              <FileDown className="h-4 w-4" />
              Export Excel
            </button>
            <button
              type="button"
              onClick={() => exportPaymentListToPDF(exportPayments, paymentStatus)}
              disabled={!hasRecords}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-5 text-sm font-semibold text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-100 dark:hover:bg-orange-500/15"
            >
              <FileText className="h-4 w-4" />
              Export PDF
            </button>
            {canEditFeeRecords && (
              <button
                type="button"
                onClick={() => setIsImportOpen(true)}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100 dark:hover:bg-blue-500/15"
              >
                <FileUp className="h-4 w-4" />
                Import Edited Fees
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="relative overflow-hidden rounded-3xl border border-cyan-200/80 bg-white/95 p-5 shadow-[0_18px_40px_-30px_rgba(6,182,212,0.28)] dark:border-cyan-500/15 dark:bg-card/80 dark:shadow-[0_18px_40px_-28px_rgba(6,182,212,0.55)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Total Billed
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                {formatCurrency(totalBilled)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Gross billed amount in the current payment filter.
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400">
              <ReceiptText className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-emerald-200/80 bg-white/95 p-5 shadow-[0_18px_40px_-30px_rgba(34,197,94,0.24)] dark:border-emerald-500/15 dark:bg-card/80 dark:shadow-[0_18px_40px_-28px_rgba(34,197,94,0.55)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Full Payments
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-emerald-600 dark:text-emerald-400">
                {fullPaymentCount}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Fully settled fee records with {formatCurrency(totalPaid)} confirmed.
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-orange-200/80 bg-white/95 p-5 shadow-[0_18px_40px_-30px_rgba(249,115,22,0.24)] dark:border-orange-500/15 dark:bg-card/80 dark:shadow-[0_18px_40px_-28px_rgba(249,115,22,0.55)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Arrears
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-orange-600 dark:text-orange-400">
                {arrearsCount}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Outstanding balance still due totals {formatCurrency(totalBalance)}.
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.18)] backdrop-blur dark:border-white/10 dark:bg-card/70 dark:shadow-[0_24px_60px_-34px_rgba(15,23,42,0.9)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">
              Filter payment status
            </h3>
            <p className="text-sm text-muted-foreground">
              Arrears includes both part payment and no payment records.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((option) => {
              const isActive = paymentStatus === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    router.push(
                      buildUrl({
                        page: 1,
                        paymentStatus: option.value,
                      })
                    )
                  }
                  className={[
                    "rounded-2xl border px-4 py-2 text-left transition",
                    isActive
                      ? "border-orange-300 bg-orange-50 text-orange-700 shadow-[0_14px_30px_-22px_rgba(234,88,12,0.3)] dark:border-orange-500/35 dark:bg-orange-500/15 dark:text-orange-100"
                      : "border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50/70 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:border-orange-500/25 dark:hover:bg-orange-500/10",
                  ].join(" ")}
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.18em]">
                    {option.label}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {option.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[260px] flex-1 md:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchText}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Search student, receipt, fee item, class..."
              className="h-10 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400/40 dark:border-white/10 dark:bg-background/70 dark:text-foreground"
            />
            {isSearchPending ? (
              <span className="absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 animate-pulse rounded-full bg-orange-400" />
            ) : null}
          </div>

          <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 dark:border-white/10 dark:bg-background/60 dark:text-muted-foreground">
            Showing {showingFrom} to {showingTo} of {total} records
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Show</span>
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400/40 dark:border-white/10 dark:bg-background/70 dark:text-foreground"
              value={pageSize}
              onChange={(event) =>
                router.push(
                  buildUrl({
                    page: 1,
                    pageSize: Number(event.target.value),
                  })
                )
              }
            >
              {[10, 25, 50, 100].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <span>entries</span>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-3xl border border-slate-200/80 dark:border-white/10">
          <table className="w-full min-w-[1650px] text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-[0.16em] text-white">
              <tr>
                <th className="px-3 py-3 text-left">Student ID</th>
                <th className="px-3 py-3 text-left">Student</th>
                <th className="px-3 py-3 text-left">Level</th>
                <th className="px-3 py-3 text-left">Class</th>
                <th className="px-3 py-3 text-left">Fee Item</th>
                <th className="px-3 py-3 text-left">Term</th>
                <th className="px-3 py-3 text-left">Year</th>
                <th className="px-3 py-3 text-right">Total</th>
                <th className="px-3 py-3 text-right">Paid</th>
                <th className="px-3 py-3 text-right">Balance</th>
                <th className="px-3 py-3 text-left">Status</th>
                <th className="px-3 py-3 text-left">Last Receipt</th>
                <th className="px-3 py-3 text-left">Delivery</th>
                <th className="px-3 py-3 text-left">Receipt</th>
                <th className="px-3 py-3 text-left">Last Payment</th>
                <th className="px-3 py-3 text-left">Method</th>
                <th className="px-3 py-3 text-left">Recorded By</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => {
                const receiptHref = payment.lastReceiptNumber
                  ? `/receipt/${encodeURIComponent(payment.lastReceiptNumber)}`
                  : payment.lastReceiptUrl;

                return (
                  <tr
                    key={payment.id}
                    className="border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-white/5 dark:hover:bg-white/[0.03]"
                  >
                  <td className="px-3 py-3 font-mono text-xs text-blue-700 dark:text-blue-300">
                    {payment.student.studentId}
                  </td>
                  <td className="px-3 py-3 text-sm font-semibold text-foreground">
                    {payment.student.name} {payment.student.surname}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {getGradeLabel(payment.student.gradeLevel)}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {payment.student.className}
                  </td>
                  <td className="px-3 py-3 text-sm text-foreground">
                    {payment.feeTitle}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {payment.term}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {payment.academicYear}
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-foreground">
                    {payment.totalAmount.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                    {payment.paidAmount.toFixed(2)}
                  </td>
                  <td
                    className={[
                      "px-3 py-3 text-right font-semibold",
                      payment.balance > 0
                        ? "text-orange-600 dark:text-orange-300"
                        : "text-emerald-600 dark:text-emerald-300",
                    ].join(" ")}
                  >
                    {payment.balance.toFixed(2)}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={[
                        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                        getStatusBadgeClass(payment.paymentStatus),
                      ].join(" ")}
                    >
                      {payment.paymentStatus}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                    {receiptHref && payment.lastReceiptNumber ? (
                      <a
                        href={receiptHref}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-blue-700 underline-offset-2 hover:underline dark:text-blue-300"
                      >
                        {payment.lastReceiptNumber}
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="space-y-1">
                      <span
                        className={[
                          "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                          getDeliveryBadgeClass(payment.receiptDeliveryStatus),
                        ].join(" ")}
                        title={payment.receiptDeliveryError ?? undefined}
                      >
                        {payment.receiptDeliveryStatus ?? "NO LOG"}
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        {payment.receiptDeliveryRecipient ?? "No recipient"}
                      </p>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {receiptHref ? (
                        <a
                          href={receiptHref}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-foreground dark:hover:bg-white/[0.08]"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          Print
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                      {canRecordFeePayments && payment.lastReceiptNumber && (
                        <button
                          onClick={() => handleResend(payment.id)}
                          disabled={resendingFeeId === payment.id}
                          title="Resend receipt SMS to parent"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100 dark:hover:bg-blue-500/15"
                        >
                          {resendingFeeId === payment.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          Resend SMS
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {payment.lastPaidAt
                      ? format(new Date(payment.lastPaidAt), "dd/MM/yyyy HH:mm")
                      : "No payment yet"}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={[
                        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        getMethodBadgeClass(payment.lastPaymentMethod),
                      ].join(" ")}
                    >
                      {payment.lastPaymentMethod ?? "NONE"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {payment.lastRecordedBy ?? "-"}
                  </td>
                  </tr>
                );
              })}
              {payments.length === 0 ? (
                <tr>
                  <td
                    colSpan={17}
                    className="px-3 py-14 text-center text-sm text-muted-foreground"
                  >
                    No payment records found for the selected filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Page {Math.min(page, totalPages)} of {totalPages}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={buildUrl({ page: 1 })}
              className="rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-foreground dark:hover:bg-white/[0.08]"
            >
              First
            </a>
            {page > 1 ? (
              <a
                href={buildUrl({ page: page - 1 })}
                className="rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-foreground dark:hover:bg-white/[0.08]"
              >
                Previous
              </a>
            ) : null}
            {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
              const startPage = Math.max(1, page - 2);
              const nextPage = startPage + index;

              if (nextPage > totalPages) {
                return null;
              }

              return (
                <a
                  key={nextPage}
                  href={buildUrl({ page: nextPage })}
                  className={[
                    "rounded-xl border px-3 py-2 font-semibold transition",
                    nextPage === page
                      ? "border-orange-500 bg-orange-500 text-white"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-foreground dark:hover:bg-white/[0.08]",
                  ].join(" ")}
                >
                  {nextPage}
                </a>
              );
            })}
            {page < totalPages ? (
              <a
                href={buildUrl({ page: page + 1 })}
                className="rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-foreground dark:hover:bg-white/[0.08]"
              >
                Next
              </a>
            ) : null}
            <a
              href={buildUrl({ page: totalPages })}
              className="rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-foreground dark:hover:bg-white/[0.08]"
            >
              Last
            </a>
          </div>
        </div>

        {paymentStatus === "arrears" ? (
          <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50/80 px-4 py-3 text-sm text-orange-800 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-100">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
              <p>
                Arrears combines students who have paid only part of their bill
                and students who have not made any payment yet.
              </p>
            </div>
          </div>
        ) : null}
      </section>

      {canEditFeeRecords && (
        <ImportFeesModal open={isImportOpen} onOpenChange={setIsImportOpen} />
      )}
    </div>
  );
}
