"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveCurrentAppBaseUrl } from "@/lib/app-url";
import { getSystemSettings } from "@/lib/settings";
import { sendSMS } from "@/lib/sms";
import { sendWhatsAppReceiptTemplateMessage } from "@/lib/whatsapp";
import { writeServerAuditLog } from "@/lib/audit-server";
import { normalizeTermValue } from "@/lib/termUtils";
import {
  parseTermBillScope,
  type TermBillTargetType,
} from "@/lib/termBillScope";
import { resolveTermBillTarget } from "@/lib/term-bill-target";
import {
  userHasFeePermission,
} from "@/lib/user-permissions-server";
import { type FeePermissionKey } from "@/lib/user-permissions";
import {
  isAuthorizationError,
  requireFeeAccess,
  requireFeeEditAccess,
  requireStaff,
} from "@/lib/security/guard";
import {
  FEE_IMPORT_MAX_ROWS,
  formatFeeMoney,
  roundMoney,
  type FeeImportChange,
  type FeeImportIssue,
  type FeeImportRow,
  type FeeImportSummary,
} from "@/lib/fee-import";

function generateReceiptNumber(): string {
  const now = new Date();
  const pad = (n: number, d = 2) => String(n).padStart(d, "0");
  return `RCP${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(
    now.getHours()
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(Math.floor(Math.random() * 1000), 3)}`;
}

async function getActorInfo() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string; username?: string; name?: string } | undefined;
  return {
    label: user?.username || user?.name || "system",
    role: user?.role || "unknown",
  };
}

async function hasFeeAccess(permission: FeePermissionKey) {
  return userHasFeePermission(permission);
}

async function getPublicAppBaseUrl(publicAppUrl?: string | null) {
  return (publicAppUrl || (await resolveCurrentAppBaseUrl())).replace(/\/+$/, "");
}

function formatFeeAmount(amount: number) {
  return `GHS ${amount.toFixed(2)}`;
}

function buildFeeReceiptMessage(params: {
  studentName: string;
  amountPaid: number;
  feeType: string;
  currentBalance: number;
  receiptUrl: string;
}) {
  return (
    `Dear ${params.studentName} parent, an amount of ${formatFeeAmount(params.amountPaid)} ` +
    `has been debited to your ward account as ${params.feeType}. ` +
    `Current Balance is ${formatFeeAmount(params.currentBalance)}\n${params.receiptUrl}`
  );
}

export async function editFee(
  feeId: number,
  data: {
    title: string;
    amount: number;
    paidAmount: number;
    description?: string;
    dueDate: Date;
    term: string;
    academicYear: string;
    status: "PENDING" | "PAID" | "OVERDUE";
  }
): Promise<{ success: boolean; message: string }> {
  const startedAt = Date.now();

  try {
    const actor = await requireFeeEditAccess();

    const normalizedTerm = normalizeTermValue(data.term);

    await prisma.fee.update({
      where: { id: feeId },
      data: {
        title: data.title.trim(),
        amount: data.amount,
        paidAmount: data.paidAmount,
        description: data.description?.trim() || null,
        dueDate: data.dueDate,
        term: normalizedTerm,
        academicYear: data.academicYear.trim(),
        status: data.status,
      },
    });

    const actorName = actor.username || actor.name || "staff";
    revalidatePath("/dashboard/fees");
    await writeServerAuditLog({
      action: "fee.edit",
      category: "finance",
      summary: `${actorName} edited fee ${feeId}: ${data.title}`,
      durationMs: Date.now() - startedAt,
      entity: { type: "fee", id: feeId, label: data.title },
      metadata: {
        feeId,
        title: data.title,
        amount: data.amount,
        paidAmount: data.paidAmount,
        term: normalizedTerm,
        academicYear: data.academicYear,
        status: data.status,
        editedBy: actorName,
        editedByRole: actor.role,
      },
    });

    return { success: true, message: "Fee record updated successfully." };
  } catch (err) {
    if (isAuthorizationError(err)) {
      return { success: false, message: err.message };
    }
    console.error("editFee error:", err);
    return { success: false, message: "Failed to update fee record." };
  }
}



export async function getAllClasses(): Promise<{ id: number; name: string }[]> {
  try {
    await requireStaff();
    const classes = await prisma.class.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return classes;
  } catch (err) {
    console.error("getAllClasses error:", err);
    return [];
  }
}

export async function createGradeFee(
  prevState: { success: boolean; error: boolean },
  data: {
    gradeId: number;
    title: string;
    amount: number;
    dueDate: Date;
    status: "PENDING" | "PAID" | "OVERDUE";
    description?: string;
  }
) {
  void prevState;
  const startedAt = Date.now();

  try {
    await requireFeeAccess("generateBill");
    if (!(await hasFeeAccess("schoolFees"))) {
      return { success: false, error: true, message: "Unauthorized: You do not have access to create fees." };
    }

    const settings = await getSystemSettings();
    const term = normalizeTermValue(settings.currentTerm);
    const academicYear = settings.academicYear || "";

    const students = await prisma.student.findMany({
      where: { gradeId: data.gradeId },
      select: { id: true },
    });

    if (students.length === 0) {
      return { success: false, error: true, message: "No students found in this grade." };
    }

    await prisma.fee.createMany({
      data: students.map((s) => ({
        studentId: s.id,
        title: data.title,
        amount: data.amount,
        paidAmount: 0,
        dueDate: data.dueDate,
        status: data.status,
        description: data.description || null,
        term,
        academicYear,
      })),
      skipDuplicates: true,
    });

    revalidatePath("/dashboard/fees");
    await writeServerAuditLog({
      action: "fee.bulk_create",
      category: "finance",
      summary: `Created ${data.title} for ${students.length} student(s)`,
      durationMs: Date.now() - startedAt,
      entity: {
        type: "grade_fee_batch",
        id: data.gradeId,
        label: data.title,
      },
      metadata: {
        gradeId: data.gradeId,
        studentCount: students.length,
        amount: data.amount,
        status: data.status,
        term,
        academicYear,
      },
    });
    return { success: true, error: false, message: `Fee created for ${students.length} student(s).` };
  } catch (err) {
    console.error("createGradeFee error:", err);
    return { success: false, error: true, message: "Failed to create fees." };
  }
}

