import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { utils, writeFile } from "xlsx";
import {
  getPaymentFilterLabel,
  type PaymentListFilter,
  type PaymentListRecord,
} from "@/lib/fee-payment-list";

function formatMoney(amount: number) {
  return `GHS ${amount.toFixed(2)}`;
}

function formatDateTime(value: string | null) {
  return value ? format(new Date(value), "dd/MM/yyyy HH:mm") : "-";
}

function sanitizeFilePart(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "payments"
  );
}

function buildSummary(records: PaymentListRecord[]) {
  const totalBilled = records.reduce((sum, record) => sum + record.totalAmount, 0);
  const totalPaid = records.reduce((sum, record) => sum + record.paidAmount, 0);
  const totalBalance = records.reduce((sum, record) => sum + record.balance, 0);
  const fullPayments = records.filter(
    (record) => record.paymentStatus === "Full Payment"
  ).length;
  const arrears = records.length - fullPayments;

  return {
    totalBilled,
    totalPaid,
    totalBalance,
    fullPayments,
    arrears,
  };
}

function toExportRows(records: PaymentListRecord[]) {
  return records.map((record, index) => ({
    SN: index + 1,
    //* The import matches rows back to fee records on this column — editing or
    //* removing it breaks the round trip.
    FEE_ID: record.id,
    STUDENT_ID: record.student.studentId,
    STUDENT_NAME: `${record.student.name} ${record.student.surname}`,
    LEVEL: record.student.gradeLevel,
    CLASS: record.student.className,
    FEE_ITEM: record.feeTitle,
    TERM: record.term,
    ACADEMIC_YEAR: record.academicYear,
    TOTAL_GHS: Number(record.totalAmount.toFixed(2)),
    PAID_GHS: Number(record.paidAmount.toFixed(2)),
    BALANCE_GHS: Number(record.balance.toFixed(2)),
    PAYMENT_STATUS: record.paymentStatus,
    PAYMENT_COUNT: record.paymentCount,
    LAST_RECEIPT: record.lastReceiptNumber ?? "",
    RECEIPT_DELIVERY: record.receiptDeliveryStatus ?? "",
    RECEIPT_RECIPIENT: record.receiptDeliveryRecipient ?? "",
    RECEIPT_SENT_AT: formatDateTime(record.receiptDeliverySentAt),
    RECEIPT_URL: record.lastReceiptUrl ?? "",
    LAST_METHOD: record.lastPaymentMethod ?? "",
    LAST_PAYMENT_AT: formatDateTime(record.lastPaidAt),
    LAST_RECORDED_BY: record.lastRecordedBy ?? "",
  }));
}

function buildFileName(filter: PaymentListFilter) {
  const stamp = format(new Date(), "yyyyMMdd_HHmmss");
  return `payment_list_${sanitizeFilePart(getPaymentFilterLabel(filter))}_${stamp}`;
}

export function exportPaymentListToExcel(
  records: PaymentListRecord[],
  filter: PaymentListFilter
) {
  const workbook = utils.book_new();
  const summary = buildSummary(records);

  const summarySheet = utils.json_to_sheet([
    {
      FILTER: getPaymentFilterLabel(filter),
      TOTAL_RECORDS: records.length,
      FULL_PAYMENT_COUNT: summary.fullPayments,
      ARREARS_COUNT: summary.arrears,
      TOTAL_BILLED_GHS: Number(summary.totalBilled.toFixed(2)),
      TOTAL_PAID_GHS: Number(summary.totalPaid.toFixed(2)),
      TOTAL_BALANCE_GHS: Number(summary.totalBalance.toFixed(2)),
      GENERATED_AT: format(new Date(), "dd-MM-yyyy HH:mm:ss"),
    },
  ]);
  const detailSheet = utils.json_to_sheet(toExportRows(records));

  utils.book_append_sheet(workbook, summarySheet, "Summary");
  utils.book_append_sheet(workbook, detailSheet, "Payment List");
  writeFile(workbook, `${buildFileName(filter)}.xlsx`);
}

export function exportPaymentListToPDF(
  records: PaymentListRecord[],
  filter: PaymentListFilter
) {
  const summary = buildSummary(records);
  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFontSize(18);
  doc.setTextColor(20);
  doc.text("Payment List Report", 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Filter: ${getPaymentFilterLabel(filter)}`, 14, 26);
  doc.text(`Total records: ${records.length}`, 14, 32);
  doc.text(`Full payments: ${summary.fullPayments}`, 90, 32);
  doc.text(`Arrears: ${summary.arrears}`, 150, 32);
  doc.text(`Total billed: ${formatMoney(summary.totalBilled)}`, 14, 38);
  doc.text(`Total paid: ${formatMoney(summary.totalPaid)}`, 90, 38);
  doc.text(`Balance: ${formatMoney(summary.totalBalance)}`, 150, 38);
  doc.text(`Generated: ${format(new Date(), "dd-MM-yyyy HH:mm:ss")}`, 14, 44);

  autoTable(doc, {
    startY: 50,
    head: [[
      "S/N",
      "Student ID",
      "Student Name",
      "Level",
      "Class",
      "Fee Item",
      "Term",
      "Total",
      "Paid",
      "Balance",
      "Status",
      "Receipt",
      "Delivery",
      "Recipient",
      "Last Payment",
    ]],
    body: records.map((record, index) => [
      String(index + 1),
      record.student.studentId,
      `${record.student.name} ${record.student.surname}`,
      String(record.student.gradeLevel),
      record.student.className,
      record.feeTitle,
      record.term,
      record.totalAmount.toFixed(2),
      record.paidAmount.toFixed(2),
      record.balance.toFixed(2),
      record.paymentStatus,
      record.lastReceiptNumber ?? "-",
      record.receiptDeliveryStatus ?? "-",
      record.receiptDeliveryRecipient ?? "-",
      formatDateTime(record.lastPaidAt),
    ]),
    styles: {
      fontSize: 7,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [29, 78, 216],
    },
  });

  doc.save(`${buildFileName(filter)}.pdf`);
}
