import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import StudentReportCardList from "@/components/StudentReportCardList";
import { getSystemSettings } from "@/lib/settings";
import { redirect } from "next/navigation";

export default async function StudentReportCardsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userRole = session.user.role;
  const username = session.user.username;

  if (userRole !== "student" || !username) {
    redirect("/dashboard");
  }

  const student = await prisma.student.findUnique({
    where: { username },
    select: { id: true, name: true, surname: true },
  });

  if (!student) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Report Cards</h1>
        <p className="text-red-500">Student record not found.</p>
      </div>
    );
  }

  const settings = await getSystemSettings();

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Report Cards</h1>
        <p className="text-muted-foreground">
          View and print your official academic report cards.
        </p>
      </div>
      <StudentReportCardList studentId={student.id} schoolStamp={settings.schoolStamp} />
    </div>
  );
}