export async function updateFee(
  prevState: { success: boolean; error: boolean },
  data: {
    id: number;
    title: string;
    description?: string;
    amount: number;
    dueDate: Date;
    status: string;
    studentId: string;
  }
) {
  void prevState;
  const startedAt = Date.now();

  try {
    await requireFeeEditAccess();

    await prisma.fee.update({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description || null,
        amount: data.amount,
        dueDate: data.dueDate,
        status: data.status as "PENDING" | "PAID" | "OVERDUE",
        studentId: data.studentId,
      },
    });
    revalidatePath("/dashboard/fees");
    await writeServerAuditLog({
      action: "fee.update",
      category: "finance",
      summary: `Updated fee ${data.title}`,
      durationMs: Date.now() - startedAt,
      entity: {
        type: "fee",
        id: data.id,
        label: data.title,
      },
      metadata: {
        studentId: data.studentId,
        amount: data.amount,
        status: data.status,
      },
    });
    return { success: true, error: false, message: "Fee updated." };
  } catch (err) {
    if (isAuthorizationError(err)) {
      return { success: false, error: true, message: err.message };
    }
    console.error("updateFee error:", err);
    return { success: false, error: true, message: "Failed to update fee." };
  }
}

export async function deleteFee(
  prevState: { success: boolean; error: boolean },
  formData: FormData
) {
  void prevState;
  const startedAt = Date.now();

  try {
    await requireFeeAccess("schoolFees");
    if (!(await hasFeeAccess("schoolFees"))) {
      return { success: false, error: true };
    }

    const id = parseInt(formData.get("id") as string);
    await prisma.fee.delete({ where: { id } });
    revalidatePath("/dashboard/fees");
    await writeServerAuditLog({
      action: "fee.delete",
      category: "finance",
      summary: `Deleted fee ${id}`,
      durationMs: Date.now() - startedAt,
      entity: {
        type: "fee",
        id,
      },
    });
    return { success: true, error: false };
  } catch (err) {
    console.error("deleteFee error:", err);
    return { success: false, error: true };
  }
}

export async function deleteAllFees(): Promise<{
  success: boolean;
  message: string;
  deletedCount?: number;
}> {
  const startedAt = Date.now();

  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { role?: string; adminRole?: string } | undefined;

    if (!session || user?.role !== "admin" || user?.adminRole !== "SUPER_ADMIN") {
      return { success: false, message: "Unauthorized: Only Super Admins can delete all fees." };
    }

    const result = await prisma.fee.deleteMany({});
    revalidatePath("/dashboard/fees");
    await writeServerAuditLog({
      action: "fee.delete_all",
      category: "finance",
      summary: `Deleted ${result.count} fee record(s)`,
      durationMs: Date.now() - startedAt,
      entity: {
        type: "fee_batch",
        label: "All Fees",
      },
      metadata: {
        deletedCount: result.count,
      },
    });
    return {
      success: true,
      message: `All fee records deleted (${result.count} fees removed).`,
      deletedCount: result.count,
    };
  } catch (err) {
    console.error("deleteAllFees error:", err);
    return { success: false, message: "Failed to delete all fees." };
  }
}

