"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { FinanceEntryType, PaymentMethod } from "@prisma/client";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required.");
  }
  return session;
}

export type FinanceEntryInput = {
  type: FinanceEntryType;
  category: string;
  amount: number;
  description: string;
  paymentMethod?: PaymentMethod;
  entryDate?: Date;
};

export async function createFinanceEntry(input: FinanceEntryInput) {
  const session = await requireAdmin();
  const recorderName = session.user.name ?? session.user.username ?? "Admin";

  if (!input.category.trim()) throw new Error("Category is required.");
  if (!input.description.trim()) throw new Error("Description is required.");
  if (input.amount <= 0) throw new Error("Amount must be greater than zero.");

  const entry = await prisma.financeEntry.create({
    data: {
      type: input.type,
      category: input.category.trim(),
      amount: input.amount,
      description: input.description.trim(),
      paymentMethod: input.paymentMethod ?? "CASH",
      entryDate: input.entryDate ?? new Date(),
      recordedById: session.user.id,
      recordedByName: recorderName,
    },
  });

  revalidatePath("/dashboard/finance");
  return { success: true, entry };
}

export async function updateFinanceEntry(id: number, input: FinanceEntryInput) {
  await requireAdmin();

  if (!input.category.trim()) throw new Error("Category is required.");
  if (!input.description.trim()) throw new Error("Description is required.");
  if (input.amount <= 0) throw new Error("Amount must be greater than zero.");

  const entry = await prisma.financeEntry.update({
    where: { id },
    data: {
      type: input.type,
      category: input.category.trim(),
      amount: input.amount,
      description: input.description.trim(),
      paymentMethod: input.paymentMethod ?? "CASH",
      entryDate: input.entryDate ?? new Date(),
    },
  });

  revalidatePath("/dashboard/finance");
  return { success: true, entry };
}

export async function deleteFinanceEntry(id: number) {
  await requireAdmin();

  await prisma.financeEntry.delete({ where: { id } });
  revalidatePath("/dashboard/finance");
  return { success: true };
}
