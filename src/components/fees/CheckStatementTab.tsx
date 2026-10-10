"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FileDown, FileText, Loader2, CalendarDays, Search } from "lucide-react";
import { utils, writeFile } from "xlsx";

interface FeePaymentRecord {
  id: number;
  amount: number;
  paymentMethod: string;
  receiptNumber: string;
  paidAt: string;
  notes: string | null;
}

interface FeeRecord {
  id: number;
  title: string;
  amount: number;
  paidAmount: number;
  status: string;
  term: string;
  academicYear: string;
  dueDate: string;
  payments: FeePaymentRecord[];
}

interface StudentStatement {
  studentId: string;
  name: string;
  surname: string;
  level: string;
  className: string;
  fees: FeeRecord[];
  totalBilled: number;
  totalPaid: number;
  totalBalance: number;
}

interface FeeCollectionReportPayment {
  id: number;
  receiptNumber: string;
  amount: number;
  paymentMethod: string;
  term: string;
  academicYear: string;
  recordedBy: string;
  notes: string | null;
  paidAt: string;
  feeTitle: string;
  student: {
    studentId: string;
    name: string;
    surname: string;
    level: number;
    className: string;
  };
}

interface FeeCollectionMethodSummary {
  method: string;
  amount: number;
  count: number;
}

interface FeeCollectionReport {
  fromDate: string;
  toDate: string;
  totalCollected: number;
  totalRecords: number;
  totalsByMethod: FeeCollectionMethodSummary[];
  payments: FeeCollectionReportPayment[];
}

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

const today = format(new Date(), "yyyy-MM-dd");
const sectionClassName =
  "space-y-5 rounded-xl border border-slate-200/80 bg-white/95 p-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.16)] dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-[0_18px_40px_-30px_rgba(2,6,23,0.75)]";
const inputClassName =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.3)] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:placeholder:text-slate-500 dark:shadow-none";
const subtleCardClassName =
  "rounded-lg border border-slate-200 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-900/70";

function formatMoney(amount: number) {
  return `GHS ${amount.toFixed(2)}`;
}

function formatDateLabel(value: string) {
  return format(new Date(`${value}T00:00:00`), "dd MMM yyyy");
}

function formatDateTime(value: string) {
  return format(new Date(value), "dd/MM/yyyy HH:mm");
}

function getGradeLabel(level: number) {
  return GRADE_NAMES[level] ?? `Grade ${level}`;
}

function buildCollectionExportRows(report: FeeCollectionReport) {
  return report.payments.map((payment, index) => ({
    SN: index + 1,
    DATE: formatDateTime(payment.paidAt),
    RECEIPT_NUMBER: payment.receiptNumber,
    STUDENT_ID: payment.student.studentId,
    STUDENT_NAME: `${payment.student.name} ${payment.student.surname}`,
    LEVEL: getGradeLabel(payment.student.level),
    CLASS: payment.student.className,
    FEE_DESCRIPTION: payment.feeTitle,
    TERM: payment.term,
    ACADEMIC_YEAR: payment.academicYear,
    PAYMENT_METHOD: payment.paymentMethod,
    AMOUNT_GHS: Number(payment.amount.toFixed(2)),
    RECORDED_BY: payment.recordedBy,
    NOTES: payment.notes ?? "",
  }));
}

function buildCollectionFileName(report: FeeCollectionReport) {
  if (report.fromDate === report.toDate) {
    return `fee_collection_${report.fromDate}`;
  }

  return `fee_collection_${report.fromDate}_to_${report.toDate}`;
}

function exportCollectionReportToExcel(report: FeeCollectionReport) {
  const workbook = utils.book_new();
  const rows = buildCollectionExportRows(report);
  const detailSheet = utils.json_to_sheet(rows);
  const summarySheet = utils.json_to_sheet([
    {
      FROM_DATE: report.fromDate,
      TO_DATE: report.toDate,
      TOTAL_COLLECTED_GHS: Number(report.totalCollected.toFixed(2)),
      TOTAL_RECORDS: report.totalRecords,
      PAYMENT_METHODS: report.totalsByMethod
        .map((summary) => `${summary.method}: ${formatMoney(summary.amount)}`)
        .join(" | "),
      GENERATED_AT: format(new Date(), "dd-MM-yyyy HH:mm:ss"),
    },
  ]);

  utils.book_append_sheet(workbook, summarySheet, "Summary");
  utils.book_append_sheet(workbook, detailSheet, "Collections");
  writeFile(workbook, `${buildCollectionFileName(report)}.xlsx`);
}

