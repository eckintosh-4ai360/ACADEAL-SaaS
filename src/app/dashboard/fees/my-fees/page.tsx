import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import {
  Banknote,
  CheckCircle2,
  Clock,
  FileText,
  Info,
  Printer,
  Wallet,
} from "lucide-react";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getSystemSettings } from "@/lib/settings";
import { normalizeTermValue, formatTermLabel } from "@/lib/termUtils";
import { formatCedis } from "@/lib/cedis";
import type { StudentBillView } from "@/lib/student-bill";
import { listPublishedBillsForStudents } from "@/lib/student-bill-server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

type FeeStatementStudent = {
  id: string;
  studentId: string;
  name: string;
  surname: string;
  grade: { level: number };
  class: { name: string };
  fees: Array<{
    id: number;
    title: string;
    description: string | null;
    amount: number;
    paidAmount: number;
    status: string;
    dueDate: Date;
  }>;
};

type StatementSectionProps = {
  student: FeeStatementStudent;
  //* Published bills for this student only.
  bills: StudentBillView[];
  currentTerm: string;
  currentAcademicYear: string;
  title: string;
  description: string;
};

function formatCurrency(amount: number) {
  return `GHS ${amount.toFixed(2)}`;
}

function getGradeLabel(level: number) {
  return GRADE_NAMES[level] ?? `Grade ${level}`;
}

