import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import StudentReportCardList from "@/components/StudentReportCardList";
import { getSystemSettings } from "@/lib/settings";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function ParentReportCardsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userRole = session.user.role;
  const username = session.user.username;

  if (userRole !== "parent" || !username) {
    redirect("/dashboard");
  }

  const parent = await prisma.parent.findUnique({
    where: { username },
    select: {
      id: true,
      students: {
        select: {
          id: true,
          name: true,
          surname: true,
          class: { select: { name: true } },
        },
      },
    },
  });

  if (!parent || parent.students.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Report Cards</h1>
        <p className="text-gray-500 text-center py-12 border rounded-lg">No students linked to your account.</p>
      </div>
    );
  }

  const settings = await getSystemSettings();

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Student Report Cards</h1>
        <p className="text-muted-foreground">
          View official academic report cards for your children.
        </p>
      </div>

      <Tabs defaultValue={parent.students[0].id} className="w-full">
        <TabsList className="mb-4">
          {parent.students.map((student) => (
            <TabsTrigger key={student.id} value={student.id}>
              {student.name} {student.surname}
            </TabsTrigger>
          ))}
        </TabsList>
        {parent.students.map((student) => (
          <TabsContent key={student.id} value={student.id} className="mt-0">
            <StudentReportCardList studentId={student.id} schoolStamp={settings.schoolStamp} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