function exportCollectionReportToPDF(report: FeeCollectionReport) {
  const doc = new jsPDF({ orientation: "landscape" });
  const methodSummary = report.totalsByMethod.length
    ? report.totalsByMethod
        .map(
          (summary) =>
            `${summary.method}: ${formatMoney(summary.amount)} (${summary.count})`
        )
        .join(" | ")
    : "No payments found";

  doc.setFontSize(18);
  doc.text("Fee Collection Report", 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    `Period: ${formatDateLabel(report.fromDate)} to ${formatDateLabel(report.toDate)}`,
    14,
    26
  );
  doc.text(`Total collected: ${formatMoney(report.totalCollected)}`, 14, 32);
  doc.text(`Receipts: ${report.totalRecords}`, 110, 32);
  doc.text(`Payment methods: ${methodSummary}`, 14, 38);
  doc.text(`Generated on: ${format(new Date(), "dd-MM-yyyy HH:mm:ss")}`, 14, 44);

  autoTable(doc, {
    head: [[
      "S/N",
      "Date",
      "Receipt #",
      "Student ID",
      "Student Name",
      "Level",
      "Class",
      "Fee",
      "Term",
      "Method",
      "Amount (GHS)",
    ]],
    body: report.payments.map((payment, index) => [
      String(index + 1),
      formatDateTime(payment.paidAt),
      payment.receiptNumber,
      payment.student.studentId,
      `${payment.student.name} ${payment.student.surname}`,
      getGradeLabel(payment.student.level),
      payment.student.className,
      payment.feeTitle,
      payment.term,
      payment.paymentMethod,
      payment.amount.toFixed(2),
    ]),
    startY: 50,
    styles: {
      fontSize: 7,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [29, 78, 216],
    },
  });

  doc.save(`${buildCollectionFileName(report)}.pdf`);
}

