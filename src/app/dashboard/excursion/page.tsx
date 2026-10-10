import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ExcursionTracker } from "@/components/excursion/ExcursionTracker";

type SearchParams = Promise<{ classId?: string }>;

type SelectedClassData = {
  id: number;
  name: string;
  gradeLevel: number;
  supervisorName: string | null;
};

type ExcursionCampaignData = {
  id: number;
  title: string;
  targetAmount: number;
};

type ExcursionStudentRow = {
  id: string;
  name: string;
  surname: string;
  studentId: string;
  paidAmount: number;
  paymentCount: number;
  lastPaymentAt: string | null;
};

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">{message}</p>
        <Link href="/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default async function ExcursionPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "student" || session.user.role === "parent") {
    redirect("/dashboard");
  }

  const params = await searchParams;

  const isTeacher = session.user.role === "teacher";
  const isAdmin = session.user.role === "admin";

  const classSelect = {
    id: true,
    name: true,
    grade: {
      select: {
        level: true,
      },
    },
    supervisor: {
      select: {
        name: true,
        surname: true,
      },
    },
    students: {
      select: {
        id: true,
        name: true,
        surname: true,
        studentId: true,
      },
      orderBy: [
        {
          surname: "asc" as const,
        },
        {
          name: "asc" as const,
        },
      ],
    },
  };

  let classes: Array<{ id: number; name: string }> = [];
  let selectedClassId: number | null = null;
  let selectedClass: SelectedClassData | null = null;
  let campaign: ExcursionCampaignData | null = null;
  let students: ExcursionStudentRow[] = [];

  if (isTeacher) {
    const supervisedClass = await prisma.class.findFirst({
      where: { supervisorId: session.user.id },
      select: classSelect,
    });

    if (!supervisedClass) {
      return (
        <EmptyState
          title="No supervised class found"
          message="Excursion tracking is only available for the class you supervise. Ask an admin to assign you as the class supervisor first."
        />
      );
    }

    selectedClassId = supervisedClass.id;
    selectedClass = {
      id: supervisedClass.id,
      name: supervisedClass.name,
      gradeLevel: supervisedClass.grade.level,
      supervisorName: supervisedClass.supervisor
        ? `${supervisedClass.supervisor.name} ${supervisedClass.supervisor.surname}`
        : null,
    };

    classes = [{ id: supervisedClass.id, name: supervisedClass.name }];
  } else if (isAdmin) {
    classes = await prisma.class.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    if (classes.length === 0) {
      return (
        <EmptyState
          title="No classes available"
          message="Create a class before setting up excursion tracking."
        />
      );
    }

    const requestedClassId = params.classId ? Number.parseInt(params.classId, 10) : NaN;
    const fallbackClassId = classes[0].id;
    selectedClassId =
      Number.isFinite(requestedClassId) && classes.some((item) => item.id === requestedClassId)
        ? requestedClassId
        : fallbackClassId;

    const selectedClassRecord = await prisma.class.findUnique({
      where: { id: selectedClassId },
      select: classSelect,
    });

    if (!selectedClassRecord) {
      return (
        <EmptyState
          title="Class not found"
          message="The selected class could not be loaded. Try switching to another class."
        />
      );
    }

    selectedClass = {
      id: selectedClassRecord.id,
      name: selectedClassRecord.name,
      gradeLevel: selectedClassRecord.grade.level,
      supervisorName: selectedClassRecord.supervisor
        ? `${selectedClassRecord.supervisor.name} ${selectedClassRecord.supervisor.surname}`
        : null,
    };
  }

  if (!selectedClassId || !selectedClass) {
    return (
      <EmptyState
        title="Excursion tracking unavailable"
        message="No class could be selected for excursion tracking."
      />
    );
  }

  const [selectedClassRecord, currentCampaign] = await Promise.all([
    prisma.class.findUnique({
      where: { id: selectedClassId },
      select: classSelect,
    }),
    prisma.excursionCampaign.findFirst({
      where: { classId: selectedClassId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        targetAmount: true,
        payments: {
          select: {
            studentId: true,
            amount: true,
            paidAt: true,
          },
          orderBy: {
            paidAt: "asc",
          },
        },
      },
    }),
  ]);

  if (!selectedClassRecord) {
    return (
      <EmptyState
        title="Class not found"
        message="The selected class could not be loaded. Try selecting another class."
      />
    );
  }

  selectedClass = {
    id: selectedClassRecord.id,
    name: selectedClassRecord.name,
    gradeLevel: selectedClassRecord.grade.level,
    supervisorName: selectedClassRecord.supervisor
      ? `${selectedClassRecord.supervisor.name} ${selectedClassRecord.supervisor.surname}`
      : null,
  };

  campaign = currentCampaign
    ? {
        id: currentCampaign.id,
        title: currentCampaign.title,
        targetAmount: currentCampaign.targetAmount,
      }
    : null;

  const paymentSummaryByStudent = new Map<
    string,
    { paidAmount: number; paymentCount: number; lastPaymentAt: string | null }
  >();

  currentCampaign?.payments.forEach((payment) => {
    const summary =
      paymentSummaryByStudent.get(payment.studentId) ??
      {
        paidAmount: 0,
        paymentCount: 0,
        lastPaymentAt: null,
      };

    summary.paidAmount += payment.amount;
    summary.paymentCount += 1;
    summary.lastPaymentAt = payment.paidAt.toISOString();
    paymentSummaryByStudent.set(payment.studentId, summary);
  });

  students = selectedClassRecord.students.map((student) => {
    const summary = paymentSummaryByStudent.get(student.id);

    return {
      id: student.id,
      name: student.name,
      surname: student.surname,
      studentId: student.studentId,
      paidAmount: summary?.paidAmount ?? 0,
      paymentCount: summary?.paymentCount ?? 0,
      lastPaymentAt: summary?.lastPaymentAt ?? null,
    };
  });

  return (
    <ExcursionTracker
      key={selectedClass.id}
      isAdmin={isAdmin}
      classes={classes}
      selectedClass={selectedClass}
      campaign={campaign}
      students={students}
    />
  );
}
