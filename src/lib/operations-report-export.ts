import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { utils, writeFile } from "xlsx";
import type { FinanceReport, InventoryReport } from "@/lib/operations-report-types";

type Cell = string | number;
type Column<T> = { label: string; value: (row: T) => Cell };

function dateTime(value: string) {
  return value.replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

function money(value: number) {
  return `GHS ${value.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function filename(prefix: string, generatedAt: string) {
  return `${prefix}_${format(new Date(generatedAt), "yyyyMMdd_HHmmss")}`;
}

function addSheet<T>(workbook: ReturnType<typeof utils.book_new>, name: string, rows: T[], columns: Column<T>[]) {
  const sheet = utils.aoa_to_sheet([columns.map((column) => column.label)]);
  if (rows.length) {
    utils.sheet_add_aoa(
      sheet,
      rows.map((row) => columns.map((column) => column.value(row))),
      { origin: "A2" }
    );
  }
  sheet["!cols"] = columns.map((column) => ({ wch: Math.min(42, Math.max(14, column.label.length + 2)) }));
  utils.book_append_sheet(workbook, sheet, name);
}

function addPdfSection<T>(doc: jsPDF, title: string, rows: T[], columns: Column<T>[], y: number) {
  if (y > doc.internal.pageSize.getHeight() - 28) {
    doc.addPage();
    y = 18;
  }
  doc.setFontSize(11);
  doc.setTextColor(30);
  doc.text(title, 14, y);
  autoTable(doc, {
    startY: y + 4,
    head: [columns.map((column) => column.label)],
    body: rows.length
      ? rows.map((row) => columns.map((column) => String(column.value(row))))
      : [["No records", ...columns.slice(1).map(() => "")]],
    margin: { left: 14, right: 14, top: 18, bottom: 18 },
    horizontalPageBreak: true,
    horizontalPageBreakRepeat: 0,
    styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
    headStyles: { fillColor: [30, 58, 95] },
  });
  return ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 10;
}

function startPdf(title: string, generatedAt: string) {
  const doc = new jsPDF({ orientation: "landscape", format: "a3" });
  doc.setFontSize(18);
  doc.text(title, 14, 17);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Complete records | Generated: ${dateTime(generatedAt)}`, 14, 24);
  return doc;
}

type StockItem = InventoryReport["items"][number];
type Sale = InventoryReport["sales"][number];
type Entry = FinanceReport["entries"][number];

const stockColumns: Column<StockItem>[] = [
  { label: "Item ID", value: (row) => row.id },
  { label: "Name", value: (row) => row.name },
  { label: "Category", value: (row) => row.category },
  { label: "Unit", value: (row) => row.unit },
  { label: "Unit Price (GHS)", value: (row) => row.unitPrice },
  { label: "Quantity on Hand", value: (row) => row.quantityOnHand },
  { label: "Stock Value (GHS)", value: (row) => row.unitPrice * row.quantityOnHand },
  { label: "Low Stock Threshold", value: (row) => row.lowStockThreshold },
  { label: "Status", value: (row) => row.isActive ? "Active" : "Inactive" },
  { label: "Low Stock", value: (row) => row.isActive && row.quantityOnHand <= row.lowStockThreshold ? "Yes" : "No" },
  { label: "Notes", value: (row) => row.notes ?? "" },
  { label: "Created At", value: (row) => dateTime(row.createdAt) },
  { label: "Updated At", value: (row) => dateTime(row.updatedAt) },
];

const saleColumns: Column<Sale>[] = [
  { label: "Sale ID", value: (row) => row.id },
  { label: "Sold At", value: (row) => dateTime(row.soldAt) },
  { label: "Item ID", value: (row) => row.itemId },
  { label: "Item Name", value: (row) => row.itemName },
  { label: "Quantity", value: (row) => row.quantity },
  { label: "Unit Price (GHS)", value: (row) => row.unitPrice },
  { label: "Total (GHS)", value: (row) => row.totalAmount },
  { label: "Buyer Type", value: (row) => row.buyerType },
  { label: "Buyer Name", value: (row) => row.buyerName ?? "" },
  { label: "Buyer Reference ID", value: (row) => row.buyerRefId ?? "" },
  { label: "Payment Method", value: (row) => row.paymentMethod },
  { label: "Note", value: (row) => row.note ?? "" },
  { label: "Recorded By ID", value: (row) => row.recordedById },
  { label: "Recorded By", value: (row) => row.recordedByName },
  { label: "Created At", value: (row) => dateTime(row.createdAt) },
];

