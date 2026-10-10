import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { userHasFeePermission } from "@/lib/user-permissions-server";

type SessionUser = {
  role?: string;
};

function parseDateRange(dateValue: string, endOfDay = false) {
  const parsedDate = new Date(
    `${dateValue}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`
  );

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const sessionUser = session.user as SessionUser | undefined;

  if (
    sessionUser?.role !== "admin" &&
    !(sessionUser?.role === "teacher" && (await userHasFeePermission("statement")))
  ) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const fromDate = req.nextUrl.searchParams.get("from")?.trim() || "";
  const toDate = req.nextUrl.searchParams.get("to")?.trim() || fromDate;

  if (!fromDate) {
    return NextResponse.json(
      { error: "A start date is required." },
      { status: 400 }
    );
  }

  const rangeStart = parseDateRange(fromDate);
  const rangeEnd = parseDateRange(toDate, true);

  if (!rangeStart || !rangeEnd) {
    return NextResponse.json(
      { error: "Enter a valid date range." },
      { status: 400 }
    );
  }

  if (rangeStart > rangeEnd) {
    return NextResponse.json(
      { error: "The start date cannot be after the end date." },
      { status: 400 }
    );
  }

  const payments = await prisma.feePayment.findMany({
    where: {
      paidAt: {
        gte: rangeStart,
        lte: rangeEnd,
      },
    },
    include: {
      fee: {
        select: {
          title: true,
        },
      },
      student: {
        select: {
          studentId: true,
          name: true,
          surname: true,
          grade: {
            select: {
              level: true,
            },
          },
          class: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      paidAt: "desc",
    },
  });

  const totalCollected = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalsByMethodMap = new Map<
    string,
    {
      method: string;
      amount: number;
      count: number;
    }
  >();

  for (const payment of payments) {
    const summary = totalsByMethodMap.get(payment.paymentMethod) ?? {
      method: payment.paymentMethod,
      amount: 0,
      count: 0,
    };

    summary.amount += payment.amount;
    summary.count += 1;
    totalsByMethodMap.set(payment.paymentMethod, summary);
  }

  return NextResponse.json({
    fromDate,
    toDate,
    totalCollected,
    totalRecords: payments.length,
    totalsByMethod: Array.from(totalsByMethodMap.values()).sort((a, b) =>
      a.method.localeCompare(b.method)
    ),
    payments: payments.map((payment) => ({
      id: payment.id,
      receiptNumber: payment.receiptNumber,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      term: payment.term,
      academicYear: payment.academicYear,
      recordedBy: payment.recordedBy,
      notes: payment.notes,
      paidAt: payment.paidAt.toISOString(),
      feeTitle: payment.fee?.title ?? "Fee payment",
      student: {
        studentId: payment.student.studentId,
        name: payment.student.name,
        surname: payment.student.surname,
        level: payment.student.grade.level,
        className: payment.student.class.name,
      },
    })),
  });
}
