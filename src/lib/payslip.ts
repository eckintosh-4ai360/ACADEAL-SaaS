//* Payslip shape and arithmetic, shared by the server actions, the editor and
//* the printable document. Keep this file free of server-only imports.

import { roundMoney } from "@/lib/cedis";
import type { SchoolLetterhead } from "@/lib/school-letterhead";

//* Re-exported so payslip code keeps one import; the helpers live in cedis.ts
//* because student bills use them too.
export { amountInWords, formatCedis, integerToWords, roundMoney } from "@/lib/cedis";

export type PayslipLine = { label: string; amount: number };

export type PayslipStaffType = "ADMIN" | "TEACHER";

export type PayslipLineSection =
  | "earnings"
  | "otherClaims"
  | "deductions"
  | "otherDeductions";

export type PayslipDraft = {
  staffId: string;
  staffType: PayslipStaffType;
  salaryMonth: string; //* "YYYY-MM"
  employeeId: string;
  title: string;
  fullName: string;
  designation: string;
  gradeLevel: string;
  phone: string;
  email: string;
  bankName: string;
  accountNumber: string;
  bankBranch: string;
  ssnitNumber: string;
  ssnitBranch: string;
  earnings: PayslipLine[];
  otherClaims: PayslipLine[];
  deductions: PayslipLine[];
  otherDeductions: PayslipLine[];
  preparedBy: string;
  footerNote: string;
};

export type PayslipSchool = SchoolLetterhead;

export type PayslipStaffOption = {
  id: string;
  employeeId: string;
  name: string;
  staffType: PayslipStaffType;
};

//* Where an editor draft came from: the saved payslip for that month, the
//* staff member's most recent payslip, or their staff profile.
export type PayslipDraftSource = "existing" | "previous" | "profile";

export type ResolvedPayslipDraft = {
  source: PayslipDraftSource;
  previousMonth: string | null;
  payslipId: number | null;
  savedAt: string | null;
  //* Only a saved payslip can be published; drafts are hidden from teachers.
  publishedAt: string | null;
  draft: PayslipDraft;
  storageReady: boolean;
};

export const DEFAULT_EARNING_LABELS = [
  "Basic Salary",
  "Canteen Allowance",
  "Transport Allowance",
  "Long Service Allowance",
  "Other Allowance",
  "SSNIT",
];

export const DEFAULT_DEDUCTION_LABELS = [
  "Dues",
  "Tax",
  "Loans",
  "Rent Deduction",
  "Other Deduction",
];

export const DEFAULT_FOOTER_NOTE =
  "Please address any concerns to the financial department of the School";

export const PAYSLIP_TITLE_SUGGESTIONS = ["Mr", "Mrs", "Miss", "Ms", "Madam", "Dr", "Rev", "Prof"];

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const SALARY_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isSalaryMonth(value: string) {
  return SALARY_MONTH_PATTERN.test(value);
}

export function currentSalaryMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatSalaryMonth(value: string) {
  if (!isSalaryMonth(value)) return value;
  const [year, month] = value.split("-");
  return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
}

export function sumLines(lines: PayslipLine[]) {
  return roundMoney(
    lines.reduce((total, line) => total + (Number.isFinite(line.amount) ? line.amount : 0), 0)
  );
}

export function computePayslipTotals(
  draft: Pick<PayslipDraft, PayslipLineSection>
) {
  const grossSalary = sumLines(draft.earnings);
  const otherClaims = sumLines(draft.otherClaims);
  const deductions = sumLines(draft.deductions);
  const otherDeductions = sumLines(draft.otherDeductions);
  const totalGross = roundMoney(grossSalary + otherClaims);
  const totalDeductions = roundMoney(deductions + otherDeductions);

  return {
    grossSalary,
    otherClaims,
    totalGross,
    deductions,
    otherDeductions,
    totalDeductions,
    netSalary: roundMoney(totalGross - totalDeductions),
    //* Claims are one-off reimbursements, so only recurring pay is annualised.
    annualSalary: roundMoney(grossSalary * 12),
  };
}

export type PayslipTotals = ReturnType<typeof computePayslipTotals>;

export function blankLines(labels: string[]): PayslipLine[] {
  return labels.map((label) => ({ label, amount: 0 }));
}

export function defaultTitleForSex(sex: string | null | undefined) {
  if (sex === "MALE") return "Mr";
  if (sex === "FEMALE") return "Ms";
  return "";
}

export function defaultDesignation(staffType: PayslipStaffType) {
  return staffType === "TEACHER" ? "Teaching" : "Administration";
}

export function emptyPayslipDraft(salaryMonth: string, preparedBy: string): PayslipDraft {
  return {
    staffId: "",
    staffType: "TEACHER",
    salaryMonth,
    employeeId: "",
    title: "",
    fullName: "",
    designation: "",
    gradeLevel: "",
    phone: "",
    email: "",
    bankName: "",
    accountNumber: "",
    bankBranch: "",
    ssnitNumber: "",
    ssnitBranch: "",
    earnings: blankLines(DEFAULT_EARNING_LABELS),
    otherClaims: [],
    deductions: blankLines(DEFAULT_DEDUCTION_LABELS),
    otherDeductions: [],
    preparedBy,
    footerNote: DEFAULT_FOOTER_NOTE,
  };
}
