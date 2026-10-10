import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/auth";
import { formatCedis, formatSalaryMonth } from "@/lib/payslip";
import { listTeacherPayslips } from "@/lib/payslip-server";

export default async function MyPayslipsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "teacher") {
    redirect("/dashboard");
  }

  const payslips = await listTeacherPayslips(session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">My Payslips</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your monthly payslips from the school. Open one to print it or save it as a PDF.
        </p>
      </div>

      {payslips.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
          <FileText className="mx-auto h-8 w-8" />
          <p className="mt-3 text-sm">No payslips yet. They will appear here once the school publishes them.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {payslips.map((payslip) => (
            <div key={payslip.id} className="flex flex-col justify-between gap-4 rounded-2xl border bg-card p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {formatSalaryMonth(payslip.salaryMonth)}
                </p>
                <p className="mt-1 text-2xl font-black">{formatCedis(payslip.netSalary)}</p>
                <p className="text-xs text-muted-foreground">Net salary</p>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Total gross</dt>
                    <dd className="font-semibold">{formatCedis(payslip.totalGross)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Deductions</dt>
                    <dd className="font-semibold">{formatCedis(payslip.totalDeductions)}</dd>
                  </div>
                </dl>
              </div>
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link href={`/dashboard/my-payslips/${payslip.id}`}>
                  <Printer className="h-4 w-4" /> View and print
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
