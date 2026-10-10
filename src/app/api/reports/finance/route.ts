import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { FinanceReport } from "@/lib/operations-report-types";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const generatedAt = new Date();
  const monthStart = new Date(generatedAt.getFullYear(), generatedAt.getMonth(), 1);
  const entries = await prisma.financeEntry.findMany({
    orderBy: [{ entryDate: "desc" }, { id: "desc" }],
  });
  const income = entries.filter((entry) => entry.type === "INCOME");
  const expenses = entries.filter((entry) => entry.type === "EXPENSE");
  const totalIncome = income.reduce((sum, entry) => sum + entry.amount, 0);
  const totalExpenses = expenses.reduce((sum, entry) => sum + entry.amount, 0);
  const incomeThisMonth = income.reduce(
    (sum, entry) => sum + (entry.entryDate >= monthStart ? entry.amount : 0),
    0
  );
  const expensesThisMonth = expenses.reduce(
    (sum, entry) => sum + (entry.entryDate >= monthStart ? entry.amount : 0),
    0
  );

  const report: FinanceReport = {
    generatedAt: generatedAt.toISOString(),
    monthStart: monthStart.toISOString(),
    summary: {
      totalEntries: entries.length,
      incomeEntries: income.length,
      expenseEntries: expenses.length,
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      incomeThisMonth,
      expensesThisMonth,
      netThisMonth: incomeThisMonth - expensesThisMonth,
    },
    entries: entries.map((entry) => ({
      ...entry,
      entryDate: entry.entryDate.toISOString(),
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    })),
  };

  return NextResponse.json(report, { headers: { "Cache-Control": "private, no-store" } });
}
