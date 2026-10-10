/**
 * Round-trip editing of the payment list.
 *
 * The Payment List tab exports every billed fee record to Excel. This module
 * turns an edited copy of that file back into typed rows the `importFeeEdits`
 * server action can apply, so a bursar can correct amounts in bulk instead of
 * opening the Edit Fee dialog once per student.
 *
 * Matching is by FEE_ID — the column the export writes for exactly this. The
 * STUDENT_ID column is carried along as a guard: if it no longer agrees with
 * the fee it claims to be, the row is rejected rather than written to the
 * wrong student.
 *
 * Kept free of server imports so the modal can parse and preview client-side.
 */

export const FEE_IMPORT_MAX_ROWS = 2000;

/** Columns the import reads. Everything else in the export file is ignored. */
export const FEE_IMPORT_ALIASES = {
  feeId: ["fee id", "feeid", "fee record id", "record id", "id"],
  studentId: ["student id", "studentid", "student number"],
  title: ["fee item", "feeitem", "title", "fee title", "item"],
  amount: ["total ghs", "total", "total amount", "amount", "billed", "billed ghs"],
  paidAmount: ["paid ghs", "paid", "paid amount", "amount paid"],
  term: ["term"],
  academicYear: ["academic year", "academicyear", "year", "session"],
} as const;

export interface FeeImportRow {
  /** 1-based row number in the sheet, counting the header as row 1. */
  rowNumber: number;
  feeId: number | null;
  studentId?: string;
  title?: string;
  /** A number to set, `null` when the cell holds something that is not a number, undefined when the column is absent or blank. */
  amount?: number | null;
  paidAmount?: number | null;
  term?: string;
  academicYear?: string;
}

export interface FeeImportFieldChange {
  field: string;
  from: string;
  to: string;
}

export interface FeeImportChange {
  rowNumber: number;
  feeId: number;
  studentId: string;
  studentName: string;
  feeTitle: string;
  changes: FeeImportFieldChange[];
}

export interface FeeImportIssue {
  rowNumber: number;
  message: string;
}

export interface FeeImportSummary {
  /** Records whose values differ from what is stored. */
  changes: FeeImportChange[];
  /** Rows that matched a fee but asked for nothing new. */
  unchanged: number;
  errors: FeeImportIssue[];
  /** Records actually written. 0 on a preview run. */
  applied: number;
  /** True when the summary came from a preview rather than a write. */
  previewOnly: boolean;
}

export const normalizeFeeImportKey = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

const toText = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
};

const pickValue = (
  row: Record<string, unknown>,
  aliases: readonly string[]
): string | undefined => {
  for (const alias of aliases) {
    const text = toText(row[normalizeFeeImportKey(alias)]);
    if (text !== undefined) {
      return text;
    }
  }
  return undefined;
};

/**
 * Money as typed by a human: "1,200.50", "GHS 1200.5", "1200" all land on the
 * same number.
 *
 * Returns undefined for a blank cell and `null` for a cell that holds something
 * other than a number, so the caller can reject a typo instead of quietly
 * skipping it. `null` rather than NaN because these rows cross a server-action
 * boundary, and NaN does not survive that trip.
 */
export const parseFeeAmount = (
  value: string | undefined
): number | null | undefined => {
  if (value === undefined) return undefined;
  const cleaned = value.replace(/(ghs|ghc|gh₵|₵)/gi, "").replace(/[\s,]/g, "");
  if (cleaned.length === 0) return undefined;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

export const roundMoney = (value: number) => Math.round(value * 100) / 100;

export const formatFeeMoney = (value: number) => `GHS ${roundMoney(value).toFixed(2)}`;

const parseFeeId = (value: string | undefined): number | null => {
  if (value === undefined) return null;
  const parsed = Number.parseInt(value.replace(/[^\d-]/g, ""), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

/**
 * Maps raw sheet rows (header keys as written in the file) onto typed rows.
 * A column that is absent stays undefined, which the action reads as "leave
 * this field alone" — so a file trimmed down to FEE_ID and TOTAL_GHS is a
 * perfectly valid import.
 */
export function parseFeeImportRows(
  rawRows: Record<string, unknown>[]
): FeeImportRow[] {
  return rawRows.map((rawRow, index) => {
    const row: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawRow ?? {})) {
      row[normalizeFeeImportKey(key)] = value;
    }

    const amount = parseFeeAmount(pickValue(row, FEE_IMPORT_ALIASES.amount));
    const paidAmount = parseFeeAmount(pickValue(row, FEE_IMPORT_ALIASES.paidAmount));

    return {
      rowNumber: index + 2,
      feeId: parseFeeId(pickValue(row, FEE_IMPORT_ALIASES.feeId)),
      studentId: pickValue(row, FEE_IMPORT_ALIASES.studentId),
      title: pickValue(row, FEE_IMPORT_ALIASES.title),
      amount,
      paidAmount,
      term: pickValue(row, FEE_IMPORT_ALIASES.term),
      academicYear: pickValue(row, FEE_IMPORT_ALIASES.academicYear),
    };
  });
}
