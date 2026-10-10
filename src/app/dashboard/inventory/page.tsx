import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { InventoryClientPage } from "./InventoryClientPage";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ salesPage?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const salesPage = Math.max(1, parseInt(params.salesPage ?? "1"));
  const salesPageSize = 15;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [items, sales, salesTotal, salesThisMonthAgg] = await Promise.all([
    prisma.inventoryItem.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    prisma.inventorySale.findMany({
      orderBy: { soldAt: "desc" },
      skip: (salesPage - 1) * salesPageSize,
      take: salesPageSize,
    }),
    prisma.inventorySale.count(),
    prisma.inventorySale.aggregate({
      where: { soldAt: { gte: monthStart } },
      _sum: { totalAmount: true },
    }),
  ]);

  const lowStockCount = items.filter(
    (i) => i.isActive && i.quantityOnHand <= i.lowStockThreshold
  ).length;
  const stockValue = items.reduce((sum, i) => sum + i.unitPrice * i.quantityOnHand, 0);

  return (
    <InventoryClientPage
      items={items.map((i) => ({ ...i, createdAt: i.createdAt.toISOString(), updatedAt: i.updatedAt.toISOString() }))}
      sales={sales.map((s) => ({ ...s, soldAt: s.soldAt.toISOString(), createdAt: s.createdAt.toISOString() }))}
      salesTotal={salesTotal}
      salesPage={salesPage}
      salesPageSize={salesPageSize}
      salesThisMonth={salesThisMonthAgg._sum.totalAmount ?? 0}
      lowStockCount={lowStockCount}
      stockValue={stockValue}
    />
  );
}
