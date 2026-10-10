export const paymentListFilters = ["all", "full", "arrears"] as const;

export type PaymentListFilter = (typeof paymentListFilters)[number];

export type PaymentRecordStatus =
  | "Full Payment"
  | "Part Payment"
  | "No Payment";

export interface PaymentListRecord {
  id: number;
  feeTitle: string;
  term: string;
  academicYear: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  paymentStatus: PaymentRecordStatus;
  paymentCount: number;
  lastReceiptNumber: string | null;
  lastReceiptUrl: string | null;
  lastPaymentMethod: string | null;
  lastRecordedBy: string | null;
  lastPaidAt: string | null;
  receiptDeliveryStatus: "SENT" | "FAILED" | "PENDING" | "SKIPPED" | null;
  receiptDeliveryChannel: "SMS" | "WHATSAPP" | null;
  receiptDeliveryRecipient: string | null;
  receiptDeliveryError: string | null;
  receiptDeliverySentAt: string | null;
  student: {
    studentId: string;
    name: string;
    surname: string;
    gradeLevel: number;
    className: string;
  };
}

export function isPaymentListFilter(
  value: string | undefined
): value is PaymentListFilter {
  return paymentListFilters.includes(value as PaymentListFilter);
}

export function getPaymentRecordStatus(
  paidAmount: number,
  totalAmount: number
): PaymentRecordStatus {
  if (paidAmount >= totalAmount) {
    return "Full Payment";
  }

  if (paidAmount > 0) {
    return "Part Payment";
  }

  return "No Payment";
}

export function getPaymentFilterLabel(filter: PaymentListFilter) {
  switch (filter) {
    case "full":
      return "Full Payment";
    case "arrears":
      return "Arrears";
    default:
      return "All Records";
  }
}