export async function recordFeePayment(
  feeId: number,
  amount: number,
  paymentMethod: "CASH" | "MOMO" | "ONLINE" = "CASH",
  notes?: string
): Promise<{ success: boolean; message: string; receiptNumber?: string }> {
  const startedAt = Date.now();

  try {
    await requireFeeAccess("receipt");
    if (!(await hasFeeAccess("receipt"))) {
      return { success: false, message: "Unauthorized: You do not have access to record fee payments." };
    }

    const actor = await getActorInfo();
    const fee = await prisma.fee.findUnique({
      where: { id: feeId },
      include: {
        student: {
          include: { parent: true },
        },
      },
    });

    if (!fee) {
      return { success: false, message: "Fee not found." };
    }

    const newPaidAmount = Math.min(fee.paidAmount + amount, fee.amount);
    const remaining = fee.amount - newPaidAmount;
    const newStatus: "PENDING" | "PAID" | "OVERDUE" =
      remaining <= 0 ? "PAID" : fee.status === "OVERDUE" ? "OVERDUE" : "PENDING";

    const receiptNumber = generateReceiptNumber();
    const settings = await getSystemSettings();
    const baseUrl = await getPublicAppBaseUrl(settings?.publicAppUrl);
    const receiptUrl = `${baseUrl}/receipt/${encodeURIComponent(receiptNumber)}`;
    const studentName = `${fee.student.name} ${fee.student.surname}`.trim();
    const feeType = fee.title?.trim() || "School Fees";
    const schoolName = settings?.schoolName || "Student Management System";
    let paymentId: number | null = null;
    let smsDeliveryId: number | null = null;
    let whatsappDeliveryId: number | null = null;
    let currentAccountBalance = Math.max(remaining, 0);

    await prisma.$transaction(async (tx) => {
      await tx.fee.update({
        where: { id: feeId },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
          paymentMethod,
        },
      });

      const payment = await tx.feePayment.create({
        data: {
          studentId: fee.studentId,
          feeId: fee.id,
          amount,
          paymentMethod,
          receiptNumber,
          term: fee.term,
          academicYear: fee.academicYear,
          recordedBy: actor.label,
          notes: notes || null,
        },
      });
      paymentId = payment.id;

      const totals = await tx.fee.aggregate({
        where: { studentId: fee.studentId },
        _sum: { amount: true, paidAmount: true },
      });
      currentAccountBalance = Math.max(
        (totals._sum.amount ?? 0) - (totals._sum.paidAmount ?? 0),
        0
      );

      const receiptMessage = buildFeeReceiptMessage({
        studentName,
        amountPaid: amount,
        feeType,
        currentBalance: currentAccountBalance,
        receiptUrl,
      });
      const parentPhone = fee.student?.parent?.phone?.trim();

      if (!parentPhone) {
        await tx.receiptDelivery.create({
          data: {
            feePaymentId: payment.id,
            channel: "SMS",
            recipient: "No parent phone",
            message: receiptMessage,
            receiptUrl,
            status: "SKIPPED",
            error: "Parent phone number is missing.",
          },
        });
        return;
      }

      const smsDelivery = await tx.receiptDelivery.create({
        data: {
          feePaymentId: payment.id,
          channel: "SMS",
          recipient: parentPhone,
          message: receiptMessage,
          receiptUrl,
          status: "PENDING",
        },
      });

      const whatsappDelivery = await tx.receiptDelivery.create({
        data: {
          feePaymentId: payment.id,
          channel: "WHATSAPP",
          recipient: parentPhone,
          message: receiptMessage,
          receiptUrl,
          status: "PENDING",
        },
      });

      smsDeliveryId = smsDelivery.id;
      whatsappDeliveryId = whatsappDelivery.id;
    });

    const parentPhone = fee.student?.parent?.phone?.trim();
    if (parentPhone && paymentId) {
      const receiptMessage = buildFeeReceiptMessage({
        studentName,
        amountPaid: amount,
        feeType,
        currentBalance: currentAccountBalance,
        receiptUrl,
      });

      const [smsResult, whatsappResult] = await Promise.allSettled([
        sendSMS(parentPhone, receiptMessage),
        sendWhatsAppReceiptTemplateMessage({
          phone: parentPhone,
          schoolName,
          studentName,
          amountPaid: formatFeeAmount(amount),
          receiptUrl,
        }),
      ]);

      if (smsDeliveryId) {
        await prisma.receiptDelivery.update({
          where: { id: smsDeliveryId },
          data:
            smsResult.status === "fulfilled" && smsResult.value.success
              ? { status: "SENT", sentAt: new Date(), error: null }
              : {
                  status: "FAILED",
                  error:
                    smsResult.status === "fulfilled"
                      ? smsResult.value.error ?? "SMS provider rejected the receipt message."
                      : smsResult.reason instanceof Error
                        ? smsResult.reason.message
                        : "Failed to send receipt SMS.",
                },
        });
      }

      if (whatsappDeliveryId) {
        await prisma.receiptDelivery.update({
          where: { id: whatsappDeliveryId },
          data:
            whatsappResult.status === "fulfilled" && whatsappResult.value.success
              ? { status: "SENT", sentAt: new Date(), error: null }
              : {
                  status: "FAILED",
                  error:
                    whatsappResult.status === "fulfilled"
                      ? whatsappResult.value.error ??
                        "WhatsApp provider rejected the receipt message."
                      : whatsappResult.reason instanceof Error
                        ? whatsappResult.reason.message
                        : "Failed to send receipt WhatsApp message.",
                },
        });
      }

      if (smsResult.status === "fulfilled" && !smsResult.value.success) {
        console.error("Failed to send receipt SMS:", smsResult.value.error);
      } else if (smsResult.status === "rejected") {
        console.error("Failed to send receipt SMS:", smsResult.reason);
      }

      if (whatsappResult.status === "fulfilled" && !whatsappResult.value.success) {
        console.error("Failed to send receipt WhatsApp message:", whatsappResult.value.error);
      } else if (whatsappResult.status === "rejected") {
        console.error("Failed to send receipt WhatsApp message:", whatsappResult.reason);
      }
    }

    revalidatePath("/dashboard/fees");
    revalidatePath(`/receipt/${receiptNumber}`);
    await writeServerAuditLog({
      action: "fee.payment.record",
      category: "finance",
      summary: `Recorded ${paymentMethod.toLowerCase()} payment for ${fee.title}`,
      durationMs: Date.now() - startedAt,
      entity: {
        type: "fee_payment",
        label: receiptNumber,
      },
      metadata: {
        feeId,
        studentId: fee.studentId,
        amount,
        paymentMethod,
        receiptNumber,
      },
    });
    return { success: true, message: "Payment recorded successfully.", receiptNumber };
  } catch (err) {
    console.error("recordFeePayment error:", err);
    return { success: false, message: "Failed to record payment." };
  }
}

export async function createTermBill(data: {
  targetType: TermBillTargetType;
  targetId: number;
  term: string;
  academicYear: string;
  items: { itemName: string; amount: number }[];
}): Promise<{ success: boolean; message: string }> {
  const startedAt = Date.now();

  try {
    await requireFeeAccess("prepareBill");
    if (!(await hasFeeAccess("prepareBill"))) {
      return { success: false, message: "Unauthorized: You do not have access to prepare bills." };
    }

    const totalAmount = data.items.reduce((sum, item) => sum + item.amount, 0);
    const targetResolution = await resolveTermBillTarget(data.targetType, data.targetId);

    if (!targetResolution.success) {
      return { success: false, message: targetResolution.message };
    }

    const target = targetResolution.value;

    const termBill = await prisma.termBill.create({
      data: {
        level: target.encodedScope,
        term: data.term,
        academicYear: data.academicYear,
        totalAmount,
        items: {
          create: data.items.map((i) => ({ itemName: i.itemName, amount: i.amount })),
        },
      },
    });

    revalidatePath("/dashboard/fees");
    await writeServerAuditLog({
      action: "term_bill.create",
      category: "finance",
      summary: `Created term bill for ${target.targetTypeLabel} ${target.targetLabel}`,
      durationMs: Date.now() - startedAt,
      entity: {
        type: "term_bill",
        id: termBill.id,
        label: `${data.term} ${data.academicYear}`,
      },
      metadata: {
        ...target.metadata,
        itemCount: data.items.length,
        totalAmount,
      },
    });
    return { success: true, message: "Term bill template created." };
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e?.code === "P2002") {
      return {
        success: false,
        message: "A bill for this target, term, and academic year already exists.",
      };
    }

    console.error("createTermBill error:", err);
    return { success: false, message: "Failed to create term bill." };
  }
}

