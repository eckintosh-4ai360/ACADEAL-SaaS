import type { Payslip, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { isMissingDatabaseObjectError } from "@/lib/prisma-errors";
import {
  DEFAULT_DEDUCTION_LABELS,
  DEFAULT_EARNING_LABELS,
  DEFAULT_FOOTER_NOTE,
  blankLines,
  defaultDesignation,
  defaultTitleForSex,
  type PayslipDraft,
  type PayslipLine,
  type PayslipStaffOption,
  type PayslipStaffType,
  type ResolvedPayslipDraft,
} from "@/lib/payslip";

//* Server-side payslip reads. Callers must authorize first: these return staff
//* contact details and pay records without checking the session themselves.

type StaffProfile = {
  id: string;
  employeeId: string;
  name: string;
  surname: string | null;
  sex: string | null;
  phone: string | null;
  email: string | null;
  staffType: PayslipStaffType;
};

const STAFF_SELECT = {
  id: true,
  staffId: true,
  name: true,
  surname: true,
  sex: true,
  phone: true,
  email: true,
  staffType: true,
} as const;

function returnWhenMissing<T>(fallback: T) {
  return (error: unknown) => {
    if (isMissingDatabaseObjectError(error)) return fallback;
    throw error;
  };
}

function fromStaffRow(row: Prisma.StaffGetPayload<{ select: typeof STAFF_SELECT }>): StaffProfile {
  return {
    id: row.id,
    employeeId: row.staffId,
    name: row.name,
    surname: row.surname,
    sex: row.sex,
    phone: row.phone,
    email: row.email,
    staffType: row.staffType,
  };
}

//* Same source as the payroll page: the unified Staff table, or Teacher + Admin
//* when that table is empty, so payslip staffIds match PayrollEntry.staffId.
async function listStaffProfiles(): Promise<StaffProfile[]> {
  const staff = await prisma.staff
    .findMany({ select: STAFF_SELECT, orderBy: [{ name: "asc" }, { surname: "asc" }] })
    .catch(returnWhenMissing([]));

  if (staff.length > 0) {
    return staff.map(fromStaffRow);
  }

  const [teachers, admins] = await Promise.all([
    prisma.teacher.findMany({
      select: { id: true, staffId: true, name: true, surname: true, sex: true, phone: true, email: true },
      orderBy: [{ name: "asc" }, { surname: "asc" }],
    }),
    prisma.admin.findMany({
      select: { id: true, staffId: true, name: true, phone: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return [
    ...teachers.map((teacher) => ({
      ...teacher,
      employeeId: teacher.staffId,
      staffType: "TEACHER" as const,
    })),
    ...admins.map((admin) => ({
      ...admin,
      employeeId: admin.staffId,
      surname: null,
      sex: null,
      staffType: "ADMIN" as const,
    })),
  ];
}

export async function findStaffProfile(id: string): Promise<StaffProfile | null> {
  if (!id) return null;

  const staff = await prisma.staff
    .findUnique({ where: { id }, select: STAFF_SELECT })
    .catch(returnWhenMissing(null));
  if (staff) return fromStaffRow(staff);

  const teacher = await prisma.teacher.findUnique({
    where: { id },
    select: { id: true, staffId: true, name: true, surname: true, sex: true, phone: true, email: true },
  });
  if (teacher) return { ...teacher, employeeId: teacher.staffId, staffType: "TEACHER" };

  const admin = await prisma.admin.findUnique({
    where: { id },
    select: { id: true, staffId: true, name: true, phone: true, email: true },
  });
  if (admin) {
    return { ...admin, employeeId: admin.staffId, surname: null, sex: null, staffType: "ADMIN" };
  }

  return null;
}

export async function listPayslipStaffOptions(): Promise<PayslipStaffOption[]> {
  const profiles = await listStaffProfiles();
  return profiles.map((profile) => ({
    id: profile.id,
    employeeId: profile.employeeId,
    name: [profile.name, profile.surname].filter(Boolean).join(" "),
    staffType: profile.staffType,
  }));
}

function parseLines(value: Prisma.JsonValue): PayslipLine[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const { label, amount } = item as { label?: unknown; amount?: unknown };
    return typeof label === "string" && typeof amount === "number" ? [{ label, amount }] : [];
  });
}

export function payslipToDraft(row: Payslip): PayslipDraft {
  return {
    staffId: row.staffId,
    staffType: row.staffType === "ADMIN" ? "ADMIN" : "TEACHER",
    salaryMonth: row.salaryMonth,
    employeeId: row.employeeId ?? "",
    title: row.title ?? "",
    fullName: row.fullName,
    designation: row.designation ?? "",
    gradeLevel: row.gradeLevel ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    bankName: row.bankName ?? "",
    accountNumber: row.accountNumber ?? "",
    bankBranch: row.bankBranch ?? "",
    ssnitNumber: row.ssnitNumber ?? "",
    ssnitBranch: row.ssnitBranch ?? "",
    earnings: parseLines(row.earnings),
    otherClaims: parseLines(row.otherClaims),
    deductions: parseLines(row.deductions),
    otherDeductions: parseLines(row.otherDeductions),
    preparedBy: row.preparedBy ?? "",
    footerNote: row.footerNote ?? "",
  };
}

function profileDraft(profile: StaffProfile, salaryMonth: string, preparedBy: string): PayslipDraft {
  return {
    staffId: profile.id,
    staffType: profile.staffType,
    salaryMonth,
    employeeId: profile.employeeId,
    title: defaultTitleForSex(profile.sex),
    fullName: [profile.name, profile.surname].filter(Boolean).join(" "),
    designation: defaultDesignation(profile.staffType),
    gradeLevel: "",
    phone: profile.phone ?? "",
    email: profile.email ?? "",
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

/**
 * The draft the editor should show for a staff member and month: the payslip
 * already saved for that month, else a copy of their latest payslip moved to
 * that month (bank details and pay structure rarely change), else a fresh one
 * built from their staff profile. Returns null when the staff member is gone.
 */
export async function resolvePayslipDraft(params: {
  staffId: string;
  salaryMonth: string;
  preparedBy: string;
}): Promise<ResolvedPayslipDraft | null> {
  const profile = await findStaffProfile(params.staffId);
  if (!profile) return null;

  const fresh = profileDraft(profile, params.salaryMonth, params.preparedBy);

  try {
    const existing = await prisma.payslip.findUnique({
      where: { staffId_salaryMonth: { staffId: profile.id, salaryMonth: params.salaryMonth } },
    });
    if (existing) {
      return {
        source: "existing",
        previousMonth: null,
        payslipId: existing.id,
        savedAt: existing.updatedAt.toISOString(),
        publishedAt: existing.publishedAt?.toISOString() ?? null,
        draft: payslipToDraft(existing),
        storageReady: true,
      };
    }

    const previous = await prisma.payslip.findFirst({
      where: { staffId: profile.id },
      orderBy: [{ salaryMonth: "desc" }, { updatedAt: "desc" }],
    });
    if (previous) {
      const carried = payslipToDraft(previous);
      return {
        source: "previous",
        previousMonth: previous.salaryMonth,
        payslipId: null,
        savedAt: null,
        publishedAt: null,
        draft: {
          ...carried,
          staffType: profile.staffType,
          salaryMonth: params.salaryMonth,
          employeeId: carried.employeeId || fresh.employeeId,
          phone: carried.phone || fresh.phone,
          email: carried.email || fresh.email,
          preparedBy: carried.preparedBy || fresh.preparedBy,
        },
        storageReady: true,
      };
    }

    return {
      source: "profile",
      previousMonth: null,
      payslipId: null,
      savedAt: null,
      publishedAt: null,
      draft: fresh,
      storageReady: true,
    };
  } catch (error) {
    if (!isMissingDatabaseObjectError(error)) throw error;
    return {
      source: "profile",
      previousMonth: null,
      payslipId: null,
      savedAt: null,
      publishedAt: null,
      draft: fresh,
      storageReady: false,
    };
  }
}

export async function getPayslipRecord(id: number) {
  return prisma.payslip.findUnique({ where: { id } }).catch(returnWhenMissing(null));
}

//* False until the tenant migrations for payslips have run. Selecting the newest
//* column also catches a school that has the table but not the publish step.
export async function isPayslipStorageReady() {
  return prisma.payslip
    .findFirst({ select: { id: true, publishedAt: true } })
    .then(() => true)
    .catch(returnWhenMissing(false));
}

/**
 * Every id a teacher's payslips can be filed under. Payslips are keyed like
 * PayrollEntry: by the unified Staff.id, or by Teacher.id when a school has no
 * Staff rows, so both are checked. The id must come from the session, never
 * from the request, or a teacher could read a colleague's pay.
 */
async function teacherPayslipStaffIds(teacherId: string) {
  if (!teacherId) return [];

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { id: true, staffId: true, staffProfileId: true },
  });
  if (!teacher) return [];

  const ids = new Set([teacher.id]);
  if (teacher.staffProfileId) ids.add(teacher.staffProfileId);

  const profile = await prisma.staff
    .findFirst({ where: { staffId: teacher.staffId, staffType: "TEACHER" }, select: { id: true } })
    .catch(returnWhenMissing(null));
  if (profile) ids.add(profile.id);

  return [...ids];
}

//* Teachers only ever see published payslips; drafts are still being prepared.
export async function listTeacherPayslips(teacherId: string) {
  const staffIds = await teacherPayslipStaffIds(teacherId);
  if (staffIds.length === 0) return [];

  return prisma.payslip
    .findMany({
      where: { staffId: { in: staffIds }, publishedAt: { not: null } },
      select: {
        id: true,
        salaryMonth: true,
        designation: true,
        totalGross: true,
        totalDeductions: true,
        netSalary: true,
        updatedAt: true,
      },
      orderBy: { salaryMonth: "desc" },
    })
    .catch(returnWhenMissing([]));
}

//* Null when the payslip doesn't exist, is unpublished, or belongs to someone else.
export async function getTeacherPayslip(teacherId: string, payslipId: number) {
  const staffIds = await teacherPayslipStaffIds(teacherId);
  if (staffIds.length === 0) return null;

  return prisma.payslip
    .findFirst({ where: { id: payslipId, staffId: { in: staffIds }, publishedAt: { not: null } } })
    .catch(returnWhenMissing(null));
}

export async function listPayslipSummaries() {
  try {
    const rows = await prisma.payslip.findMany({
      select: {
        id: true,
        staffId: true,
        staffType: true,
        salaryMonth: true,
        employeeId: true,
        title: true,
        fullName: true,
        designation: true,
        totalGross: true,
        totalDeductions: true,
        netSalary: true,
        publishedAt: true,
        updatedAt: true,
      },
      orderBy: [{ salaryMonth: "desc" }, { fullName: "asc" }],
    });
    return { storageReady: true, rows };
  } catch (error) {
    if (!isMissingDatabaseObjectError(error)) throw error;
    return { storageReady: false, rows: [] };
  }
}
