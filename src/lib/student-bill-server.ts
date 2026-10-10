import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { roundMoney } from "@/lib/cedis";
import { isMissingDatabaseObjectError } from "@/lib/prisma-errors";
import { parseTermBillScope } from "@/lib/termBillScope";
import { termBillTargetLabel } from "@/lib/term-bill-target";
import {
  formatBillNumber,
  type StudentBillLine,
  type StudentBillTemplate,
  type StudentBillView,
} from "@/lib/student-bill";

//* Server-side student bill reads. Admin reads must be authorized by the
//* caller; the portal read scopes itself to the signed-in student or parent.

const BILL_SELECT = {
  id: true,
  studentId: true,
  term: true,
  academicYear: true,
  studentName: true,
  className: true,
  items: true,
  totalAmount: true,
  arrears: true,
  grandTotal: true,
  billDate: true,
  resumptionDate: true,
  notes: true,
  createdByName: true,
  publishedAt: true,
  student: { select: { studentId: true } },
} satisfies Prisma.StudentBillSelect;

type BillRow = Prisma.StudentBillGetPayload<{ select: typeof BILL_SELECT }>;

function returnWhenMissing<T>(fallback: T) {
  return (error: unknown) => {
    if (isMissingDatabaseObjectError(error)) return fallback;
    throw error;
  };
}

function parseItems(value: Prisma.JsonValue): StudentBillLine[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const { label, amount } = item as { label?: unknown; amount?: unknown };
    return typeof label === "string" && typeof amount === "number" ? [{ label, amount }] : [];
  });
}

function toStudentBillView(row: BillRow): StudentBillView {
  return {
    id: row.id,
    billNumber: formatBillNumber(row.id),
    studentId: row.studentId,
    studentCode: row.student.studentId,
    studentName: row.studentName,
    className: row.className,
    term: row.term,
    academicYear: row.academicYear,
    items: parseItems(row.items),
    totalAmount: row.totalAmount,
    arrears: row.arrears,
    grandTotal: row.grandTotal,
    billDate: row.billDate.toISOString(),
    resumptionDate: row.resumptionDate?.toISOString() ?? null,
    notes: row.notes,
    preparedBy: row.createdByName,
    publishedAt: row.publishedAt?.toISOString() ?? null,
  };
}

/**
 * Unpaid balances on fees from other terms — the same arrears prepareTermFees
 * brings forward into the term fee — so a bill's grand total matches what the
 * fee records say the student owes.
 */
export async function priorArrearsByStudent(studentIds: string[], term: string, academicYear: string) {
  const priorFees = await prisma.fee.findMany({
    where: {
      studentId: { in: studentIds },
      NOT: { term, academicYear },
      status: { not: "PAID" },
    },
    select: { studentId: true, amount: true, paidAmount: true },
  });

  const arrears = new Map<string, number>();
  for (const fee of priorFees) {
    const balance = Math.max(fee.amount - fee.paidAmount, 0);
    if (balance > 0) {
      arrears.set(fee.studentId, roundMoney((arrears.get(fee.studentId) ?? 0) + balance));
    }
  }
  return arrears;
}

//* Prepare Bill templates with how many bills each has, for the Generate Bill tab.
export async function listStudentBillTemplates(): Promise<{
  storageReady: boolean;
  templates: StudentBillTemplate[];
}> {
  const [termBills, classes] = await Promise.all([
    prisma.termBill.findMany({
      select: {
        id: true,
        level: true,
        term: true,
        academicYear: true,
        totalAmount: true,
        _count: { select: { items: true } },
      },
      orderBy: [{ academicYear: "desc" }, { createdAt: "desc" }],
    }),
    prisma.class.findMany({ select: { id: true, name: true } }),
  ]);

  let storageReady = true;
  const billCounts = new Map<number, number>();
  const publishedCounts = new Map<number, number>();
  try {
    const [all, published] = await Promise.all([
      prisma.studentBill.groupBy({ by: ["termBillId"], _count: { _all: true } }),
      prisma.studentBill.groupBy({
        by: ["termBillId"],
        where: { publishedAt: { not: null } },
        _count: { _all: true },
      }),
    ]);
    for (const row of all) if (row.termBillId) billCounts.set(row.termBillId, row._count._all);
    for (const row of published) if (row.termBillId) publishedCounts.set(row.termBillId, row._count._all);
  } catch (error) {
    if (!isMissingDatabaseObjectError(error)) throw error;
    storageReady = false;
  }

  const classNameById = new Map(classes.map((item) => [item.id, item.name]));
  return {
    storageReady,
    templates: termBills.map((termBill) => {
      const scope = parseTermBillScope(termBill.level);
      return {
        id: termBill.id,
        label: scope ? termBillTargetLabel(scope, classNameById) : termBill.level,
        term: termBill.term,
        academicYear: termBill.academicYear,
        totalAmount: termBill.totalAmount,
        itemCount: termBill._count.items,
        billCount: billCounts.get(termBill.id) ?? 0,
        publishedCount: publishedCounts.get(termBill.id) ?? 0,
      };
    }),
  };
}

export async function listStudentBillsForTemplate(termBillId: number) {
  const rows = await prisma.studentBill
    .findMany({
      where: { termBillId },
      select: BILL_SELECT,
      orderBy: [{ className: "asc" }, { studentName: "asc" }],
    })
    .catch(returnWhenMissing([]));
  return rows.map(toStudentBillView);
}

//* Published bills for students the caller has already scoped to the session.
export async function listPublishedBillsForStudents(studentIds: string[]) {
  if (studentIds.length === 0) return [];

  const rows = await prisma.studentBill
    .findMany({
      where: { studentId: { in: studentIds }, publishedAt: { not: null } },
      select: BILL_SELECT,
      orderBy: [{ billDate: "desc" }],
    })
    .catch(returnWhenMissing([]));
  return rows.map(toStudentBillView);
}

export type BillPortalViewer = {
  role: string | undefined;
  username: string | undefined;
  id: string | undefined;
};

/**
 * One published bill, if it belongs to the signed-in student or one of the
 * signed-in parent's children. The identity comes from the session, never the
 * request, and a missing username matches nothing rather than everyone.
 */
export async function getPublishedBillForViewer(viewer: BillPortalViewer, billId: number) {
  let studentWhere: Prisma.StudentWhereInput;
  if (viewer.role === "student" && viewer.username) {
    studentWhere = { username: viewer.username };
  } else if (viewer.role === "student" && viewer.id) {
    studentWhere = { id: viewer.id };
  } else if (viewer.role === "parent" && viewer.username) {
    studentWhere = { parent: { username: viewer.username } };
  } else {
    return null;
  }

  const row = await prisma.studentBill
    .findFirst({
      where: { id: billId, publishedAt: { not: null }, student: studentWhere },
      select: BILL_SELECT,
    })
    .catch(returnWhenMissing(null));
  return row ? toStudentBillView(row) : null;
}
