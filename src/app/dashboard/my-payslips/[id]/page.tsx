import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getTeacherPayslip, payslipToDraft } from "@/lib/payslip-server";
import { getSchoolLetterhead } from "@/lib/school-letterhead-server";
import { MyPayslipViewer } from "../MyPayslipViewer";

export default async function MyPayslipPage(props: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "teacher") {
    redirect("/dashboard");
  }

  const { id } = await props.params;
  const payslipId = Number(id);
  if (!Number.isInteger(payslipId) || payslipId <= 0) {
    notFound();
  }

  //* Scoped to the signed-in teacher: someone else's payslip id is a 404.
  const [payslip, school] = await Promise.all([
    getTeacherPayslip(session.user.id, payslipId),
    getSchoolLetterhead(),
  ]);
  if (!payslip) {
    notFound();
  }

  return (
    <MyPayslipViewer
      school={school}
      draft={payslipToDraft(payslip)}
      issuedAt={payslip.updatedAt.toISOString()}
    />
  );
}
