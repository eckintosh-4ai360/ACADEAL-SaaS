import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSchoolLetterhead } from "@/lib/school-letterhead-server";
import {
  getPayslipRecord,
  listPayslipStaffOptions,
  payslipToDraft,
} from "@/lib/payslip-server";
import { PayslipEditor } from "../PayslipEditor";

export default async function PayslipPage(props: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const { id } = await props.params;
  const payslipId = Number(id);
  if (!Number.isInteger(payslipId) || payslipId <= 0) {
    notFound();
  }

  const [payslip, school, staffOptions] = await Promise.all([
    getPayslipRecord(payslipId),
    getSchoolLetterhead(),
    listPayslipStaffOptions(),
  ]);
  if (!payslip) {
    notFound();
  }

  const savedAt = payslip.updatedAt.toISOString();

  return (
    <PayslipEditor
      school={school}
      staffOptions={staffOptions}
      today={new Date().toISOString()}
      initial={{
        source: "existing",
        previousMonth: null,
        payslipId: payslip.id,
        savedAt,
        publishedAt: payslip.publishedAt?.toISOString() ?? null,
        draft: payslipToDraft(payslip),
        storageReady: true,
      }}
    />
  );
}