/**
 * Titles that belong to an admission bill rather than to a term bill.
 *
 * A term bill's sync passes rewrite the fees a student holds for the term. An
 * admission fee sits in that same term without being part of that bill, so
 * unless it is held out it gets rewritten into a second copy of the school fee:
 * the student is left billed twice and what they owed for admission is gone.
 */
async function loadAdmissionFeeTitles(): Promise<Set<string>> {
  const bills = await prisma.admissionBill.findMany({ select: { item: true } });

  return new Set(bills.map((bill) => bill.item.trim().toLowerCase()));
}

export async function updateTermBill(
  id: number,
  data: { items: { itemName: string; amount: number }[] }
): Promise<{ success: boolean; message: string }> {
  const startedAt = Date.now();

  try {
    await requireFeeAccess("prepareBill");
    if (!(await hasFeeAccess("prepareBill"))) {
      return { success: false, message: "Unauthorized: You do not have access to update bill templates." };
    }

    const totalAmount = data.items.reduce((sum, item) => sum + item.amount, 0);

    // 1. Load existing bill to get term / academicYear / level
    const existingBill = await prisma.termBill.findUnique({ where: { id } });
    if (!existingBill) {
      return { success: false, message: "Term bill not found." };
    }

    // 2. Resolve target -> student IDs
    const parsedScope = parseTermBillScope(existingBill.level);
    let studentIds: string[] = [];
    let updatedFeeCount = 0;

    if (parsedScope) {
      const targetResolution = await resolveTermBillTarget(
        parsedScope.targetType,
        parsedScope.targetId
      );
      if (targetResolution.success) {
        const students = await prisma.student.findMany({
          where: targetResolution.value.studentWhere,
          select: { id: true },
        });
        studentIds = students.map((s) => s.id);
      }
    }

    // 3. Derive the same title / description as prepareTermFees
    const newFeeTitle =
      data.items.length === 1
        ? data.items[0].itemName
        : `${existingBill.term} Fee Bill`;

    const newDescription = data.items
      .map((i) => `${i.itemName}: GHS ${i.amount.toFixed(2)}`)
      .join(" | ");

    const admissionTitles = await loadAdmissionFeeTitles();

    // 4. Update template + sync PENDING fee records atomically
    await prisma.$transaction(async (tx) => {
      await tx.termBillItem.deleteMany({ where: { termBillId: id } });
      await tx.termBill.update({
        where: { id },
        data: {
          totalAmount,
          items: { create: data.items.map((i) => ({ itemName: i.itemName, amount: i.amount })) },
        },
      });

      // Only update PENDING fees; paid fees are preserved as-is
      if (studentIds.length > 0) {
        const [pendingFees, priorFees] = await Promise.all([
          tx.fee.findMany({
            where: {
              studentId: { in: studentIds },
              term: existingBill.term,
              academicYear: existingBill.academicYear,
              status: "PENDING",
            },
            select: { id: true, studentId: true, title: true },
          }),
          tx.fee.findMany({
            where: {
              studentId: { in: studentIds },
              NOT: {
                term: existingBill.term,
                academicYear: existingBill.academicYear,
              },
              status: { not: "PAID" },
            },
            select: { studentId: true, amount: true, paidAmount: true },
          }),
        ]);

        const priorArrearsMap = new Map<string, number>();
        for (const pf of priorFees) {
          const balance = Math.max(pf.amount - pf.paidAmount, 0);
          if (balance > 0) {
            priorArrearsMap.set(
              pf.studentId,
              (priorArrearsMap.get(pf.studentId) || 0) + balance
            );
          }
        }

        //* Everything the term bill owns, and nothing it does not: an admission
        //* fee rewritten here becomes a duplicate of the school fee.
        const billFees = pendingFees.filter(
          (fee) => !admissionTitles.has(fee.title.trim().toLowerCase())
        );

        for (const fee of billFees) {
          const prior = priorArrearsMap.get(fee.studentId) || 0;
          const desc =
            prior > 0
              ? `[Arrears B/F: GHS ${prior.toFixed(2)} | Total Payable: GHS ${(totalAmount + prior).toFixed(2)}] • ${newDescription}`
              : newDescription;

          await tx.fee.update({
            where: { id: fee.id },
            data: {
              title: newFeeTitle,
              amount: totalAmount + prior,
              description: desc,
            },
          });
        }
        updatedFeeCount = billFees.length;
      }
    });

    revalidatePath("/dashboard/fees");
    await writeServerAuditLog({
      action: "term_bill.update",
      category: "finance",
      summary: `Updated term bill ${id} — synced ${updatedFeeCount} fee record(s)`,
      durationMs: Date.now() - startedAt,
      entity: { type: "term_bill", id },
      metadata: { itemCount: data.items.length, totalAmount, syncedFeeCount: updatedFeeCount },
    });

    const syncMsg = updatedFeeCount > 0 ? ` ${updatedFeeCount} existing fee record(s) updated.` : "";
    return { success: true, message: `Term bill updated.${syncMsg}` };
  } catch (err) {
    console.error("updateTermBill error:", err);
    return { success: false, message: "Failed to update term bill." };
  }
}

export async function deleteTermBill(id: number): Promise<{ success: boolean; message: string }> {
  const startedAt = Date.now();

  try {
    await requireFeeAccess("prepareBill");
    if (!(await hasFeeAccess("prepareBill"))) {
      return { success: false, message: "Unauthorized: You do not have access to delete bill templates." };
    }

    await prisma.termBill.delete({ where: { id } });
    revalidatePath("/dashboard/fees");
    await writeServerAuditLog({
      action: "term_bill.delete",
      category: "finance",
      summary: `Deleted term bill ${id}`,
      durationMs: Date.now() - startedAt,
      entity: {
        type: "term_bill",
        id,
      },
    });
    return { success: true, message: "Term bill deleted." };
  } catch (err) {
    console.error("deleteTermBill error:", err);
    return { success: false, message: "Failed to delete term bill." };
  }
}

