"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { InventoryBuyerType, PaymentMethod } from "@prisma/client";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required.");
  }
  return session;
}

// ─────────────────────────────────────────────────────────────────────────────
// ITEM ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export type InventoryItemInput = {
  name: string;
  category: string;
  unit?: string;
  unitPrice: number;
  quantityOnHand?: number;
  lowStockThreshold?: number;
  notes?: string;
};

export async function createInventoryItem(input: InventoryItemInput) {
  await requireAdmin();

  if (!input.name.trim()) throw new Error("Item name is required.");
  if (!input.category.trim()) throw new Error("Category is required.");
  if (input.unitPrice < 0) throw new Error("Unit price cannot be negative.");

  const item = await prisma.inventoryItem.create({
    data: {
      name: input.name.trim(),
      category: input.category.trim(),
      unit: input.unit?.trim() || "pcs",
      unitPrice: input.unitPrice,
      quantityOnHand: input.quantityOnHand ?? 0,
      lowStockThreshold: input.lowStockThreshold ?? 5,
      notes: input.notes?.trim() || null,
    },
  });

  revalidatePath("/dashboard/inventory");
  return { success: true, item };
}

export async function updateInventoryItem(id: number, input: InventoryItemInput) {
  await requireAdmin();

  if (!input.name.trim()) throw new Error("Item name is required.");
  if (!input.category.trim()) throw new Error("Category is required.");
  if (input.unitPrice < 0) throw new Error("Unit price cannot be negative.");
  if (input.quantityOnHand !== undefined && input.quantityOnHand < 0) {
    throw new Error("Quantity on hand cannot be negative.");
  }

  const item = await prisma.inventoryItem.update({
    where: { id },
    data: {
      name: input.name.trim(),
      category: input.category.trim(),
      unit: input.unit?.trim() || "pcs",
      unitPrice: input.unitPrice,
      ...(input.quantityOnHand !== undefined ? { quantityOnHand: input.quantityOnHand } : {}),
      lowStockThreshold: input.lowStockThreshold ?? 5,
      notes: input.notes?.trim() || null,
    },
  });

  revalidatePath("/dashboard/inventory");
  return { success: true, item };
}

export async function toggleInventoryItemActive(id: number, isActive: boolean) {
  await requireAdmin();

  await prisma.inventoryItem.update({ where: { id }, data: { isActive } });
  revalidatePath("/dashboard/inventory");
  return { success: true };
}

export async function deleteInventoryItem(id: number) {
  await requireAdmin();

  const saleCount = await prisma.inventorySale.count({ where: { itemId: id } });
  if (saleCount > 0) {
    throw new Error(
      "This item has sales history and cannot be deleted. Deactivate it instead."
    );
  }

  await prisma.inventoryItem.delete({ where: { id } });
  revalidatePath("/dashboard/inventory");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// SALE ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export type RecordInventorySaleInput = {
  itemId: number;
  quantity: number;
  buyerType: InventoryBuyerType;
  buyerName?: string;
  buyerRefId?: string;
  paymentMethod?: PaymentMethod;
  note?: string;
};

export async function recordInventorySale(input: RecordInventorySaleInput) {
  const session = await requireAdmin();
  const recorderName = session.user.name ?? session.user.username ?? "Admin";

  if (input.quantity <= 0) throw new Error("Quantity must be greater than zero.");

  const sale = await prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({ where: { id: input.itemId } });
    if (!item) throw new Error("Item not found.");
    if (!item.isActive) throw new Error("This item is inactive and cannot be sold.");
    if (item.quantityOnHand < input.quantity) {
      throw new Error(
        `Insufficient stock: only ${item.quantityOnHand} ${item.unit} of "${item.name}" remaining.`
      );
    }

    const totalAmount = item.unitPrice * input.quantity;

    const createdSale = await tx.inventorySale.create({
      data: {
        itemId: item.id,
        itemName: item.name,
        quantity: input.quantity,
        unitPrice: item.unitPrice,
        totalAmount,
        buyerType: input.buyerType,
        buyerName: input.buyerName?.trim() || null,
        buyerRefId: input.buyerRefId || null,
        paymentMethod: input.paymentMethod ?? "CASH",
        note: input.note?.trim() || null,
        recordedById: session.user.id,
        recordedByName: recorderName,
      },
    });

    await tx.inventoryItem.update({
      where: { id: item.id },
      data: { quantityOnHand: { decrement: input.quantity } },
    });

    return createdSale;
  });

  revalidatePath("/dashboard/inventory");
  return { success: true, sale };
}

export async function deleteInventorySale(id: number) {
  await requireAdmin();

  await prisma.$transaction(async (tx) => {
    const sale = await tx.inventorySale.findUnique({ where: { id } });
    if (!sale) throw new Error("Sale record not found.");

    await tx.inventoryItem.update({
      where: { id: sale.itemId },
      data: { quantityOnHand: { increment: sale.quantity } },
    });

    await tx.inventorySale.delete({ where: { id } });
  });

  revalidatePath("/dashboard/inventory");
  return { success: true };
}