const financeColumns: Column<Entry>[] = [
  { label: "Entry ID", value: (row) => row.id },
  { label: "Entry Date", value: (row) => dateTime(row.entryDate) },
  { label: "Type", value: (row) => row.type },
  { label: "Category", value: (row) => row.category },
  { label: "Amount (GHS)", value: (row) => row.amount },
  { label: "Description", value: (row) => row.description },
  { label: "Payment Method", value: (row) => row.paymentMethod },
  { label: "Recorded By ID", value: (row) => row.recordedById },
  { label: "Recorded By", value: (row) => row.recordedByName },
  { label: "Created At", value: (row) => dateTime(row.createdAt) },
  { label: "Updated At", value: (row) => dateTime(row.updatedAt) },
];

function inventorySummary(report: InventoryReport): Array<[string, Cell]> {
  const { summary } = report;
  return [
    ["Generated At", dateTime(report.generatedAt)],
    ["Report Scope", "All stock items and all sales"],
    ["Current Month Starts", dateTime(report.monthStart)],
    ["Total Stock Items", summary.totalItems],
    ["Active Items", summary.activeItems],
    ["Low Stock Items", summary.lowStockItems],
    ["Stock Value (GHS)", summary.stockValue],
    ["Total Sales Records", summary.totalSales],
    ["Total Sales Amount (GHS)", summary.salesAmount],
    ["Sales This Month (GHS)", summary.salesThisMonth],
  ];
}

function financeSummary(report: FinanceReport): Array<[string, Cell]> {
  const { summary } = report;
  return [
    ["Generated At", dateTime(report.generatedAt)],
    ["Report Scope", "All income and expense entries"],
    ["Current Month Starts", dateTime(report.monthStart)],
    ["Total Entries", summary.totalEntries],
    ["Income Entries", summary.incomeEntries],
    ["Expense Entries", summary.expenseEntries],
    ["Total Income (GHS)", summary.totalIncome],
    ["Total Expenses (GHS)", summary.totalExpenses],
    ["Net Balance (GHS)", summary.netBalance],
    ["Income This Month (GHS)", summary.incomeThisMonth],
    ["Expenses This Month (GHS)", summary.expensesThisMonth],
    ["Net This Month (GHS)", summary.netThisMonth],
  ];
}

function addSummarySheet(workbook: ReturnType<typeof utils.book_new>, rows: Array<[string, Cell]>) {
  const sheet = utils.aoa_to_sheet([["Metric", "Value"], ...rows]);
  sheet["!cols"] = [{ wch: 28 }, { wch: 42 }];
  utils.book_append_sheet(workbook, sheet, "Summary");
}

function addSummaryPdf(doc: jsPDF, rows: Array<[string, Cell]>) {
  autoTable(doc, {
    startY: 29,
    head: [["Metric", "Value"]],
    body: rows.map(([label, value]) => [label, typeof value === "number" && label.includes("GHS") ? money(value) : String(value)]),
    margin: { left: 14, right: 14 },
    tableWidth: 160,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [30, 58, 95] },
  });
  return ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 29) + 10;
}

export function exportInventoryReportExcel(report: InventoryReport) {
  const workbook = utils.book_new();
  addSummarySheet(workbook, inventorySummary(report));
  addSheet(workbook, "Stock Items", report.items, stockColumns);
  addSheet(workbook, "Sales Log", report.sales, saleColumns);
  writeFile(workbook, `${filename("sales_inventory_report", report.generatedAt)}.xlsx`);
}

export function exportInventoryReportPdf(report: InventoryReport) {
  const doc = startPdf("Sales & Inventory Report", report.generatedAt);
  let y = addSummaryPdf(doc, inventorySummary(report));
  y = addPdfSection(doc, "Stock Items", report.items, stockColumns.slice(0, 11), y);
  y = addPdfSection(doc, "Stock Item Dates", report.items, [stockColumns[0], ...stockColumns.slice(11)], y);
  y = addPdfSection(doc, "Sales Log", report.sales, saleColumns.slice(0, 12), y);
  addPdfSection(doc, "Sales Recording Details", report.sales, [saleColumns[0], ...saleColumns.slice(12)], y);
  doc.save(`${filename("sales_inventory_report", report.generatedAt)}.pdf`);
}

export function exportFinanceReportExcel(report: FinanceReport) {
  const workbook = utils.book_new();
  addSummarySheet(workbook, financeSummary(report));
  addSheet(workbook, "Income & Expenses", report.entries, financeColumns);
  writeFile(workbook, `${filename("income_expenses_report", report.generatedAt)}.xlsx`);
}

export function exportFinanceReportPdf(report: FinanceReport) {
  const doc = startPdf("Income & Expenses Report", report.generatedAt);
  let y = addSummaryPdf(doc, financeSummary(report));
  y = addPdfSection(doc, "Income & Expense Ledger", report.entries, financeColumns.slice(0, 7), y);
  addPdfSection(doc, "Entry Recording Details", report.entries, [financeColumns[0], ...financeColumns.slice(7)], y);
  doc.save(`${filename("income_expenses_report", report.generatedAt)}.pdf`);
}
