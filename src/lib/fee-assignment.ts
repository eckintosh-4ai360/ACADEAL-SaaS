/**
 * Bills a student who joins after the school's fees have already been rolled out.
 *
 * "Prepare Bill" writes Fee rows for everyone in a term bill's scope at the
 * moment an admin runs it, and creating an admission bill charges every student
 * standing at that level right then. Either way a student admitted the next day
 * ends up with no fee record and never shows on the Payment List. This module
 * closes that gap: every path that admits a student calls it, and the student
 * picks up the same bills their classmates already carry.
 *
 * A student gets one bill, not two. The admission fee is what a school charges
 * to join a level and it already covers the term being joined, so where a level
 * has an admission bill that is the whole charge and the term bill is not added
 * on top. The term bill is what continuing students carry, and it applies here
 * only as the fallback for a level with no admission bill of its own.
 *
 * Neither waits on an admin to run anything first: a bill standing against the
 * current term and year applies from the moment a student is admitted into its
 * scope. Re-running Prepare Bill later re-prices whatever is still PENDING, so
 * a bill whose amount is corrected after the fact still reaches them.
 *
 * A student is never billed twice: an existing fee for the same term and year
 * short-circuits the term bill, and an existing fee carrying the admission
 * bill's item name short-circuits the admission charge.
 *
 * Fees are written under the canonical term the Fees table filters on, not the
 * free text an admin typed into settings. A fee stored as "First Term" while
 * the table asks for "One" exists but is invisible, which reads to a user as
 * the student having no fees at all.
 *
 * Failures here must never fail an admission, so callers run it inside a
 * try/catch and log rather than roll back.
 */

import prisma from "@/lib/prisma";
import { getSystemSettings } from "@/lib/settings";
import { normalizeTermValue } from "@/lib/termUtils";
import { parseTermBillScope, STUDENT_GROUP_OPTIONS } from "@/lib/termBillScope";
import { GRADE_NAMES } from "@/lib/utils";

export interface NewStudentFeeContext {
  /** Student.id (the cuid), not the human-facing studentId. */
  id: string;
  classId: number;
  gradeLevel: number;
}

export interface FeeAssignmentResult {
  termFeesCreated: number;
  admissionFeesCreated: number;
  /** Students that matched no live bill, or were already billed for each. */
  studentsWithoutBill: number;
}

const DEFAULT_DUE_DAYS = 90;

/** "2025/2026", "2025-2026" and "2025 2026" all name the same year. */
const normalizeYear = (value: string) => value.replace(/\D/g, "");

/** Titles match by shape, not by the casing an admin happened to type. */
const normalizeTitle = (value: string) => value.trim().toLowerCase();

/** "Basic 6" → 11. An admission bill stores the level's label, not its number. */
const GRADE_LEVEL_BY_LABEL = new Map(
  Object.entries(GRADE_NAMES).map(([level, label]) => [normalizeTitle(label), Number(level)])
);

/** Resolves the label an admission bill was saved under to a Grade.level. */
export function gradeLevelForLabel(label: string): number | null {
  return GRADE_LEVEL_BY_LABEL.get(normalizeTitle(label)) ?? null;
}

type TermBillWithItems = {
  id: number;
  level: string;
  term: string;
  academicYear: string;
  totalAmount: number;
  items: { itemName: string; amount: number }[];
};

type AdmissionBillRow = {
  level: string;
  item: string;
  amount: number;
};

type NewFeeRow = {
  studentId: string;
  title: string;
  amount: number;
  paidAmount: number;
  dueDate: Date;
  status: "PENDING";
  term: string;
  academicYear: string;
  description: string;
};

/** Mirrors the title/description prepareTermFees writes, so both look alike. */
function buildFeeContent(bill: TermBillWithItems) {
  return {
    title: bill.items.length === 1 ? bill.items[0].itemName : `${bill.term} Fee Bill`,
    description: bill.items
      .map((item) => `${item.itemName}: GHS ${item.amount.toFixed(2)}`)
      .join(" | "),
  };
}