export async function prepareTermFees(
  termBillId: number
): Promise<{ success: boolean; message: string; count?: number }> {
  const startedAt = Date.now();

  try {
    await requireFeeAccess("prepareBill");
    if (!(await hasFeeAccess("prepareBill"))) {
      return { success: false, message: "Unauthorized: You do not have access to prepare fees from bill templates." };
    }

    const settings = await getSystemSettings();
    const termBill = await prisma.termBill.findUnique({
      where: { id: termBillId },
      include: { items: true },
    });

    if (!termBill) {
      return { success: false, message: "Term bill not found." };
    }

    const parsedScope = parseTermBillScope(termBill.level);
    if (!parsedScope) {
      return { success: false, message: "Invalid bill target." };
    }

    const targetResolution = await resolveTermBillTarget(
      parsedScope.targetType,
      parsedScope.targetId
    );

    if (!targetResolution.success) {
      return { success: false, message: targetResolution.message };
    }

    const target = targetResolution.value;

    const students = await prisma.student.findMany({
      where: target.studentWhere,
      select: { id: true },
    });

    if (students.length === 0) {
      return {
        success: false,
        message: `No students found in ${target.targetTypeLabel} ${target.targetLabel}.`,
      };
    }

    const settingsAny = settings as Record<string, unknown>;
    const dueDate = settingsAny.vacationDate
      ? new Date(settingsAny.vacationDate as string | Date)
      : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const preparedFeeTitle =
      termBill.items.length === 1
        ? termBill.items[0].itemName
        : `${termBill.term} Fee Bill`;
    const preparedDescription = termBill.items
      .map((i) => `${i.itemName}: GHS ${i.amount.toFixed(2)}`)
      .join(" | ");

    const studentIds = students.map((s) => s.id);

    // Find students who already have a fee record for this term/year (any status)
    // and query prior unpaid fees for arrears brought forward (B/F)
    const [feesThisTerm, admissionTitles, priorFees] = await Promise.all([
      prisma.fee.findMany({
        where: {
          studentId: { in: studentIds },
          term: termBill.term,
          academicYear: termBill.academicYear,
        },
        select: { id: true, studentId: true, status: true, title: true },
      }),
      loadAdmissionFeeTitles(),
      prisma.fee.findMany({
        where: {
          studentId: { in: studentIds },
          NOT: {
            term: termBill.term,
            academicYear: termBill.academicYear,
          },
          status: { not: "PAID" },
        },
        select: {
          studentId: true,
          amount: true,
          paidAmount: true,
        },
      }),
    ]);

    const priorArrearsMap = new Map<string, number>();
    for (const pf of priorFees) {
      const balance = Math.max(pf.amount - pf.paidAmount, 0);
      if (balance > 0) {
        priorArrearsMap.set(
          pf.studentId,
          (priorArrearsMap.get(pf.studentId) || 0) + balance
        );
      }
    }

    const buildDescription = (studentId: string) => {
      const prior = priorArrearsMap.get(studentId) || 0;
      if (prior > 0) {
        return `[Arrears B/F: GHS ${prior.toFixed(2)} | Total Payable: GHS ${(termBill.totalAmount + prior).toFixed(2)}] • ${preparedDescription}`;
      }
      return preparedDescription;
    };

    //* An admission fee sits in the same term as the term bill but is its own
    //* charge. Counting one as "already billed" would leave the student without
    //* the school fee, and re-pricing it would overwrite what they owe for
    //* admission with the term amount.
    const existingFees = feesThisTerm.filter(
      (fee) => !admissionTitles.has(fee.title.trim().toLowerCase())
    );

    const existingStudentIds = new Set(existingFees.map((f) => f.studentId));

    //* Whatever else is true, a student must never come out of this holding two
    //* copies of the same bill. Re-running Prepare Bill is routine, so the guard
    //* is on the title actually about to be written.
    const preparedTitleKey = preparedFeeTitle.trim().toLowerCase();
    const alreadyHasThisBill = new Set(
      feesThisTerm
        .filter((fee) => fee.title.trim().toLowerCase() === preparedTitleKey)
        .map((fee) => fee.studentId)
    );

    const newStudentIds = studentIds.filter(
      (id) => !existingStudentIds.has(id) && !alreadyHasThisBill.has(id)
    );

    // IDs of PENDING existing records that should be updated with the new amounts
    const pendingFees = existingFees.filter((f) => f.status === "PENDING");
    const pendingFeeIds = pendingFees.map((f) => f.id);

    await prisma.$transaction(async (tx) => {
      // Update existing PENDING fee records to match the new bill amounts and reflect prior arrears
      for (const fee of pendingFees) {
        const prior = priorArrearsMap.get(fee.studentId) || 0;
        await tx.fee.update({
          where: { id: fee.id },
          data: {
            title: preparedFeeTitle,
            amount: termBill.totalAmount + prior,
            description: buildDescription(fee.studentId),
            dueDate,
          },
        });
      }

      // Create fee records only for students who have none yet
      if (newStudentIds.length > 0) {
        await tx.fee.createMany({
          data: newStudentIds.map((studentId) => {
            const prior = priorArrearsMap.get(studentId) || 0;
            return {
              studentId,
              title: preparedFeeTitle,
              amount: termBill.totalAmount + prior,
              paidAmount: 0,
              dueDate,
              status: "PENDING" as const,
              term: termBill.term,
              academicYear: termBill.academicYear,
              description: buildDescription(studentId),
            };
          }),
        });
      }
    });

    const studentsWithArrearsCount = Array.from(priorArrearsMap.values()).filter(
      (v) => v > 0
    ).length;
    const totalArrearsBF = Array.from(priorArrearsMap.values()).reduce(
      (sum, v) => sum + v,
      0
    );

    revalidatePath("/dashboard/fees");
    await writeServerAuditLog({
      action: "term_fee.prepare",
      category: "finance",
      summary: `Prepared fees from term bill ${termBillId}`,
      durationMs: Date.now() - startedAt,
      entity: {
        type: "term_bill",
        id: termBillId,
        label: `${termBill.term} ${termBill.academicYear}`,
      },
      metadata: {
        ...target.metadata,
        newCount: newStudentIds.length,
        updatedCount: pendingFeeIds.length,
        skippedPaidCount: existingFees.length - pendingFeeIds.length,
        studentsWithArrearsCount,
        totalArrearsBF,
        totalAmount: termBill.totalAmount,
      },
    });

    const parts: string[] = [];
    if (newStudentIds.length > 0) parts.push(`${newStudentIds.length} new record(s) created`);
    if (pendingFeeIds.length > 0) parts.push(`${pendingFeeIds.length} existing record(s) updated`);
    const skipped = existingFees.length - pendingFeeIds.length;
    if (skipped > 0) parts.push(`${skipped} already-paid record(s) left unchanged`);
    if (studentsWithArrearsCount > 0) {
      parts.push(
        `${studentsWithArrearsCount} student(s) with prior arrears B/F totaling GHS ${totalArrearsBF.toFixed(2)}`
      );
    }

    return {
      success: true,
      message: parts.length > 0
        ? `Fees prepared for ${target.targetLabel}: ${parts.join(", ")}.`
        : `No changes needed — all fee records are already up to date.`,
      count: students.length,
    };
  } catch (err) {
    console.error("prepareTermFees error:", err);
    return { success: false, message: "Failed to prepare fees." };
  }
}


