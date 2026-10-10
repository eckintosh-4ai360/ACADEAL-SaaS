import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { currentSalaryMonth, emptyPayslipDraft, isSalaryMonth } from "@/lib/payslip";
import { getSchoolLetterhead } from "@/lib/school-letterhead-server";
import {
  isPayslipStorageReady,
  listPayslipStaffOptions,
  resolvePayslipDraft,
} from "@/lib/payslip-server";
import { PayslipEditor } from "../PayslipEditor";

//* ?staffId=…&month=YYYY-MM preselects a staff member and month.
export default async function NewPayslipPage(props: {
  searchParams: Promise<{ staffId?: string | string[]; month?: string | string[] }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const searchParams = await props.searchParams;
  const staffId = typeof searchParams.staffId === "string" ? searchParams.staffId : "";
  const requestedMonth = typeof searchParams.month === "string" ? searchParams.month : "";
  const salaryMonth = isSalaryMonth(requestedMonth) ? requestedMonth : currentSalaryMonth();
  const preparedBy = session.user.name || session.user.username || "";

  const [school, staffOptions, storageReady, resolved] = await Promise.all([
    getSchoolLetterhead(),
    listPayslipStaffOptions(),
    isPayslipStorageReady(),
    staffId ? resolvePayslipDraft({ staffId, salaryMonth, preparedBy }) : null,
  ]);

  if (resolved?.payslipId) {
    redirect(`/dashboard/hr/payslips/${resolved.payslipId}`);
  }

  return (
    <PayslipEditor
      school={school}
      staffOptions={staffOptions}
      today={new Date().toISOString()}
      initial={
        resolved ?? {
          source: null,
          previousMonth: null,
          payslipId: null,
          savedAt: null,
          publishedAt: null,
          draft: emptyPayslipDraft(salaryMonth, preparedBy),
          storageReady,
        }
      }
    />
  );
}