/**
 * Picks the bill that applies to one student. A class bill beats a level bill,
 * which beats a group bill — the narrowest target wins, the same order an admin
 * would expect when they set a class-specific amount on top of a level default.
 */
function findBillForStudent(
  student: NewStudentFeeContext,
  bills: TermBillWithItems[]
): TermBillWithItems | null {
  let best: { bill: TermBillWithItems; specificity: number } | null = null;

  for (const bill of bills) {
    const scope = parseTermBillScope(bill.level);
    if (!scope) continue;

    let specificity = 0;

    if (scope.targetType === "CLASS" && scope.targetId === student.classId) {
      specificity = 3;
    } else if (scope.targetType === "GRADE" && scope.targetId === student.gradeLevel) {
      //* GRADE scopes store the grade *level*, not the Grade row id.
      specificity = 2;
    } else if (scope.targetType === "STUDENT_GROUP") {
      const group = STUDENT_GROUP_OPTIONS[scope.targetId];
      if (group && (group.levels as readonly number[]).includes(student.gradeLevel)) {
        specificity = 1;
      }
    }

    if (specificity > 0 && (!best || specificity > best.specificity)) {
      best = { bill, specificity };
    }
  }

  return best?.bill ?? null;
}

/**
 * Assigns the term and admission bills a newly admitted student inherits. Safe
 * to call with one student or a whole imported file — the work is batched
 * either way.
 */