export async function createAdmissionBill(data: {
  level: string;
  item?: string;
  amount: number;
}): Promise<{ success: boolean; message: string }> {
  const startedAt = Date.now();

  try {
    await requireFeeAccess("admissions");
    if (!(await hasFeeAccess("admissions"))) {
      return { success: false, message: "Unauthorized: You do not have access to manage admission bills." };
    }

    const itemName = data.item || "Admission Fee & Form";

    const bill = await prisma.admissionBill.create({
      data: {
        level: data.level,
        item: itemName,
        amount: data.amount,
      },
    });
    revalidatePath("/dashboard/fees");
    await writeServerAuditLog({
      action: "admission_bill.create",
      category: "finance",
      summary: `Created admission bill for level ${data.level}`,
      durationMs: Date.now() - startedAt,
      entity: {
        type: "admission_bill",
        id: bill.id,
        label: data.level,
      },
      metadata: {
        item: itemName,
        amount: data.amount,
      },
    });

    //* An admission bill is a price, not a charge. It says what joining this
    //* level costs; the student who joins is billed it on admission. Charging
    //* everyone standing at the level would hit continuing students, who owe
    //* the term bill instead.
    return { success: true, message: "Admission bill created." };
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e?.code === "P2002") {
      return { success: false, message: "An admission bill for this level already exists." };
    }

    console.error("createAdmissionBill error:", err);
    return { success: false, message: "Failed to create admission bill." };
  }
}

export async function updateAdmissionBill(
  id: number,
  data: { level?: string; item?: string; amount?: number }
): Promise<{ success: boolean; message: string }> {
  const startedAt = Date.now();

  try {
    await requireFeeAccess("admissions");
    if (!(await hasFeeAccess("admissions"))) {
      return { success: false, message: "Unauthorized: You do not have access to update admission bills." };
    }

    //* Editing the price does not re-bill anyone: students already admitted
    //* were charged what the bill said at the time, and students still at this
    //* level who never joined through it owe the term bill, not this.
    await prisma.admissionBill.update({ where: { id }, data });
    revalidatePath("/dashboard/fees");

    await writeServerAuditLog({
      action: "admission_bill.update",
      category: "finance",
      summary: `Updated admission bill ${id}`,
      durationMs: Date.now() - startedAt,
      entity: {
        type: "admission_bill",
        id,
      },
      metadata: data,
    });
    return { success: true, message: "Admission bill updated." };
  } catch (err) {
    console.error("updateAdmissionBill error:", err);
    return { success: false, message: "Failed to update admission bill." };
  }
}

export async function deleteAdmissionBill(id: number): Promise<{ success: boolean; message: string }> {
  const startedAt = Date.now();

  try {
    await requireFeeAccess("admissions");
    if (!(await hasFeeAccess("admissions"))) {
      return { success: false, message: "Unauthorized: You do not have access to delete admission bills." };
    }

    await prisma.admissionBill.delete({ where: { id } });
    revalidatePath("/dashboard/fees");
    await writeServerAuditLog({
      action: "admission_bill.delete",
      category: "finance",
      summary: `Deleted admission bill ${id}`,
      durationMs: Date.now() - startedAt,
      entity: {
        type: "admission_bill",
        id,
      },
    });
    return { success: true, message: "Admission bill deleted." };
  } catch (err) {
    console.error("deleteAdmissionBill error:", err);
    return { success: false, message: "Failed to delete admission bill." };
  }
}

// ─── RECEIPT INFO + RESEND ────────────────────────────────────────────────────

export async function getLatestReceiptInfo(feeId: number): Promise<{
  success: boolean;
  receiptNumber: string | null;
  receiptUrl: string | null;
  smsStatus: string | null;
  smsRecipient: string | null;
  smsSentAt: string | null;
  smsError: string | null;
} | { success: false; message: string }> {
  try {
    await requireFeeAccess("receipt");
    const payment = await prisma.feePayment.findFirst({
      where: { feeId },
      orderBy: { paidAt: "desc" },
      select: {
        receiptNumber: true,
        receiptDeliveries: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            channel: true,
            status: true,
            recipient: true,
            sentAt: true,
            error: true,
            receiptUrl: true,
          },
        },
      },
    });

    if (!payment) {
      return { success: true, receiptNumber: null, receiptUrl: null, smsStatus: null, smsRecipient: null, smsSentAt: null, smsError: null };
    }

    const settings = await getSystemSettings();
    const baseUrl = await getPublicAppBaseUrl(settings?.publicAppUrl);
    const receiptUrl = payment.receiptNumber
      ? `${baseUrl}/receipt/${encodeURIComponent(payment.receiptNumber)}`
      : null;

    const smsDelivery = payment.receiptDeliveries.find(d => d.channel === "SMS") ?? payment.receiptDeliveries[0] ?? null;

    return {
      success: true,
      receiptNumber: payment.receiptNumber,
      receiptUrl: smsDelivery?.receiptUrl ?? receiptUrl,
      smsStatus: smsDelivery?.status ?? null,
      smsRecipient: smsDelivery?.recipient ?? null,
      smsSentAt: smsDelivery?.sentAt?.toISOString() ?? null,
      smsError: smsDelivery?.error ?? null,
    };
  } catch (err) {
    console.error("getLatestReceiptInfo error:", err);
    return { success: false, message: "Failed to fetch receipt info." };
  }
}

