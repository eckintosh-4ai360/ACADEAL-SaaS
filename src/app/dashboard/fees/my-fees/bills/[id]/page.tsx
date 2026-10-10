import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSchoolLetterhead } from "@/lib/school-letterhead-server";
import { getPublishedBillForViewer } from "@/lib/student-bill-server";
import { MyBillViewer } from "../MyBillViewer";

type SessionUser = { role?: string; id?: string; studentDbId?: string; username?: string };

export default async function MyBillPage(props: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  if (!session || (user?.role !== "student" && user?.role !== "parent")) {
    redirect("/dashboard");
  }

  const { id } = await props.params;
  const billId = Number(id);
  if (!Number.isInteger(billId) || billId <= 0) {
    notFound();
  }

  //* Scoped to the signed-in student or the parent's own children: another
  //* family's bill id, or an unpublished bill, is a 404.
  const [bill, school] = await Promise.all([
    getPublishedBillForViewer(
      { role: user?.role, username: user?.username, id: user?.studentDbId || user?.id },
      billId
    ),
    getSchoolLetterhead(),
  ]);
  if (!bill) {
    notFound();
  }

  return <MyBillViewer school={school} bill={bill} />;
}