export async function assignBilledFeesToNewStudents(
  students: NewStudentFeeContext[]
): Promise<FeeAssignmentResult> {
  if (students.length === 0) {
    return { termFeesCreated: 0, admissionFeesCreated: 0, studentsWithoutBill: 0 };
  }

  const settings = await getSystemSettings();
  const currentTerm = normalizeTermValue(settings.currentTerm);
  const currentYear = normalizeYear(settings.academicYear || "");

  const dueDate = settings.vacationDate
    ? new Date(settings.vacationDate as string | Date)
    : new Date(Date.now() + DEFAULT_DUE_DAYS * 24 * 60 * 60 * 1000);

  const studentIds = students.map((student) => student.id);

  const [allTermBills, admissionBills, existingFees] = await Promise.all([
    //* One row per target per term, so reading the table whole is cheaper than
    //* filtering on a term string whose format varies by school.
    prisma.termBill.findMany({
      select: {
        id: true,
        level: true,
        term: true,
        academicYear: true,
        totalAmount: true,
        items: { select: { itemName: true, amount: true } },
      },
    }),
    //* At most one row per level, so the whole table is a handful of rows.
    prisma.admissionBill.findMany({
      select: { level: true, item: true, amount: true },
    }),
    //* A student admitted seconds ago has almost no fees; read them and match
    //* in memory rather than running a query per student.
    prisma.fee.findMany({
      where: { studentId: { in: studentIds } },
      select: {
        studentId: true,
        title: true,
        term: true,
        academicYear: true,
        amount: true,
        paidAmount: true,
        status: true,
      },
    }),
  ]);

  //* With no academic year configured every term bill would match every year,
  //* so term billing sits this out. Admission bills key off the level alone and
  //* still apply.
  const currentBills = currentYear
    ? allTermBills.filter(
        (bill) =>
          normalizeTermValue(bill.term) === currentTerm &&
          normalizeYear(bill.academicYear) === currentYear
      )
    : [];

  const admissionBillByLevel = new Map<number, AdmissionBillRow>();
  const admissionTitles = new Set<string>();
  for (const bill of admissionBills) {
    admissionTitles.add(normalizeTitle(bill.item));
    const level = GRADE_LEVEL_BY_LABEL.get(normalizeTitle(bill.level));
    if (level !== undefined) {
      admissionBillByLevel.set(level, bill);
    }
  }

  const feesByStudent = new Map<string, typeof existingFees>();
  const priorArrearsByStudent = new Map<string, number>();

  for (const fee of existingFees) {
    const bucket = feesByStudent.get(fee.studentId) ?? [];
    bucket.push(fee);
    feesByStudent.set(fee.studentId, bucket);

    const isCurrent =
      normalizeTermValue(fee.term) === currentTerm &&
      normalizeYear(fee.academicYear) === currentYear;

    if (!isCurrent && fee.status !== "PAID") {
      const balance = Math.max(fee.amount - fee.paidAmount, 0);
      if (balance > 0) {
        priorArrearsByStudent.set(
          fee.studentId,
          (priorArrearsByStudent.get(fee.studentId) || 0) + balance
        );
      }
    }
  }

  const billByStudent = new Map<string, TermBillWithItems>();

  for (const student of students) {
    const bill = findBillForStudent(student, currentBills);
    if (bill) {
      billByStudent.set(student.id, bill);
    }
  }

  const termFeeRows: NewFeeRow[] = [];
  const admissionFeeRows: NewFeeRow[] = [];

  let studentsWithoutBill = 0;

  for (const student of students) {
    const studentFees = feesByStudent.get(student.id) ?? [];
    const priorArrears = priorArrearsByStudent.get(student.id) || 0;
    let billedNow = 0;

    const admissionBill = admissionBillByLevel.get(student.gradeLevel);
    const termBill = billByStudent.get(student.id);

    if (admissionBill) {
      //* The admission fee covers the term it admits into, so it stands instead
      //* of the term bill, never beside it.
      const alreadyCharged = studentFees.some(
        (fee) => normalizeTitle(fee.title) === normalizeTitle(admissionBill.item)
      );

      if (!alreadyCharged) {
        const totalAmount = admissionBill.amount + priorArrears;
        const description =
          priorArrears > 0
            ? `[Arrears B/F: GHS ${priorArrears.toFixed(2)} | Total Payable: GHS ${totalAmount.toFixed(2)}] • Admission fee for ${admissionBill.level} — Created via Admission Bill`
            : `Admission fee for ${admissionBill.level} — Created via Admission Bill`;

        admissionFeeRows.push({
          studentId: student.id,
          title: admissionBill.item,
          amount: totalAmount,
          paidAmount: 0,
          dueDate,
          status: "PENDING",
          term: currentTerm,
          academicYear: settings.academicYear || "",
          description,
        });
        billedNow += 1;
      }
    } else if (termBill) {
      //* No admission bill covers this level, so the school fee their classmates
      //* carry is what they owe. An admission fee lands in the same term without
      //* being the term bill, so it must not pass for it having been charged.
      const alreadyBilled = studentFees.some(
        (fee) =>
          !admissionTitles.has(normalizeTitle(fee.title)) &&
          normalizeTermValue(fee.term) === normalizeTermValue(termBill.term) &&
          normalizeYear(fee.academicYear) === normalizeYear(termBill.academicYear)
      );

      if (!alreadyBilled) {
        const totalAmount = termBill.totalAmount + priorArrears;
        const content = buildFeeContent(termBill);
        const description =
          priorArrears > 0
            ? `[Arrears B/F: GHS ${priorArrears.toFixed(2)} | Total Payable: GHS ${totalAmount.toFixed(2)}] • ${content.description}`
            : content.description;

        termFeeRows.push({
          studentId: student.id,
          title: content.title,
          amount: totalAmount,
          paidAmount: 0,
          dueDate,
          status: "PENDING",
          term: termBill.term,
          academicYear: termBill.academicYear,
          description,
        });
        billedNow += 1;
      }
    }

    if (billedNow === 0) {
      studentsWithoutBill += 1;
    }
  }

  const feeRows = [...termFeeRows, ...admissionFeeRows];

  if (feeRows.length > 0) {
    await prisma.fee.createMany({ data: feeRows, skipDuplicates: true });
  }

  return {
    termFeesCreated: termFeeRows.length,
    admissionFeesCreated: admissionFeeRows.length,
    studentsWithoutBill,
  };
}