export async function resendReceipt(feeId: number): Promise<{
  success: boolean;
  message: string;
}> {
  const startedAt = Date.now();

  try {
    await requireFeeAccess("receipt");
    if (!(await hasFeeAccess("receipt"))) {
      return { success: false, message: "Unauthorized: You do not have access to resend receipts." };
    }

    const fee = await prisma.fee.findUnique({
      where: { id: feeId },
      include: {
        student: { include: { parent: true } },
      },
    });

    if (!fee) {
      return { success: false, message: "Fee record not found." };
    }

    const payment = await prisma.feePayment.findFirst({
      where: { feeId },
      orderBy: { paidAt: "desc" },
    });

    if (!payment) {
      return { success: false, message: "No payment found for this fee record." };
    }

    const parentPhone = fee.student?.parent?.phone?.trim();
    if (!parentPhone) {
      return { success: false, message: "Parent phone number is missing." };
    }

    const settings = await getSystemSettings();
    const baseUrl = await getPublicAppBaseUrl(settings?.publicAppUrl);
    const receiptUrl = `${baseUrl}/receipt/${encodeURIComponent(payment.receiptNumber)}`;
    const studentName = `${fee.student.name} ${fee.student.surname}`.trim();
    const feeType = fee.title?.trim() || "School Fees";

    // Recalculate current balance across all fees for this student
    const totals = await prisma.fee.aggregate({
      where: { studentId: fee.studentId },
      _sum: { amount: true, paidAmount: true },
    });
    const currentBalance = Math.max(
      (totals._sum.amount ?? 0) - (totals._sum.paidAmount ?? 0),
      0
    );

    const receiptMessage = buildFeeReceiptMessage({
      studentName,
      amountPaid: payment.amount,
      feeType,
      currentBalance,
      receiptUrl,
    });

    // Record a new delivery attempt
    const delivery = await prisma.receiptDelivery.create({
      data: {
        feePaymentId: payment.id,
        channel: "SMS",
        recipient: parentPhone,
        message: receiptMessage,
        receiptUrl,
        status: "PENDING",
      },
    });

    const smsResult = await sendSMS(parentPhone, receiptMessage);

    await prisma.receiptDelivery.update({
      where: { id: delivery.id },
      data: smsResult.success
        ? { status: "SENT", sentAt: new Date(), error: null }
        : {
            status: "FAILED",
            error: smsResult.error ?? "SMS provider rejected the resend.",
          },
    });

    revalidatePath("/dashboard/fees");
    await writeServerAuditLog({
      action: "fee.receipt.resend",
      category: "finance",
      summary: `Resent receipt ${payment.receiptNumber} to ${parentPhone}`,
      durationMs: Date.now() - startedAt,
      entity: { type: "fee_payment", label: payment.receiptNumber },
      metadata: { feeId, phone: parentPhone, smsSuccess: smsResult.success },
    });

    if (smsResult.success) {
      return { success: true, message: `Receipt resent to ${parentPhone}.` };
    } else {
      return { success: false, message: `SMS failed: ${smsResult.error ?? "Unknown error"}` };
    }
  } catch (err) {
    console.error("resendReceipt error:", err);
    return { success: false, message: "Failed to resend receipt." };
  }
}

/**
 * Applies an edited copy of the Payment List export back onto the fee records.
 *
 * Same reach as the "Edit Fee Record" dialog — title, total, paid
 * amount, term and academic year — but for a whole file at once, so it is held
 * to the same permission and audit-trail rules as single-record editing.
 *
 * Call it once without `apply` to get the change list the modal previews, then
 * again with `apply: true` to write it. Nothing is written on the first call.
 *
 * A column missing from the file means "leave that field alone", so a sheet cut
 * down to FEE_ID and TOTAL_GHS is a valid import.
 */
