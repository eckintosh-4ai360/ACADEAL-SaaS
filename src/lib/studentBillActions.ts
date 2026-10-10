"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { isAuthorizationError, requireFeeAccess } from "@/lib/security/guard";
import { isMissingDatabaseObjectError } from "@/lib/prisma-errors";
import { roundMoney } from "@/lib/cedis";
import { parseTermBillScope } from "@/lib/termBillScope";
import { resolveTermBillTarget } from "@/lib/term-bill-target";
import { parseBillDateInput } from "@/lib/student-bill";
import { priorArrearsByStudent } from "@/lib/student-bill-server";

const FEES_PATH = "/dashboard/fees";
const MY_FEES_PATH = "/dashboard/fees/my-fees";

const STORAGE_MISSING_MESSAGE =
  "Student bills can't be saved yet because this school's database has no StudentBill table. " +
  "Ask the platform administrator to run the tenant migrations.";

type ActionFailure = { success: false; error: string };

function toFailure(error: unknown, fallback: string): ActionFailure {
  if (isAuthorizationError(error)) {
    return { success: false, error: error.message };
  }
  if (isMissingDatabaseObjectError(error)) {
    return { success: false, error: STORAGE_MISSING_MESSAGE };
  }
  console.error("[StudentBills]", error);
  return { success: false, error: fallback };
}

//* Parents' and students' My Fees pages change whenever bills do.
function revalidateBillPages() {
  revalidatePath(FEES_PATH);
  revalidatePath(MY_FEES_PATH);
}

const generateSchema = z.object({
  termBillId: z.number().int().positive(),
  resumptionDate: z.string().trim().max(10),
  notes: z.string().trim().max(2000, "Keep the notes under 2,000 characters."),
});

/**
 * Creates or refreshes one bill per student the template covers: its items,
 * this term's total, arrears from earlier terms, today's bill date, and the
 * resumption date and notes given here. A published bill stays published, so
 * parents see the refreshed copy.
 */
export async function generateStudentBills(input: {
  termBillId: number;
  resumptionDate: string;
  notes: string;
}): Promise<{ success: true; created: number; updated: number } | ActionFailure> {
  try {
    const actor = await requireFeeAccess("generateBill");

    const parsed = generateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Check the bill details." };
    }
    const { termBillId, notes } = parsed.data;
    const resumptionDate = parsed.data.resumptionDate ? parseBillDateInput(parsed.data.resumptionDate) : null;
    if (parsed.data.resumptionDate && !resumptionDate) {
      return { success: false, error: "Choose a valid resumption date." };
    }

    const termBill = await prisma.termBill.findUnique({
      where: { id: termBillId },
      include: { items: { orderBy: { id: "asc" } } },
    });
    if (!termBill) {
      return { success: false, error: "That bill template no longer exists." };
    }
    if (termBill.items.length === 0) {
      return { success: false, error: "Add items to this template in Prepare Bill first." };
    }

    const scope = parseTermBillScope(termBill.level);
    if (!scope) {
      return { success: false, error: "This template's class or level is not valid." };
    }
    const target = await resolveTermBillTarget(scope.targetType, scope.targetId);
    if (!target.success) {
      return { success: false, error: target.message };
    }

    const students = await prisma.student.findMany({
      where: target.value.studentWhere,
      select: { id: true, name: true, otherNames: true, surname: true, class: { select: { name: true } } },
    });
    if (students.length === 0) {
      return { success: false, error: `No students found in ${target.value.targetLabel}.` };
    }

    const items = termBill.items.map((item) => ({ label: item.itemName, amount: roundMoney(item.amount) }));
    const totalAmount = roundMoney(items.reduce((sum, item) => sum + item.amount, 0));
    const arrears = await priorArrearsByStudent(
      students.map((student) => student.id),
      termBill.term,
      termBill.academicYear
    );
    const existing = new Set(
      (
        await prisma.studentBill.findMany({
          where: { termBillId, studentId: { in: students.map((student) => student.id) } },
          select: { studentId: true },
        })
      ).map((bill) => bill.studentId)
    );

    const billDate = new Date();
    //* Callback form: the tenant-aware client rejects array-style transactions.
    //* A group template can cover hundreds of students, hence the long timeout.
    await prisma.$transaction(
      async (tx) => {
        for (const student of students) {
          const studentArrears = arrears.get(student.id) ?? 0;
          const content = {
            term: termBill.term,
            academicYear: termBill.academicYear,
            studentName: [student.name, student.otherNames, student.surname].filter(Boolean).join(" "),
            className: student.class?.name ?? null,
            items,
            totalAmount,
            arrears: studentArrears,
            grandTotal: roundMoney(totalAmount + studentArrears),
            billDate,
            resumptionDate,
            notes: notes || null,
          };
          await tx.studentBill.upsert({
            where: { studentId_termBillId: { studentId: student.id, termBillId } },
            create: {
              ...content,
              studentId: student.id,
              termBillId,
              createdById: actor.id,
              createdByName: actor.name || actor.username || "Admin",
            },
            update: content,
          });
        }
      },
      { maxWait: 10000, timeout: 60000 }
    );

    revalidateBillPages();
    return {
      success: true,
      created: students.length - existing.size,
      updated: existing.size,
    };
  } catch (error) {
    return toFailure(error, "Unable to generate the bills. Please try again.");
  }
}

//* Releases many drafts at once, e.g. a whole class's bills to its parents.
//* Already-published bills are left alone, so their publish date stands.
export async function publishStudentBills(
  ids: number[]
): Promise<{ success: true; count: number } | ActionFailure> {
  try {
    await requireFeeAccess("generateBill");

    const billIds = Array.isArray(ids)
      ? [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))]
      : [];
    if (billIds.length === 0) {
      return { success: false, error: "There are no draft bills to publish." };
    }
    if (billIds.length > 2000) {
      return { success: false, error: "Publish at most 2,000 bills at a time." };
    }

    const { count } = await prisma.studentBill.updateMany({
      where: { id: { in: billIds }, publishedAt: null },
      data: { publishedAt: new Date() },
    });
    revalidateBillPages();
    return { success: true, count };
  } catch (error) {
    return toFailure(error, "Unable to publish the bills. Please try again.");
  }
}

export async function setStudentBillPublished(
  id: number,
  published: boolean
): Promise<{ success: true; publishedAt: string | null } | ActionFailure> {
  try {
    await requireFeeAccess("generateBill");

    if (!Number.isInteger(id) || id <= 0) {
      return { success: false, error: "Invalid bill." };
    }

    const bill = await prisma.studentBill.update({
      where: { id },
      data: { publishedAt: published ? new Date() : null },
      select: { publishedAt: true },
    });
    revalidateBillPages();
    return { success: true, publishedAt: bill.publishedAt?.toISOString() ?? null };
  } catch (error) {
    if ((error as { code?: unknown })?.code === "P2025") {
      return { success: false, error: "This bill was deleted by someone else." };
    }
    return toFailure(error, "Unable to update the bill. Please try again.");
  }
}

export async function deleteStudentBill(id: number): Promise<{ success: true } | ActionFailure> {
  try {
    await requireFeeAccess("generateBill");

    if (!Number.isInteger(id) || id <= 0) {
      return { success: false, error: "Invalid bill." };
    }

    await prisma.studentBill.deleteMany({ where: { id } });
    revalidateBillPages();
    return { success: true };
  } catch (error) {
    return toFailure(error, "Unable to delete the bill. Please try again.");
  }
}
