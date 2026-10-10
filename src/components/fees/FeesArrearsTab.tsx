"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  FileDown,
  History,
  RotateCcw,
  Search,
  Send,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";
import { FeesArrearsSmsModal } from "@/components/sms/FeesArrearsSmsModal";
import { ParentSmsModal } from "@/components/sms/ParentSmsModal";
import { formatTermLabel } from "@/lib/termUtils";

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

export interface ArrearRow {
  studentId: string;
  name: string;
  level: number;
  className?: string;
  term: string;
  academicYear: string;
  priorArrears?: number;
  currentTermFees?: number;
  currentTermPaid?: number;
  totalFees: number;
  totalPaid: number;
  balance: number;
}

interface FeesArrearsTabProps {
  arrears: ArrearRow[];
  currentTerm: string;
  academicYear: string;
  search: string;
}

function formatCurrency(amount: number) {
  return `GHS ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function FeesArrearsTab({
  arrears,
  currentTerm,
  academicYear,
  search,
}: FeesArrearsTabProps) {
  const router = useRouter();
  const [isSearchPending, startSearchTransition] = useTransition();
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
  const [isParentSmsModalOpen, setIsParentSmsModalOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    new Set()
  );
  const [query, setQuery] = useState(search);

  const grandPriorArrears = arrears.reduce(
    (sum, row) => sum + (row.priorArrears || 0),
    0
  );
  const grandCurrentFees = arrears.reduce(
    (sum, row) => sum + (row.currentTermFees ?? row.totalFees),
    0
  );
  const grandTotalPaid = arrears.reduce((sum, row) => sum + row.totalPaid, 0);
  const grandBalance = arrears.reduce((sum, row) => sum + row.balance, 0);

  const selectedArrears = arrears.filter((row) =>
    selectedStudentIds.has(row.studentId)
  );
  const hasActiveSearch = Boolean(search.trim());

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudentIds(new Set(arrears.map((row) => row.studentId)));
      return;
    }

    setSelectedStudentIds(new Set());
  };

  const handleSelectStudent = (studentId: string, checked: boolean) => {
    const next = new Set(selectedStudentIds);

    if (checked) {
      next.add(studentId);
    } else {
      next.delete(studentId);
    }

    setSelectedStudentIds(next);
  };

  const buildArrearsUrl = (value: string) => {
    const params = new URLSearchParams();
    params.set("tab", "arrears");

    const trimmedValue = value.trim();
    if (trimmedValue) {
      params.set("search", trimmedValue);
    }

    return `/dashboard/fees?${params.toString()}`;
  };

  const handleSearchChange = (value: string) => {
    setQuery(value);
    startSearchTransition(() => {
      router.replace(buildArrearsUrl(value));
    });
  };

  const handleResetSearch = () => {
    setQuery("");
    router.push("/dashboard/fees?tab=arrears");
  };

  const handleExportPdf = () => {
    const targetRows = selectedStudentIds.size > 0 ? selectedArrears : arrears;
    if (targetRows.length === 0) return;

    const doc = new jsPDF({ orientation: "landscape" });
    const pdfDoc = doc as jsPDF & { lastAutoTable?: { finalY: number } };

    doc.setFontSize(18);
    doc.setTextColor(20);
    doc.text("Fees Arrears Register (Cumulative)", 14, 18);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(
      `Active Billing Window: ${formatTermLabel(currentTerm)} • ${academicYear}`,
      14,
      26
    );
    doc.text(
      `Generated: ${new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })} • Total Records: ${targetRows.length}`,
      14,
      32
    );

    const expPrior = targetRows.reduce(
      (sum, r) => sum + (r.priorArrears || 0),
      0
    );
    const expCurrent = targetRows.reduce(
      (sum, r) => sum + (r.currentTermFees ?? r.totalFees),
      0
    );
    const expPaid = targetRows.reduce((sum, r) => sum + r.totalPaid, 0);
    const expBalance = targetRows.reduce((sum, r) => sum + r.balance, 0);

    autoTable(doc, {
      startY: 38,
      head: [["Summary Metric", "Amount (GHS)"]],
      body: [
        ["Total Prior Arrears (Brought Forward)", expPrior.toFixed(2)],
        ["Total Current Term Billed", expCurrent.toFixed(2)],
        ["Total Confirmed Paid", expPaid.toFixed(2)],
        ["Total Cumulative Arrears Due", expBalance.toFixed(2)],
      ],
      styles: { fontSize: 8.5, cellPadding: 2 },
      headStyles: { fillColor: [234, 88, 12] },
      columnStyles: {
        0: { cellWidth: 75 },
        1: { cellWidth: 45, halign: "right" },
      },
    });

    autoTable(doc, {
      startY: (pdfDoc.lastAutoTable?.finalY ?? 38) + 8,
      head: [
        [
          "S/N",
          "Student ID",
          "Full Name",
          "Class",
          "Prior Arrears B/F (GHS)",
          "Current Bill (GHS)",
          "Paid (GHS)",
          "Total Arrears (GHS)",
        ],
      ],
      body: targetRows.map((r, i) => [
        String(i + 1),
        r.studentId,
        r.name,
        r.className || GRADE_NAMES[r.level] || `Grade ${r.level}`,
        (r.priorArrears ?? 0).toFixed(2),
        (r.currentTermFees ?? r.totalFees).toFixed(2),
        r.totalPaid.toFixed(2),
        r.balance.toFixed(2),
      ]),
      foot: [
        [
          "",
          "",
          `Total (${targetRows.length} students)`,
          "",
          expPrior.toFixed(2),
          expCurrent.toFixed(2),
          expPaid.toFixed(2),
          expBalance.toFixed(2),
        ],
      ],
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42] },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 12 },
        1: { cellWidth: 28 },
        2: { cellWidth: 50 },
        3: { cellWidth: 35 },
        4: { cellWidth: 38, halign: "right" },
        5: { cellWidth: 35, halign: "right" },
        6: { cellWidth: 35, halign: "right" },
        7: { cellWidth: 40, halign: "right" },
      },
    });

    const filePrefix =
      selectedStudentIds.size > 0 ? "selected-arrears" : "all-arrears";
    doc.save(
      `${filePrefix}-${currentTerm.toLowerCase().replace(/\s+/g, "-")}-${academicYear}.pdf`
    );
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-orange-50/70 p-6 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.22)] dark:border-white/10 dark:from-slate-950 dark:via-card dark:to-slate-900/80 dark:shadow-[0_24px_70px_-36px_rgba(15,23,42,0.95)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50/90 px-3 py-3 dark:border-orange-500/20 dark:bg-orange-500/10">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-700/80 dark:text-orange-200/80">
                  Finance Desk
                </p>
                <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Fees Arrears
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-foreground">
                {formatTermLabel(currentTerm)}
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-foreground">
                {academicYear}
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-muted-foreground">
                {arrears.length} student{arrears.length !== 1 ? "s" : ""} in
                arrears
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-muted-foreground">
                {selectedStudentIds.size} selected
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Stat Summary Metric Grid */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Prior Arrears Brought Forward */}
        <div className="relative overflow-hidden rounded-3xl border border-amber-200/80 bg-white/95 p-5 shadow-[0_18px_40px_-30px_rgba(245,158,11,0.28)] dark:border-amber-500/15 dark:bg-card/80 dark:shadow-[0_18px_40px_-28px_rgba(245,158,11,0.55)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Prior Arrears (B/F)
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-amber-600 dark:text-amber-400">
                {formatCurrency(grandPriorArrears)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Brought forward from previous terms/classes.
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              <History className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Current Term Billed */}
        <div className="relative overflow-hidden rounded-3xl border border-cyan-200/80 bg-white/95 p-5 shadow-[0_18px_40px_-30px_rgba(6,182,212,0.28)] dark:border-cyan-500/15 dark:bg-card/80 dark:shadow-[0_18px_40px_-28px_rgba(6,182,212,0.55)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Current Term Bill
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                {formatCurrency(grandCurrentFees)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                New bills issued for the active term.
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400">
              <Banknote className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Confirmed Paid */}
        <div className="relative overflow-hidden rounded-3xl border border-emerald-200/80 bg-white/95 p-5 shadow-[0_18px_40px_-30px_rgba(34,197,94,0.24)] dark:border-emerald-500/15 dark:bg-card/80 dark:shadow-[0_18px_40px_-28px_rgba(34,197,94,0.55)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Total Paid
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-emerald-600 dark:text-emerald-400">
                {formatCurrency(grandTotalPaid)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Payments recorded across all fee records.
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Cumulative Arrears Due */}
        <div className="relative overflow-hidden rounded-3xl border border-orange-200/80 bg-white/95 p-5 shadow-[0_18px_40px_-30px_rgba(249,115,22,0.24)] dark:border-orange-500/15 dark:bg-card/80 dark:shadow-[0_18px_40px_-28px_rgba(249,115,22,0.55)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Total Arrears
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-orange-600 dark:text-orange-400">
                {formatCurrency(grandBalance)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Cumulative debt: Prior B/F + Current Due.
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
        </div>
      </section>

      {/* Search and Action Toolbar */}
      <section className="rounded-[28px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.18)] backdrop-blur dark:border-white/10 dark:bg-card/70 dark:shadow-[0_24px_60px_-34px_rgba(15,23,42,0.9)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              <SlidersHorizontal className="h-4 w-4" />
              Search, Outreach &amp; Export
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Manage arrears and parent communication
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 dark:border-white/10 dark:bg-background/60 dark:text-muted-foreground">
              Showing {arrears.length} row{arrears.length !== 1 ? "s" : ""}
            </div>
            {hasActiveSearch ? (
              <button
                type="button"
                onClick={handleResetSearch}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-foreground dark:hover:bg-white/[0.08]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Search
              </button>
            ) : null}
            {selectedStudentIds.size > 0 ? (
              <button
                type="button"
                onClick={() => setSelectedStudentIds(new Set())}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-foreground dark:hover:bg-white/[0.08]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Clear Selection
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-end">
          <div className="flex-1 space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Search by Student Name, ID, or Class
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
              <input
                type="text"
                value={query}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search by student name, ID, or class name..."
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.45)] transition placeholder:text-slate-400 focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-background/70 dark:text-foreground dark:shadow-sm dark:placeholder:text-muted-foreground/55"
              />
              {isSearchPending ? (
                <span className="absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 animate-pulse rounded-full bg-blue-400" />
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Export PDF */}
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={arrears.length === 0}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-foreground dark:hover:bg-white/[0.08]"
            >
              <FileDown className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              {selectedStudentIds.size > 0
                ? `Export Selected (${selectedStudentIds.size}) PDF`
                : "Export Arrears PDF"}
            </button>

            {/* Broadcast SMS */}
            <button
              type="button"
              onClick={() => setIsSmsModalOpen(true)}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-5 text-sm font-semibold text-orange-700 transition hover:bg-orange-100 dark:border-orange-500/25 dark:bg-orange-500/10 dark:text-orange-100 dark:hover:bg-orange-500/20"
            >
              <Send className="h-4 w-4" />
              Broadcast SMS Alerts
            </button>

            {/* Send to Selected */}
            <button
              type="button"
              onClick={() => setIsParentSmsModalOpen(true)}
              disabled={selectedStudentIds.size === 0}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-50 dark:hover:bg-blue-500/20"
            >
              <Send className="h-4 w-4" />
              Send SMS to Selected ({selectedStudentIds.size})
            </button>
          </div>
        </div>
      </section>

      {/* Arrears Register Table */}
      <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-card/80 dark:shadow-[0_24px_60px_-34px_rgba(15,23,42,0.9)]">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Cumulative Arrears Register
            </p>
            <h3 className="text-base font-semibold text-foreground">
              Students with outstanding balances (Prior B/F + Current)
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Active window: {formatTermLabel(currentTerm)} • {academicYear}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:bg-white/[0.03] dark:text-muted-foreground">
              <tr>
                <th className="w-10 px-4 py-3 text-left font-semibold">
                  <input
                    type="checkbox"
                    checked={
                      selectedStudentIds.size === arrears.length &&
                      arrears.length > 0
                    }
                    onChange={(event) => handleSelectAll(event.target.checked)}
                    className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950/60 dark:text-blue-400"
                  />
                </th>
                <th className="px-4 py-3 text-left font-semibold">Student ID</th>
                <th className="px-4 py-3 text-left font-semibold">Full Name</th>
                <th className="px-4 py-3 text-left font-semibold">Class</th>
                <th className="px-4 py-3 text-right font-semibold">
                  Prior Arrears (B/F)
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  Current Bill
                </th>
                <th className="px-4 py-3 text-right font-semibold">Paid</th>
                <th className="px-4 py-3 text-right font-semibold">
                  Total Arrears
                </th>
              </tr>
            </thead>
            <tbody>
              {arrears.map((row, index) => {
                const prior = row.priorArrears ?? 0;
                const currentBill = row.currentTermFees ?? row.totalFees;
                const paid = row.totalPaid;
                const totalArrears = row.balance;

                return (
                  <tr
                    key={`${row.studentId}-${index}`}
                    className="border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-white/5 dark:hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.has(row.studentId)}
                        onChange={(event) =>
                          handleSelectStudent(row.studentId, event.target.checked)
                        }
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950/60 dark:text-blue-400"
                      />
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-blue-600 dark:text-blue-300">
                      {row.studentId}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-foreground">
                      {row.name}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {row.className ||
                        GRADE_NAMES[row.level] ||
                        `Grade ${row.level}`}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {prior > 0 ? (
                        <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                          {prior.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0.00</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-foreground">
                      {currentBill.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      {paid.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-orange-600 dark:text-orange-400">
                      {totalArrears.toFixed(2)}
                    </td>
                  </tr>
                );
              })}

              {arrears.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="mx-auto max-w-md space-y-2">
                      <p className="text-base font-semibold text-foreground">
                        No students with outstanding arrears
                      </p>
                      <p className="text-sm text-muted-foreground">
                        All student fees are fully cleared for the selected
                        criteria.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            {arrears.length > 0 ? (
              <tfoot className="border-t border-slate-200 bg-slate-50/80 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.03]">
                <tr>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3" colSpan={3}>
                    Total ({arrears.length} student
                    {arrears.length !== 1 ? "s" : ""})
                  </td>
                  <td className="px-4 py-3 text-right text-amber-700 dark:text-amber-300">
                    {grandPriorArrears.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">
                    {grandCurrentFees.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">
                    {grandTotalPaid.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-orange-600 dark:text-orange-400">
                    {grandBalance.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </section>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-[0_18px_38px_-34px_rgba(15,23,42,0.3)] sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-card/50 dark:text-muted-foreground dark:shadow-none">
        <span>
          Showing {arrears.length} student{arrears.length !== 1 ? "s" : ""} with
          outstanding balances
        </span>
        <span>{selectedStudentIds.size} selected for parent reminders</span>
      </div>

      <FeesArrearsSmsModal
        isOpen={isSmsModalOpen}
        onClose={() => setIsSmsModalOpen(false)}
      />

      <ParentSmsModal
        isOpen={isParentSmsModalOpen}
        onClose={() => setIsParentSmsModalOpen(false)}
        selectedStudents={selectedArrears}
      />
    </div>
  );
}