export async function importFeeEdits(
  rows: FeeImportRow[],
  options?: { apply?: boolean }
): Promise<{ success: boolean; message: string; summary?: FeeImportSummary }> {
  const startedAt = Date.now();
  const apply = options?.apply === true;

  try {
    const actor = await requireFeeEditAccess();

    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: false, message: "The file has no rows to import." };
    }

    if (rows.length > FEE_IMPORT_MAX_ROWS) {
      return {
        success: false,
        message: `Import is limited to ${FEE_IMPORT_MAX_ROWS} rows per file. Split the file and try again.`,
      };
    }

    const errors: FeeImportIssue[] = [];
    const changes: FeeImportChange[] = [];
    let unchanged = 0;

    const feeIds = Array.from(
      new Set(
        rows.map((row) => row.feeId).filter((id): id is number => typeof id === "number")
      )
    );

    const fees = feeIds.length
      ? await prisma.fee.findMany({
          where: { id: { in: feeIds } },
          select: {
            id: true,
            title: true,
            amount: true,
            paidAmount: true,
            term: true,
            academicYear: true,
            status: true,
            student: { select: { studentId: true, name: true, surname: true } },
          },
        })
      : [];

    const feesById = new Map(fees.map((fee) => [fee.id, fee]));
    const seenFeeIds = new Set<number>();
    const updates: {
      feeId: number;
      data: {
        title: string;
        amount: number;
        paidAmount: number;
        term: string;
        academicYear: string;
        status: "PENDING" | "PAID" | "OVERDUE";
      };
    }[] = [];

    for (const row of rows) {
      if (row.feeId === null) {
        errors.push({
          rowNumber: row.rowNumber,
          message:
            "Missing or invalid FEE_ID — keep the FEE_ID column from the exported file.",
        });
        continue;
      }

      if (seenFeeIds.has(row.feeId)) {
        errors.push({
          rowNumber: row.rowNumber,
          message: `FEE_ID ${row.feeId} appears more than once in the file.`,
        });
        continue;
      }
      seenFeeIds.add(row.feeId);

      const fee = feesById.get(row.feeId);
      if (!fee) {
        errors.push({
          rowNumber: row.rowNumber,
          message: `No fee record found for FEE_ID ${row.feeId}.`,
        });
        continue;
      }

      //* Guards against a file whose rows were sorted or shifted after export.
      if (row.studentId && row.studentId !== fee.student.studentId) {
        errors.push({
          rowNumber: row.rowNumber,
          message: `STUDENT_ID '${row.studentId}' does not belong to FEE_ID ${row.feeId} (expected ${fee.student.studentId}).`,
        });
        continue;
      }

      //* null means the cell had content that is not a number — a typo, not a
      //* blank, so it is rejected rather than treated as "leave this alone".
      if (row.amount === null || (row.amount !== undefined && row.amount < 0)) {
        errors.push({
          rowNumber: row.rowNumber,
          message: "Total amount must be a number of 0 or more.",
        });
        continue;
      }

      if (
        row.paidAmount === null ||
        (row.paidAmount !== undefined && row.paidAmount < 0)
      ) {
        errors.push({
          rowNumber: row.rowNumber,
          message: "Paid amount must be a number of 0 or more.",
        });
        continue;
      }

      const title = row.title?.trim() || fee.title;
      if (!title) {
        errors.push({ rowNumber: row.rowNumber, message: "Fee item cannot be blank." });
        continue;
      }

      const amount = roundMoney(row.amount ?? fee.amount);
      const paidAmount = roundMoney(row.paidAmount ?? fee.paidAmount);

      if (paidAmount > amount) {
        errors.push({
          rowNumber: row.rowNumber,
          message: `Paid amount (${formatFeeMoney(paidAmount)}) cannot exceed the total (${formatFeeMoney(amount)}).`,
        });
        continue;
      }

      const term = row.term ? normalizeTermValue(row.term) : fee.term;
      const academicYear = row.academicYear?.trim() || fee.academicYear;

      //* PAYMENT_STATUS in the export is a display label, not the stored enum,
      //* so status is derived here rather than read back off the sheet.
      let status: "PENDING" | "PAID" | "OVERDUE" = fee.status as
        | "PENDING"
        | "PAID"
        | "OVERDUE";
      if (amount > 0 && paidAmount >= amount) {
        status = "PAID";
      } else if (status === "PAID") {
        status = "PENDING";
      }

      const fieldChanges: FeeImportChange["changes"] = [];
      if (title !== fee.title) {
        fieldChanges.push({ field: "Fee item", from: fee.title, to: title });
      }
      if (amount !== roundMoney(fee.amount)) {
        fieldChanges.push({
          field: "Total",
          from: formatFeeMoney(fee.amount),
          to: formatFeeMoney(amount),
        });
      }
      if (paidAmount !== roundMoney(fee.paidAmount)) {
        fieldChanges.push({
          field: "Paid",
          from: formatFeeMoney(fee.paidAmount),
          to: formatFeeMoney(paidAmount),
        });
      }
      if (term !== fee.term) {
        fieldChanges.push({ field: "Term", from: fee.term || "-", to: term });
      }
      if (academicYear !== fee.academicYear) {
        fieldChanges.push({
          field: "Academic year",
          from: fee.academicYear || "-",
          to: academicYear,
        });
      }
      if (status !== fee.status) {
        fieldChanges.push({ field: "Status", from: fee.status, to: status });
      }

      if (fieldChanges.length === 0) {
        unchanged += 1;
        continue;
      }

      changes.push({
        rowNumber: row.rowNumber,
        feeId: fee.id,
        studentId: fee.student.studentId,
        studentName: `${fee.student.name} ${fee.student.surname}`,
        feeTitle: fee.title,
        changes: fieldChanges,
      });

      updates.push({
        feeId: fee.id,
        data: { title, amount, paidAmount, term, academicYear, status },
      });
    }

    if (!apply) {
      return {
        success: true,
        message:
          changes.length > 0
            ? `${changes.length} fee record(s) will change.`
            : "Nothing to update — the file matches what is already stored.",
        summary: { changes, unchanged, errors, applied: 0, previewOnly: true },
      };
    }

    //* Chunked so a large file does not hold one transaction open for minutes.
    const CHUNK_SIZE = 100;
    for (let index = 0; index < updates.length; index += CHUNK_SIZE) {
      const chunk = updates.slice(index, index + CHUNK_SIZE);
      await prisma.$transaction(
        chunk.map((update) =>
          prisma.fee.update({ where: { id: update.feeId }, data: update.data })
        )
      );
    }

    revalidatePath("/dashboard/fees");

    const actorName = actor.username || actor.name || "staff";
    await writeServerAuditLog({
      action: "fee.import_edit",
      category: "finance",
      summary: `${actorName} updated ${updates.length} fee record(s) from an imported file`,
      durationMs: Date.now() - startedAt,
      entity: { type: "fee_batch", label: "Fee import" },
      metadata: {
        rowsInFile: rows.length,
        updated: updates.length,
        unchanged,
        rejected: errors.length,
        //* Enough to trace a bad import without writing the whole sheet.
        updatedFeeIds: updates.slice(0, 100).map((update) => update.feeId),
        editedByRole: actor.role,
      },
    });

    return {
      success: true,
      message:
        updates.length > 0
          ? `Updated ${updates.length} fee record(s).`
          : "No fee records needed updating.",
      summary: { changes, unchanged, errors, applied: updates.length, previewOnly: false },
    };
  } catch (err) {
    if (isAuthorizationError(err)) {
      return { success: false, message: err.message };
    }
    console.error("importFeeEdits error:", err);
    return {
      success: false,
      message: apply
        ? "Failed to apply the fee import."
        : "Failed to read the fee import.",
    };
  }
}
