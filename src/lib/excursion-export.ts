import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { utils, writeFile } from "xlsx";

export type ExcursionLedgerSourceRow = {
  id: string;
  name: string;
  surname: string;
  studentId: string;
  paidAmount: number;
  paymentCount: number;
  lastPaymentAt: string | null;
};

export type ExcursionLedgerExportRow = {
  serialNo: number;
  studentId: string;
  studentName: string;
  targetAmount: number | null;
  paidAmount: number;
  remainingAmount: number | null;
  paymentCount: number;
  lastPaymentAt: string | null;
  status: "Paid" | "Partially Paid" | "Not Paid" | "No Target";
};

export type ExcursionLedgerExportContext = {
  className: string;
  gradeLevel: number;
  supervisorName: string | null;
  excursionTitle: string;
  targetAmount: number | null;
  scopeLabel?: string;
  exportMode?: "all" | "paid" | "outstanding";
  generatedAt?: Date;
};

function formatCurrency(amount: number) {
  try {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `GHS ${amount.toFixed(2)}`;
  }
}

function sanitizeFilePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "excursion";
}

function getStatusLabel(paidAmount: number, targetAmount: number | null): ExcursionLedgerExportRow["status"] {
  if (targetAmount == null) {
    return "No Target";
  }

  if (paidAmount >= targetAmount) {
    return "Paid";
  }

  if (paidAmount > 0) {
    return "Partially Paid";
  }

  return "Not Paid";
}

function toSheetRows(rows: ExcursionLedgerExportRow[]) {
  return rows.map((row) => ({
    "S/N": row.serialNo,
    "Student ID": row.studentId,
    "Student Name": row.studentName,
    "Target Amount": row.targetAmount ?? 0,
    "Paid Amount": row.paidAmount,
    "Remaining Amount": row.remainingAmount ?? 0,
    "Payment Count": row.paymentCount,
    "Last Payment": row.lastPaymentAt ? format(new Date(row.lastPaymentAt), "dd MMM yyyy") : "-",
    "Status": row.status,
  }));
}

function buildSummaryRows(context: ExcursionLedgerExportContext, rows: ExcursionLedgerExportRow[]) {
  const totalCollected = rows.reduce((sum, row) => sum + row.paidAmount, 0);
  const paidStudents = rows.filter((row) => row.status === "Paid");
  const outstandingStudents = rows.filter((row) => row.status !== "Paid");
  const totalTarget =
    context.targetAmount != null ? context.targetAmount * rows.length : null;
  const balance =
    totalTarget != null ? Math.max(totalTarget - totalCollected, 0) : null;

  return [
    ["Excursion Title", context.excursionTitle],
    ["Class", context.className],
    ["Grade", `Grade ${context.gradeLevel}`],
    ["Supervisor", context.supervisorName || "-"],
    ["Export Scope", context.scopeLabel || "All Students"],
    [
      "Target Amount Per Student",
      context.targetAmount != null ? formatCurrency(context.targetAmount) : "-",
    ],
    ["Total Students", rows.length.toString()],
    ["Fully Paid Students", paidStudents.length.toString()],
    ["Outstanding Students", outstandingStudents.length.toString()],
    ["Total Collected", formatCurrency(totalCollected)],
    ["Total Target", totalTarget != null ? formatCurrency(totalTarget) : "-"],
    ["Outstanding Balance", balance != null ? formatCurrency(balance) : "-"],
    [
      "Generated At",
      format(context.generatedAt ?? new Date(), "dd MMM yyyy HH:mm:ss"),
    ],
  ];
}

export function buildExcursionLedgerRows(
  rows: ExcursionLedgerSourceRow[],
  targetAmount: number | null
): ExcursionLedgerExportRow[] {
  return rows.map((row, index) => {
    const remainingAmount =
      targetAmount != null ? Math.max(targetAmount - row.paidAmount, 0) : null;

    return {
      serialNo: index + 1,
      studentId: row.studentId,
      studentName: `${row.name} ${row.surname}`.trim(),
      targetAmount,
      paidAmount: row.paidAmount,
      remainingAmount,
      paymentCount: row.paymentCount,
      lastPaymentAt: row.lastPaymentAt,
      status: getStatusLabel(row.paidAmount, targetAmount),
    };
  });
}

