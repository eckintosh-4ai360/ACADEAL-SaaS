"use client";

import { format } from "date-fns";
import { Printer } from "lucide-react";
import Image from "next/image";

type ReceiptPayment = {
  receiptNumber: string;
  amount: number;
  paymentMethod: string;
  paidAt: Date | string;
  recordedBy: string | null;
  term: string;
  academicYear: string;
  student: {
    name: string;
    surname: string;
    studentId: string;
    class?: { name: string } | null;
    grade?: { level: number } | null;
    parent?: {
      name: string;
      surname?: string | null;
      phone?: string | null;
    } | null;
  };
  fee?: {
    title?: string | null;
    amount: number;
    paidAmount: number;
  } | null;
};

type ReceiptClientProps = {
  payment: ReceiptPayment;
  schoolName: string;
  schoolLogo?: string | null;
  schoolPhone?: string | null;
  schoolEmail?: string | null;
  schoolAddress?: string | null;
};

function formatCurrency(value: number) {
  return `GHS ${value.toFixed(2)}`;
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export function ReceiptClient({
  payment,
  schoolName,
  schoolLogo,
  schoolPhone,
  schoolEmail,
  schoolAddress,
}: ReceiptClientProps) {
  const handlePrint = () => {
    window.print();
  };

  const studentName = `${payment.student.name} ${payment.student.surname}`;
  const studentId = payment.student.studentId;
  const gradeLevelNames: Record<number, string> = {
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
  const gradeLevel = payment.student.grade?.level
    ? gradeLevelNames[payment.student.grade.level] || `GRADE ${payment.student.grade.level}`
    : "N/A";
  const classLevel = [payment.student.class?.name, gradeLevel !== "N/A" ? gradeLevel : null]
    .filter(Boolean)
    .join(" - ") || "N/A";
  const paymentDate = format(new Date(payment.paidAt), "dd MMM yyyy");
  const paymentMethod = payment.paymentMethod || "CASH";
  const feeTitle = payment.fee?.title?.trim() || "School Fees";
  const termLabel = [payment.term, payment.academicYear].filter(Boolean).join(" - ") || "Current Term";
  const totalBilled = payment.fee?.amount ?? payment.amount;
  const totalPaidThisTerm = payment.fee?.paidAmount ?? payment.amount;
  const balance = Math.max(0, totalBilled - totalPaidThisTerm);
  const logoFallback = getInitials(schoolName || "SM");
  const contactLine = [schoolPhone, schoolEmail].filter(Boolean).join(" - ") || schoolAddress || null;
  const detailRows = [
    { label: "Student Name", value: studentName },
    { label: "Student ID", value: studentId },
    { label: "Class / Level", value: classLevel },
    { label: "Fee Item", value: feeTitle },
    { label: "Term", value: termLabel },
  ];
  const amountRows = [
    { label: "Amount Paid", value: formatCurrency(payment.amount), highlight: true },
    { label: "Total Bill", value: formatCurrency(totalBilled) },
    { label: "Balance", value: formatCurrency(balance) },
  ];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Fee Payment Receipt</h1>
        </div>
        <button
          onClick={handlePrint}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-300 transition hover:bg-slate-800"
        >
          <Printer className="h-4 w-4" />
          Print Receipt
        </button>
      </div>

      <div
        id="receipt-container"
        className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_28px_80px_-42px_rgba(15,23,42,0.45)]"
      >
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
                {schoolLogo ? (
                  <Image src={schoolLogo} alt={schoolName} fill sizes="64px" className="object-cover" />
                ) : (
                  <span className="text-xl font-black tracking-wide text-slate-700">{logoFallback}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">
                  Official School Receipt
                </p>
                <h2 className="mt-1 text-md font-black uppercase tracking-wide text-slate-900 sm:text-2xl">
                  {schoolName}
                </h2>
                {contactLine && <p className="mt-1 text-sm text-slate-600">{contactLine}</p>}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:min-w-[220px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Receipt No.</p>
              <p className="mt-2 break-all font-mono text-sm font-bold text-slate-900 sm:text-base">
                {payment.receiptNumber}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Date</p>
                  <p className="mt-1 font-semibold text-slate-900">{paymentDate}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Method</p>
                  <p className="mt-1 font-semibold text-slate-900">{paymentMethod}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 px-5 py-5 sm:px-6 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Receipt Summary</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Payment Confirmed</h3>
              <p className="mt-1 text-sm text-slate-600">
                This receipt confirms the fee payment recorded for the student below.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="bg-slate-900 px-4 py-3 text-sm font-bold uppercase tracking-[0.24em] text-white">
                Essential Details
              </div>
              <div className="grid grid-cols-2 gap-4 bg-white p-4 sm:p-5">
                {detailRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex flex-col gap-1"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{row.label}</p>
                    <p className="text-xs font-semibold text-slate-900">{row.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,#eff6fb_0%,#d9e8f2_100%)] px-5 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Amount Received</p>
              <p className="mt-2 text-3xl font-black text-slate-900">{formatCurrency(payment.amount)}</p>
              <p className="mt-1 text-sm text-slate-600">{feeTitle}</p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="divide-y divide-slate-200">
                {amountRows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{row.label}</p>
                    <p
                      className={
                        row.highlight
                          ? "text-lg font-black text-slate-900"
                          : "text-sm font-semibold text-slate-900"
                      }
                    >
                      {row.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>Receipt issued on {paymentDate}</p>
            <p className="font-semibold uppercase tracking-[0.22em] text-slate-600">{paymentMethod}</p>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: A4 portrait;
                margin: 8mm;
              }

              body {
                background: white !important;
                margin: 0 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }

              body * {
                visibility: hidden;
              }

              #receipt-container, #receipt-container * {
                visibility: visible;
              }

              #receipt-container {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                max-width: none;
                margin: 0;
                box-shadow: none !important;
                border-radius: 0 !important;
                border-color: #cbd5e1 !important;
                break-inside: avoid-page;
              }
            }
          `,
        }}
      />
    </div>
  );
}
