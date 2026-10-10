export type UserPermissions = {
  recordStudents: boolean;
  editFeeRecords: boolean;
  statement: boolean;
  prepareBill: boolean;
  admissions: boolean;
  paymentList: boolean;
  generateBill: boolean;
  arrearsPDF: boolean;
  schoolFees: boolean;
  receipt: boolean;
  viewDetail: boolean;
  expenses: boolean;
  income: boolean;
  specialFeesOffer: boolean;
  busFee: boolean;
  feedingFee: boolean;
  salary: boolean;
  salaryAdvance: boolean;
  financialReport: boolean;
  message: boolean;
};

export type FeePermissionKey =
  | "editFeeRecords"
  | "statement"
  | "prepareBill"
  | "admissions"
  | "paymentList"
  | "generateBill"
  | "arrearsPDF"
  | "schoolFees"
  | "receipt"
  | "viewDetail";

export type FeeTabKey =
  | "fees"
  | "statement"
  | "prepare"
  | "admission"
  | "payments"
  | "generate"
  | "arrears";

export const DEFAULT_USER_PERMISSIONS: UserPermissions = {
  recordStudents: false,
  editFeeRecords: false,
  statement: false,
  prepareBill: false,
  admissions: false,
  paymentList: false,
  generateBill: false,
  arrearsPDF: false,
  schoolFees: false,
  receipt: false,
  viewDetail: false,
  expenses: false,
  income: false,
  specialFeesOffer: false,
  busFee: false,
  feedingFee: false,
  salary: false,
  salaryAdvance: false,
  financialReport: false,
  message: false,
};

export const FEE_TAB_LABELS: ReadonlyArray<FeeTabKey> = [
  "fees",
  "statement",
  "prepare",
  "admission",
  "payments",
  "generate",
  "arrears",
];

const FEE_TAB_PERMISSION_RULES: Record<FeeTabKey, FeePermissionKey[]> = {
  fees: ["schoolFees", "receipt", "viewDetail", "editFeeRecords"],
  statement: ["statement"],
  prepare: ["prepareBill"],
  admission: ["admissions"],
  payments: ["paymentList", "receipt", "editFeeRecords"],
  generate: ["generateBill"],
  arrears: ["arrearsPDF"],
};

export function normalizeUserPermissions(raw: unknown): UserPermissions {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_USER_PERMISSIONS };
  }

  const record = raw as Partial<Record<keyof UserPermissions, unknown>>;

  return {
    recordStudents: Boolean(record.recordStudents),
    editFeeRecords: Boolean(record.editFeeRecords),
    statement: Boolean(record.statement),
    prepareBill: Boolean(record.prepareBill),
    admissions: Boolean(record.admissions),
    paymentList: Boolean(record.paymentList),
    generateBill: Boolean(record.generateBill),
    arrearsPDF: Boolean(record.arrearsPDF),
    schoolFees: Boolean(record.schoolFees),
    receipt: Boolean(record.receipt),
    viewDetail: Boolean(record.viewDetail),
    expenses: Boolean(record.expenses),
    income: Boolean(record.income),
    specialFeesOffer: Boolean(record.specialFeesOffer),
    busFee: Boolean(record.busFee),
    feedingFee: Boolean(record.feedingFee),
    salary: Boolean(record.salary),
    salaryAdvance: Boolean(record.salaryAdvance),
    financialReport: Boolean(record.financialReport),
    message: Boolean(record.message),
  };
}

export function hasFeePermission(
  permissions: UserPermissions,
  permission: FeePermissionKey
) {
  return Boolean(permissions[permission]);
}

export function canAccessFeeTab(
  permissions: UserPermissions,
  tab: FeeTabKey
) {
  return FEE_TAB_PERMISSION_RULES[tab].some((permission) =>
    hasFeePermission(permissions, permission)
  );
}

export function getAllowedFeeTabs(permissions: UserPermissions) {
  return FEE_TAB_LABELS.filter((tab) => canAccessFeeTab(permissions, tab));
}

export function hasAnyFeeAccess(permissions: UserPermissions) {
  return getAllowedFeeTabs(permissions).length > 0;
}

export function canRecordFeePayments(permissions: UserPermissions) {
  return hasFeePermission(permissions, "receipt");
}

export function canEditFeeRecords(permissions: UserPermissions) {
  return hasFeePermission(permissions, "editFeeRecords");
}

export function canViewFeePaymentList(permissions: UserPermissions) {
  return canAccessFeeTab(permissions, "payments");
}
