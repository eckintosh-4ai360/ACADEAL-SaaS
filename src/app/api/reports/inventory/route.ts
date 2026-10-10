import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { InventoryReport } from "@/lib/operations-report-types";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const generatedAt = new Date();
  const monthStart = new Date(generatedAt.getFullYear(), generatedAt.getMonth(), 1);
  const [items, sales] = await Promise.all([
    prisma.inventoryItem.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.inventorySale.findMany({ orderBy: [{ soldAt: "desc" }, { id: "desc" }] }),
  ]);

  const report: InventoryReport = {
    generatedAt: generatedAt.toISOString(),
    monthStart: monthStart.toISOString(),
    summary: {
      totalItems: items.length,
      activeItems: items.filter((item) => item.isActive).length,
      lowStockItems: items.filter(
        (item) => item.isActive && item.quantityOnHand <= item.lowStockThreshold
      ).length,
      stockValue: items.reduce((sum, item) => sum + item.unitPrice * item.quantityOnHand, 0),
      totalSales: sales.length,
      salesAmount: sales.reduce((sum, sale) => sum + sale.totalAmount, 0),
      salesThisMonth: sales.reduce(
        (sum, sale) => sum + (sale.soldAt >= monthStart ? sale.totalAmount : 0),
        0
      ),
    },
    items: items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
    sales: sales.map((sale) => ({
      ...sale,
      soldAt: sale.soldAt.toISOString(),
      createdAt: sale.createdAt.toISOString(),
    })),
  };

  return NextResponse.json(report, { headers: { "Cache-Control": "private, no-store" } });
}