export function CheckStatementTab() {
  const [query, setQuery] = useState("");
  const [statement, setStatement] = useState<StudentStatement | null>(null);
  const [statementError, setStatementError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [collectionReport, setCollectionReport] =
    useState<FeeCollectionReport | null>(null);
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [isStatementPending, startStatementTransition] = useTransition();
  const [isCollectionPending, startCollectionTransition] = useTransition();

  const loadStatement = useCallback((value: string) => {
    const trimmedQuery = value.trim();

    if (!trimmedQuery) {
      setStatement(null);
      setStatementError(null);
      return;
    }

    setStatement(null);
    setStatementError(null);

    startStatementTransition(() => {
      void (async () => {
        try {
          const response = await fetch(
            `/api/fees/statement?q=${encodeURIComponent(trimmedQuery)}`,
            { cache: "no-store" }
          );
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Failed to load the fee statement.");
          }

          setStatement(data);
        } catch (error) {
          setStatementError(
            error instanceof Error
              ? error.message
              : "Failed to load the fee statement."
          );
        }
      })();
    });
  }, [startStatementTransition]);

  const loadCollectionReport = useCallback((from: string, to: string) => {
    if (!from || !to) {
      setCollectionReport(null);
      setCollectionError("Select both dates to run the collection report.");
      return;
    }

    setCollectionError(null);
    setCollectionReport(null);

    startCollectionTransition(() => {
      void (async () => {
        try {
          const response = await fetch(
            `/api/fees/payments-report?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
            { cache: "no-store" }
          );
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Failed to load the collection report.");
          }

          setCollectionReport(data);
        } catch (error) {
          setCollectionError(
            error instanceof Error
              ? error.message
              : "Failed to load the collection report."
          );
        }
      })();
    });
  }, [startCollectionTransition]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadStatement(query);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [query, loadStatement]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadCollectionReport(fromDate, toDate);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [fromDate, toDate, loadCollectionReport]);

  return (
    <div className="space-y-8">
      <section className={sectionClassName}>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Student Fee Statement
          </h2>
          <p className="text-sm text-muted-foreground">
            Search by student ID or name to view an individual fee statement.
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by Student ID or Name..."
              className={`${inputClassName} pl-9 pr-9`}
            />
            {isStatementPending && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        {statementError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
            {statementError}
          </div>
        )}

        {statement && (
          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-3 md:flex-row md:items-start md:justify-between dark:border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {statement.name} {statement.surname}
                </h3>
                <p className="text-sm text-muted-foreground">
                  ID:{" "}
                  <span className="font-mono text-blue-600">
                    {statement.studentId}
                  </span>{" "}
                  | Level: {statement.level} | Class: {statement.className}
                </p>
              </div>
              <div className="text-left md:text-right">
                <p className="text-xs text-muted-foreground">
                  Outstanding Balance
                </p>
                <p
                  className={`text-2xl font-bold ${
                    statement.totalBalance > 0
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                >
                  {formatMoney(statement.totalBalance)}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className={`${subtleCardClassName} text-center`}>
                <p className="text-xs text-muted-foreground">Total Billed</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {formatMoney(statement.totalBilled)}
                </p>
              </div>
              <div className={`${subtleCardClassName} text-center`}>
                <p className="text-xs text-muted-foreground">Total Paid</p>
                <p className="text-lg font-bold text-green-600">
                  {formatMoney(statement.totalPaid)}
                </p>
              </div>
              <div className={`${subtleCardClassName} text-center`}>
                <p className="text-xs text-muted-foreground">Balance Due</p>
                <p
                  className={`text-lg font-bold ${
                    statement.totalBalance > 0
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                >
                  {formatMoney(statement.totalBalance)}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {statement.fees.map((fee) => {
                const balance = fee.amount - fee.paidAmount;

                return (
                  <div
                    key={fee.id}
                    className="rounded-lg border border-slate-200 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-900/70"
                  >
                    <div className="mb-2 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {fee.title}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {fee.term} | {fee.academicYear}
                        </span>
                      </div>
                      <span
                        className={`inline-flex w-fit rounded px-2 py-0.5 text-[11px] font-semibold ${
                          fee.status === "PAID"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                            : fee.status === "OVERDUE"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                              : "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                        }`}
                      >
                        {fee.status}
                      </span>
                    </div>

                    <div className="mb-2 grid gap-2 text-xs md:grid-cols-3">
                      <div>
                        <span className="text-muted-foreground">Billed:</span>{" "}
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatMoney(fee.amount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Paid:</span>{" "}
                        <span className="font-semibold text-green-600">
                          {formatMoney(fee.paidAmount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Balance:</span>{" "}
                        <span
                          className={`font-semibold ${
                            balance > 0 ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          {formatMoney(balance)}
                        </span>
                      </div>
                    </div>

                    {fee.payments.length > 0 && (
                      <div className="mt-2 border-t border-slate-200 pt-2 dark:border-slate-800">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                          Payment History
                        </p>
                        <div className="space-y-1">
                          {fee.payments.map((payment) => (
                            <div
                              key={payment.id}
                              className="grid gap-1 text-xs text-slate-700 md:grid-cols-4 dark:text-slate-300"
                            >
                              <span className="font-mono text-blue-600">
                                {payment.receiptNumber}
                              </span>
                              <span>{format(new Date(payment.paidAt), "dd/MM/yyyy")}</span>
                              <span className="font-semibold text-green-600">
                                {formatMoney(payment.amount)}
                              </span>
                              <span className="text-muted-foreground">
                                {payment.paymentMethod}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {statement.fees.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No fee records found for this student.
                </p>
              )}
            </div>
          </div>
        )}

        {!statement && !statementError && !isStatementPending && (
          <div className="rounded-lg border-2 border-dashed border-slate-300 p-12 text-center text-muted-foreground dark:border-slate-700">
            <Search className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p className="text-sm">
              Enter a student ID or name to view an individual fee statement.
            </p>
          </div>
        )}
      </section>

      <section className={sectionClassName}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Daily Fee Collection Report
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Check how much was collected for one day or any date range, then
              export the visible table to PDF or Excel.
            </p>
          </div>

          {collectionReport && collectionReport.payments.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => exportCollectionReportToExcel(collectionReport)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <FileDown className="h-4 w-4" />
                Export Excel
              </button>
              <button
                type="button"
                onClick={() => exportCollectionReportToPDF(collectionReport)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
              >
                <FileText className="h-4 w-4" />
                Export PDF
              </button>
            </div>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <span>From Date</span>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className={inputClassName}
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <span>To Date</span>
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className={inputClassName}
            />
          </label>

          <button
            type="button"
            onClick={() => loadCollectionReport(fromDate, toDate)}
            disabled={isCollectionPending}
            className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCollectionPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            View Collections
          </button>
        </div>

        {collectionError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
            {collectionError}
          </div>
        )}

        {collectionReport && (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className={subtleCardClassName}>
                <p className="text-xs text-muted-foreground">Period</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {formatDateLabel(collectionReport.fromDate)}
                  {collectionReport.fromDate !== collectionReport.toDate &&
                    ` to ${formatDateLabel(collectionReport.toDate)}`}
                </p>
              </div>

              <div className={subtleCardClassName}>
                <p className="text-xs text-muted-foreground">Total Collected</p>
                <p className="text-xl font-bold text-green-600">
                  {formatMoney(collectionReport.totalCollected)}
                </p>
              </div>

              <div className={subtleCardClassName}>
                <p className="text-xs text-muted-foreground">Receipts</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {collectionReport.totalRecords}
                </p>
              </div>

              <div className={subtleCardClassName}>
                <p className="text-xs text-muted-foreground">By Method</p>
                <div className="space-y-1 text-sm">
                  {collectionReport.totalsByMethod.length > 0 ? (
                    collectionReport.totalsByMethod.map((summary) => (
                      <p
                        key={summary.method}
                        className="font-medium text-slate-900 dark:text-slate-100"
                      >
                        {summary.method}: {formatMoney(summary.amount)}
                      </p>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No payments found</p>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-950/50">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-800 text-left text-xs uppercase tracking-wide text-white dark:bg-slate-900">
                  <tr>
                    <th className="px-3 py-3">S/N</th>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Receipt #</th>
                    <th className="px-3 py-3">Student ID</th>
                    <th className="px-3 py-3">Student Name</th>
                    <th className="px-3 py-3">Level</th>
                    <th className="px-3 py-3">Class</th>
                    <th className="px-3 py-3">Fee Description</th>
                    <th className="px-3 py-3">Term</th>
                    <th className="px-3 py-3">Academic Year</th>
                    <th className="px-3 py-3">Method</th>
                    <th className="px-3 py-3 text-right">Amount (GHS)</th>
                    <th className="px-3 py-3">Recorded By</th>
                  </tr>
                </thead>
                <tbody>
                  {collectionReport.payments.map((payment, index) => (
                    <tr
                      key={payment.id}
                      className="border-t border-slate-200 text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900/60"
                    >
                      <td className="px-3 py-3">{index + 1}</td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {formatDateTime(payment.paidAt)}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-blue-700">
                        {payment.receiptNumber}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs">
                        {payment.student.studentId}
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-900 dark:text-slate-100">
                        {payment.student.name} {payment.student.surname}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {getGradeLabel(payment.student.level)}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {payment.student.className}
                      </td>
                      <td className="px-3 py-3">{payment.feeTitle}</td>
                      <td className="px-3 py-3 text-xs">{payment.term}</td>
                      <td className="px-3 py-3 text-xs">
                        {payment.academicYear}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded px-2 py-0.5 text-[11px] font-semibold ${
                            payment.paymentMethod === "CASH"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                              : payment.paymentMethod === "MOMO"
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                                : "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {payment.paymentMethod}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-green-600">
                        {payment.amount.toFixed(2)}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {payment.recordedBy}
                      </td>
                    </tr>
                  ))}

                  {collectionReport.payments.length === 0 && (
                    <tr>
                      <td
                        colSpan={13}
                        className="px-3 py-12 text-center text-sm text-muted-foreground"
                      >
                        No fee payments were recorded for the selected date range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!collectionReport && !collectionError && !isCollectionPending && (
          <div className="rounded-lg border-2 border-dashed border-slate-300 p-12 text-center text-muted-foreground dark:border-slate-700">
            <CalendarDays className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p className="text-sm">
              Choose a day or date range to view collections in a table.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