function FeeStatementSection({
  student,
  bills,
  currentTerm,
  currentAcademicYear,
  title,
  description,
}: StatementSectionProps) {
  const totalFees = student.fees.reduce((sum, fee) => sum + fee.amount, 0);
  const totalPaid = student.fees.reduce((sum, fee) => sum + fee.paidAmount, 0);
  const totalBalance = totalFees - totalPaid;
  const gradeLabel = getGradeLabel(student.grade.level);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight">
          <Banknote className="h-8 w-8 text-blue-600" />
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {student.name} {student.surname} • {gradeLabel} • {student.class.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatTermLabel(currentTerm)} • Academic Year{" "}
          <strong>{currentAcademicYear}</strong>
        </p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="transition-shadow hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Billed</CardTitle>
            <Banknote className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalFees)}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              For {formatTermLabel(currentTerm)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200/50 transition-shadow hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amount Paid</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalPaid)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Received payments
            </p>
          </CardContent>
        </Card>

        <Card
          className={`transition-shadow hover:shadow-lg ${
            totalBalance > 0 ? "border-orange-200/50" : ""
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Due</CardTitle>
            <Wallet
              className={`h-4 w-4 ${
                totalBalance > 0 ? "text-orange-600" : "text-muted-foreground"
              }`}
            />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                totalBalance > 0 ? "text-orange-600" : "text-green-600"
              }`}
            >
              {formatCurrency(totalBalance)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {totalBalance > 0 ? "Outstanding balance" : "Fully paid"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="transition-shadow hover:shadow-lg">
        <CardHeader className="border-b bg-muted/10">
          <CardTitle className="flex items-center text-lg">
            <FileText className="mr-2 h-5 w-5 text-blue-600" />
            Bills
          </CardTitle>
          <CardDescription>
            Term bills from the school. Open one to print it or save it as a PDF.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {bills.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No bills yet. They will appear here once the school publishes them.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {bills.map((bill) => (
                <div key={bill.id} className="flex flex-col justify-between gap-3 rounded-xl border p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {formatTermLabel(bill.term)} · {bill.academicYear}
                    </p>
                    <p className="mt-1 text-2xl font-black">{formatCedis(bill.grandTotal)}</p>
                    <p className="text-xs text-muted-foreground">
                      Grand total{bill.arrears > 0 ? ` (includes ${formatCedis(bill.arrears)} arrears)` : ""} ·{" "}
                      {bill.billNumber}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/fees/my-fees/bills/${bill.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    <Printer className="h-4 w-4" /> View and print
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="transition-shadow hover:shadow-lg">
        <CardHeader className="border-b bg-muted/10">
          <CardTitle className="flex items-center text-lg">
            <Banknote className="mr-2 h-5 w-5 text-blue-600" />
            Detailed Fee Breakdown
          </CardTitle>
          <CardDescription>
            All fee statements and payment status for the current term.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr className="border-b">
                  <th className="px-6 py-4 text-left font-semibold">Fee Description</th>
                  <th className="px-6 py-4 text-left font-semibold">Due Date</th>
                  <th className="px-6 py-4 text-right font-semibold">Amount</th>
                  <th className="px-6 py-4 text-right font-semibold">Paid</th>
                  <th className="px-6 py-4 text-right font-semibold">Balance</th>
                  <th className="px-6 py-4 text-center font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {student.fees.map((fee) => {
                  const balance = Math.max(fee.amount - fee.paidAmount, 0);

                  return (
                    <tr key={fee.id} className="transition-colors hover:bg-muted/10">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-foreground">{fee.title}</p>
                        {fee.description ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {fee.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <Clock className="h-3.5 w-3.5" />
                          {format(new Date(fee.dueDate), "MMM dd, yyyy")}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right font-semibold">
                        {formatCurrency(fee.amount)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right font-semibold text-green-600">
                        {formatCurrency(fee.paidAmount)}
                      </td>
                      <td
                        className={`whitespace-nowrap px-6 py-4 text-right font-bold ${
                          balance > 0 ? "text-orange-600" : "text-green-600"
                        }`}
                      >
                        {formatCurrency(balance)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold tracking-wide ${
                            fee.status === "PAID"
                              ? "bg-green-100 text-green-700"
                              : fee.status === "OVERDUE"
                                ? "bg-red-100 text-red-700"
                                : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {fee.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {student.fees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-16 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Banknote className="h-8 w-8 opacity-20" />
                        <p>
                          No fee records found for {formatTermLabel(currentTerm)},{" "}
                          {currentAcademicYear}.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
        <CardContent className="flex items-start gap-4 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <h4 className="mb-1 font-semibold">Payment Notice</h4>
            <p>
              To make a payment or query the balance, please visit the
              school&apos;s accounts office and collect an official receipt.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

async function getStudentFeeStatement(
  where: { id: string } | { username: string },
  currentTerm: string,
  currentAcademicYear: string
) {
  return prisma.student.findUnique({
    where,
    select: {
      id: true,
      studentId: true,
      name: true,
      surname: true,
      grade: { select: { level: true } },
      class: { select: { name: true } },
      fees: {
        where: {
          term: currentTerm,
          academicYear: currentAcademicYear,
        },
        orderBy: { dueDate: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          amount: true,
          paidAmount: true,
          status: true,
          dueDate: true,
        },
      },
    },
  });
}

export default async function MyFeesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const sessionUser = session.user as SessionUser | undefined;
  const userRole = sessionUser?.role;

  if (userRole !== "student" && userRole !== "parent") {
    redirect("/dashboard");
  }

  const settings = await getSystemSettings();
  const currentTerm = normalizeTermValue(settings.currentTerm);
  const currentAcademicYear = settings.academicYear || "2025/2026";

  if (userRole === "student") {
    const studentWhere = sessionUser?.username
      ? { username: sessionUser.username }
      : sessionUser?.studentDbId || sessionUser?.id
        ? { id: sessionUser.studentDbId || sessionUser.id! }
        : null;

    if (!studentWhere) {
      redirect("/dashboard");
    }

    const student = await getStudentFeeStatement(
      studentWhere,
      currentTerm,
      currentAcademicYear
    );

    if (!student) {
      redirect("/dashboard");
    }

    const bills = await listPublishedBillsForStudents([student.id]);

    return (
      <div className="space-y-6 pb-10">
        <FeeStatementSection
          student={student}
          bills={bills}
          currentTerm={currentTerm}
          currentAcademicYear={currentAcademicYear}
          title="My Fee Statement"
          description="View your current term fee breakdown and payment status."
        />
      </div>
    );
  }

  const username = sessionUser?.username;
  if (!username) {
    redirect("/dashboard");
  }

  const parent = await prisma.parent.findUnique({
    where: { username },
    select: {
      students: {
        orderBy: [{ surname: "asc" }, { name: "asc" }],
        select: {
          id: true,
          studentId: true,
          name: true,
          surname: true,
          grade: { select: { level: true } },
          class: { select: { name: true } },
          fees: {
            where: {
              term: currentTerm,
              academicYear: currentAcademicYear,
            },
            orderBy: { dueDate: "asc" },
            select: {
              id: true,
              title: true,
              description: true,
              amount: true,
              paidAmount: true,
              status: true,
              dueDate: true,
            },
          },
        },
      },
    },
  });

  if (!parent || parent.students.length === 0) {
    return (
      <div className="space-y-6 pb-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight">
            Children&apos;s Fee Statements
          </h1>
          <p className="text-sm text-muted-foreground">
            View only the fee statements linked to your children.
          </p>
        </div>

        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No students are linked to your parent account yet.
          </CardContent>
        </Card>
      </div>
    );
  }

  //* Scoped to this parent's own children, loaded from the session above.
  const bills = await listPublishedBillsForStudents(parent.students.map((student) => student.id));

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Children&apos;s Fee Statements
        </h1>
        <p className="text-sm text-muted-foreground">
          View only the fee statements linked to your children.
        </p>
      </div>

      <Tabs defaultValue={parent.students[0].id} className="w-full">
        <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">
          {parent.students.map((student) => (
            <TabsTrigger key={student.id} value={student.id}>
              {student.name} {student.surname}
            </TabsTrigger>
          ))}
        </TabsList>

        {parent.students.map((student) => (
          <TabsContent key={student.id} value={student.id} className="mt-0">
            <FeeStatementSection
              student={student}
              bills={bills.filter((bill) => bill.studentId === student.id)}
              currentTerm={currentTerm}
              currentAcademicYear={currentAcademicYear}
              title="Child Fee Statement"
              description="This statement is limited to the selected child on your account."
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
