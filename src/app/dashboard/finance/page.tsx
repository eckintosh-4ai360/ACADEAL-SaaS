import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FinanceClientPage } from "./FinanceClientPage";

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; page?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1"));
  const pageSize = 15;

  const typeFilter =
    params.type === "INCOME" || params.type === "EXPENSE"
      ? (params.type as "INCOME" | "EXPENSE")
      : undefined;

  const where = typeFilter ? { type: typeFilter } : {};

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [entries, total, incomeAgg, expenseAgg, incomeThisMonth, expenseThisMonth] =
    await Promise.all([
      prisma.financeEntry.findMany({
        where,
        orderBy: { entryDate: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.financeEntry.count({ where }),
      prisma.financeEntry.aggregate({
        where: { type: "INCOME" },
        _sum: { amount: true },
      }),
      prisma.financeEntry.aggregate({
        where: { type: "EXPENSE" },
        _sum: { amount: true },
      }),
      prisma.financeEntry.aggregate({
        where: { type: "INCOME", entryDate: { gte: monthStart } },
        _sum: { amount: true },
      }),
      prisma.financeEntry.aggregate({
        where: { type: "EXPENSE", entryDate: { gte: monthStart } },
        _sum: { amount: true },
      }),
    ]);

  return (
    <FinanceClientPage
      entries={entries.map((e) => ({
        ...e,
        entryDate: e.entryDate.toISOString(),
        createdAt: e.createdAt.toISOString(),
      }))}
      total={total}
      page={page}
      pageSize={pageSize}
      totalIncome={incomeAgg._sum.amount ?? 0}
      totalExpense={expenseAgg._sum.amount ?? 0}
      incomeThisMonth={incomeThisMonth._sum.amount ?? 0}
      expenseThisMonth={expenseThisMonth._sum.amount ?? 0}
      activeType={typeFilter}
    />
  );
}
