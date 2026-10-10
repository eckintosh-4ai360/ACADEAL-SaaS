import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { listPayslipSummaries } from "@/lib/payslip-server";
import { PayslipsClientPage } from "./PayslipsClientPage";

export default async function PayslipsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const { storageReady, rows } = await listPayslipSummaries();

  return (
    <PayslipsClientPage
      storageReady={storageReady}
      payslips={rows.map((row) => ({
        ...row,
        publishedAt: row.publishedAt?.toISOString() ?? null,
        updatedAt: row.updatedAt.toISOString(),
      }))}
    />
  );
}