export function exportExcursionLedgerToExcel(
  context: ExcursionLedgerExportContext,
  rows: ExcursionLedgerExportRow[]
) {
  const workbook = utils.book_new();
  const exportMode = context.exportMode ?? "all";

  const summarySheet = utils.aoa_to_sheet([
    ["Metric", "Value"],
    ...buildSummaryRows(context, rows),
  ]);
  summarySheet["!cols"] = [{ wch: 28 }, { wch: 34 }];

  const allSheetRows = toSheetRows(rows);
  const paidSheetRows = toSheetRows(rows.filter((row) => row.status === "Paid"));
  const outstandingSheetRows = toSheetRows(
    rows.filter((row) => row.status !== "Paid")
  );

  const allSheet = utils.json_to_sheet(allSheetRows);
  const paidSheet = utils.json_to_sheet(paidSheetRows);
  const outstandingSheet = utils.json_to_sheet(outstandingSheetRows);

  allSheet["!cols"] = [
    { wch: 8 },
    { wch: 16 },
    { wch: 24 },
    { wch: 16 },
    { wch: 14 },
    { wch: 16 },
    { wch: 12 },
    { wch: 16 },
    { wch: 18 },
  ];

  paidSheet["!cols"] = allSheet["!cols"];
  outstandingSheet["!cols"] = allSheet["!cols"];

  utils.book_append_sheet(workbook, summarySheet, "Summary");
  if (exportMode === "all") {
    utils.book_append_sheet(workbook, allSheet, "All Students");
    utils.book_append_sheet(workbook, paidSheet, "Paid");
    utils.book_append_sheet(workbook, outstandingSheet, "Outstanding");
  } else {
    const scopedSheet = utils.json_to_sheet(allSheetRows);
    scopedSheet["!cols"] = allSheet["!cols"];
    utils.book_append_sheet(
      workbook,
      scopedSheet,
      (context.scopeLabel || "Students").slice(0, 31)
    );
  }

  const fileStamp = format(context.generatedAt ?? new Date(), "yyyyMMdd_HHmmss");
  const scopePart = sanitizeFilePart(context.scopeLabel || exportMode);
  const fileName = `excursion_ledger_${sanitizeFilePart(context.className)}_${sanitizeFilePart(
    context.excursionTitle
  )}_${scopePart}_${fileStamp}`;

  writeFile(workbook, `${fileName}.xlsx`);
}

export function exportExcursionLedgerToPDF(
  context: ExcursionLedgerExportContext,
  rows: ExcursionLedgerExportRow[]
) {
  const doc = new jsPDF({ orientation: "landscape" });
  const pdfDoc = doc as jsPDF & { lastAutoTable?: { finalY: number } };
  const generatedAt = context.generatedAt ?? new Date();
  const exportMode = context.exportMode ?? "all";
  const paidRows = rows.filter((row) => row.status === "Paid");
  const outstandingRows = rows.filter((row) => row.status !== "Paid");

  doc.setFontSize(18);
  doc.setTextColor(20);
  doc.text("Excursion Class Ledger", 14, 16);

  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Generated on: ${format(generatedAt, "dd MMM yyyy HH:mm:ss")}`, 14, 24);
  doc.text(`Excursion: ${context.excursionTitle}`, 14, 31);
  doc.text(`Class: ${context.className}`, 14, 38);
  doc.text(`Grade: Grade ${context.gradeLevel}`, 14, 45);
  doc.text(`Supervisor: ${context.supervisorName || "-"}`, 14, 52);
  doc.text(`Export Scope: ${context.scopeLabel || "All Students"}`, 14, 59);

  autoTable(doc, {
    startY: 65,
    head: [["Metric", "Value"]],
    body: buildSummaryRows(context, rows),
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [37, 99, 235],
    },
    columnStyles: {
      0: { cellWidth: 72 },
      1: { cellWidth: 120 },
    },
  });

  const addTable = (
    title: string,
    sectionRows: ExcursionLedgerExportRow[],
    startY: number
  ) => {
    doc.setFontSize(13);
    doc.setTextColor(20);
    doc.text(title, 14, startY);

    if (sectionRows.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(110);
      doc.text("No records in this section.", 14, startY + 8);
      return startY + 14;
    }

    autoTable(doc, {
      startY: startY + 4,
      head: [
        [
          "S/N",
          "Student ID",
          "Student Name",
          "Target",
          "Paid",
          "Remaining",
          "Payments",
          "Last Payment",
          "Status",
        ],
      ],
      body: sectionRows.map((row) => [
        row.serialNo.toString(),
        row.studentId,
        row.studentName,
        row.targetAmount != null ? formatCurrency(row.targetAmount) : "-",
        formatCurrency(row.paidAmount),
        row.remainingAmount != null ? formatCurrency(row.remainingAmount) : "-",
        row.paymentCount.toString(),
        row.lastPaymentAt ? format(new Date(row.lastPaymentAt), "dd MMM yyyy") : "-",
        row.status,
      ]),
      styles: {
        fontSize: 7,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [37, 99, 235],
      },
    });

    return (pdfDoc.lastAutoTable?.finalY ?? startY + 12) + 10;
  };

  const baseY = (pdfDoc.lastAutoTable?.finalY ?? 65) + 12;

  if (exportMode === "all") {
    const cursorY = addTable("Paid Students", paidRows, baseY);
    addTable("Outstanding Students", outstandingRows, cursorY);
  } else {
    addTable(context.scopeLabel || "Students", rows, baseY);
  }

  const fileStamp = format(generatedAt, "yyyyMMdd_HHmmss");
  const scopePart = sanitizeFilePart(context.scopeLabel || exportMode);
  const fileName = `excursion_ledger_${sanitizeFilePart(context.className)}_${sanitizeFilePart(
    context.excursionTitle
  )}_${scopePart}_${fileStamp}`;

  doc.save(`${fileName}.pdf`);
}
