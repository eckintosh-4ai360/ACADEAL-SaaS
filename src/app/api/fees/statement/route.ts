import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { userHasFeePermission } from "@/lib/user-permissions-server";

const GRADE_NAMES: Record<number, string> = {
  1: "CRECHE",
  2: "NURSERY 1",
  3: "NURSERY 2",
  4: "KG 1",
  5: "KG 2",
  6: "BASIC 1",
  7: "BASIC 2",
  8: "BASIC 3",
  9: "BASIC 4",
  10: "BASIC 5",
  11: "BASIC 6",
  12: "JHS 1",
  13: "JHS 2",
  14: "JHS 3",
};

type SessionUser = {
  role?: string;
  id?: string;
  studentDbId?: string;
  username?: string;
};

const studentStatementSelect = {
  id: true,
  studentId: true,
  name: true,
  surname: true,
  grade: { select: { level: true } },
  class: { select: { name: true } },
  fees: {
    orderBy: { createdAt: "desc" as const },
    include: {
      payments: {
        orderBy: { paidAt: "desc" as const },
        select: {
          id: true,
          amount: true,
          paymentMethod: true,
          receiptNumber: true,
          paidAt: true,
          notes: true,
        },
      },
    },
  },
};

function buildStudentSearch(q: string) {
  return [
    { studentId: { equals: q, mode: "insensitive" as const } },
    { name: { contains: q, mode: "insensitive" as const } },
    { surname: { contains: q, mode: "insensitive" as const } },
  ];
}

function serializeStatement(student: {
  studentId: string;
  name: string;
  surname: string;
  grade: { level: number };
  class: { name: string };
  fees: Array<{
    id: number;
    title: string;
    amount: number;
    paidAmount: number;
    status: string;
    term: string;
    academicYear: string;
    dueDate: Date;
    payments: Array<{
      id: number;
      amount: number;
      paymentMethod: string;
      receiptNumber: string;
      paidAt: Date;
      notes: string | null;
    }>;
  }>;
}) {
  const totalBilled = student.fees.reduce((sum, fee) => sum + fee.amount, 0);
  const totalPaid = student.fees.reduce((sum, fee) => sum + fee.paidAmount, 0);

  return {
    studentId: student.studentId,
    name: student.name,
    surname: student.surname,
    level: GRADE_NAMES[student.grade.level] ?? `Grade ${student.grade.level}`,
    className: student.class.name,
    fees: student.fees.map((fee) => ({
      id: fee.id,
      title: fee.title,
      amount: fee.amount,
      paidAmount: fee.paidAmount,
      status: fee.status,
      term: fee.term,
      academicYear: fee.academicYear,
      dueDate: fee.dueDate.toISOString(),
      payments: fee.payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        receiptNumber: payment.receiptNumber,
        paidAt: payment.paidAt.toISOString(),
        notes: payment.notes,
      })),
    })),
    totalBilled,
    totalPaid,
    totalBalance: totalBilled - totalPaid,
  };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const sessionUser = session.user as SessionUser | undefined;
  const role = sessionUser?.role;
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";

  if (!role) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (role === "teacher") {
    if (!(await userHasFeePermission("statement"))) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (!q) {
      return NextResponse.json(
        { error: "Query is required." },
        { status: 400 }
      );
    }

    const student = await prisma.student.findFirst({
      where: { OR: buildStudentSearch(q) },
      select: studentStatementSelect,
    });

    if (!student) {
      return NextResponse.json(
        { error: "No student found matching that ID or name." },
        { status: 404 }
      );
    }

    return NextResponse.json(serializeStatement(student));
  }

  if (role === "admin") {
    if (!q) {
      return NextResponse.json(
        { error: "Query is required." },
        { status: 400 }
      );
    }

    const student = await prisma.student.findFirst({
      where: { OR: buildStudentSearch(q) },
      select: studentStatementSelect,
    });

    if (!student) {
      return NextResponse.json(
        { error: "No student found matching that ID or name." },
        { status: 404 }
      );
    }

    return NextResponse.json(serializeStatement(student));
  }

  if (role === "student") {
    const studentWhere = sessionUser?.username
      ? { username: sessionUser.username }
      : sessionUser?.studentDbId || sessionUser?.id
        ? { id: sessionUser.studentDbId || sessionUser.id! }
        : null;

    if (!studentWhere) {
      return NextResponse.json(
        { error: "Student account is not linked." },
        { status: 404 }
      );
    }

    const student = await prisma.student.findUnique({
      where: studentWhere,
      select: studentStatementSelect,
    });

    if (!student) {
      return NextResponse.json(
        { error: "Student record not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(serializeStatement(student));
  }

  if (role === "parent") {
    if (!q) {
      return NextResponse.json(
        { error: "Query is required." },
        { status: 400 }
      );
    }

    const username = sessionUser?.username;
    if (!username) {
      return NextResponse.json(
        { error: "Parent account is not linked." },
        { status: 404 }
      );
    }

    const parent = await prisma.parent.findUnique({
      where: { username },
      select: {
        students: {
          select: { id: true },
        },
      },
    });

    const studentIds = parent?.students.map((student) => student.id) ?? [];

    if (studentIds.length === 0) {
      return NextResponse.json(
        { error: "No students are linked to this parent account." },
        { status: 404 }
      );
    }

    const student = await prisma.student.findFirst({
      where: {
        id: { in: studentIds },
        OR: buildStudentSearch(q),
      },
      select: studentStatementSelect,
    });

    if (!student) {
      return NextResponse.json(
        { error: "No linked student found matching that ID or name." },
        { status: 404 }
      );
    }

    return NextResponse.json(serializeStatement(student));
  }

  return NextResponse.json({ error: "Forbidden." }, { status: 403 });
}
