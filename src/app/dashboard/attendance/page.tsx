import prisma from "@/lib/prisma";
import { AttendanceClient } from "@/components/AttendanceClient";
import { format } from "date-fns";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, XCircle } from "lucide-react";
import { DashboardMetricCard } from "@/components/DashboardMetricCard";
import { sortClassesByGrade } from "@/lib/class-management";

export default async function AttendancePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "student") {
    const student = await prisma.student.findUnique({
      where: { id: session.user.id },
      include: {
        class: true,
        grade: true,
        attendances: {
          include: {
            lesson: {
              select: {
                name: true,
                subject: {
                  select: { name: true },
                },
              },
            },
          },
          orderBy: { date: "desc" },
        },
      },
    });

    if (!student) {
      return (
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">My Attendance</h1>
          <p className="text-muted-foreground">Student profile was not found.</p>
        </div>
      );
    }

    const totalRecords = student.attendances.length;
    const presentCount = student.attendances.filter((record) => record.present).length;
    const absentCount = totalRecords - presentCount;
    const attendanceRate = totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Attendance</h1>
          <p className="text-muted-foreground mt-1">
            {student.class.name} - Grade {student.grade.level}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <DashboardMetricCard
            title="Attendance Rate"
            value={`${attendanceRate.toFixed(1)}%`}
            description="Presence across all attendance records currently stored."
            icon={Activity}
            tone="sky"
            badge="Overview"
            detail={`${totalRecords} records`}
          />
          <DashboardMetricCard
            title="Present Days"
            value={presentCount.toString()}
            description="Sessions where you were marked present in class."
            icon={CheckCircle2}
            tone="emerald"
            badge="Present"
            detail="Recorded attendance"
          />
          <DashboardMetricCard
            title="Absent Days"
            value={absentCount.toString()}
            description="Sessions currently marked absent in the attendance log."
            icon={XCircle}
            tone="rose"
            badge="Absent"
            detail="Needs review"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Attendance Records</CardTitle>
          </CardHeader>
          <CardContent>
            {student.attendances.length === 0 ? (
              <p className="text-muted-foreground">No attendance records yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Subject</th>
                      <th className="text-left p-3 font-medium">Lesson</th>
                      <th className="text-left p-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {student.attendances.map((record) => (
                      <tr key={record.id} className="border-b">
                        <td className="p-3 text-sm">{format(new Date(record.date), "MMM dd, yyyy")}</td>
                        <td className="p-3 text-sm">{record.lesson.subject.name}</td>
                        <td className="p-3 text-sm">{record.lesson.name}</td>
                        <td className="p-3">
                          <Badge variant={record.present ? "outline" : "destructive"}>
                            {record.present ? "Present" : "Absent"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (session.user.role === "parent") {
    redirect("/dashboard");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);

  const whereClause: Prisma.ClassWhereInput = {};

  if (session.user.role === "teacher") {
    whereClause.OR = [
      { supervisorId: session.user.id },
      { lessons: { some: { teacherId: session.user.id } } },
    ];
  }

  const classes = await prisma.class.findMany({
    where: whereClause,
    include: {
      students: {
        include: {
          grade: true,
          fees: {
            where: {
              title: { contains: "auxiliary", mode: "insensitive" },
              //* Only look at today's auxiliary fee — fees are date-specific (Mon–Fri)
              dueDate: {
                gte: today,
                lte: endOfToday,
              },
            },
            select: {
              id: true,
              status: true,
              dueDate: true,
              amount: true,
            },
            take: 1, // Only 1 fee should exist per student per day
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });
  const grades = await prisma.grade.findMany({
    select: { id: true, level: true },
    orderBy: { level: "asc" },
  });
  const sortedClasses = sortClassesByGrade(classes, grades);

  //* Format classes for client component
  const formattedClasses = sortedClasses.map((cls) => {
    const todayAuxiliaryFee = cls.students.find((student) => student.fees[0])?.fees[0] || null;

    return {
      id: cls.id,
      name: cls.name,
      dailyAuxiliaryFeeAmount: todayAuxiliaryFee?.amount ?? null,
      students: cls.students.map((student) => {
        //* Find today's auxiliary fee (if any)
        const todayFee = student.fees[0] || null;

        //* N/A means: no fee generated today OR it's already been paid (nothing to do)
        //* PENDING means: fee exists and awaits payment today
      let status: "PAID" | "PENDING" | "OVERDUE" | "N/A";
      if (!todayFee) {
        status = "N/A"; // Fee not generated yet for today
      } else if (todayFee.status === "PAID") {
        status = "PAID"; // Already paid today
      } else {
        status = todayFee.status as "PENDING" | "OVERDUE";
      }

        return {
          id: student.id,
          name: student.name,
          surname: student.surname,
          othername: student.img,
          grade: student.grade,
          auxiliaryFeeStatus: status,
        };
      }),
    };
  });

  return (
    <AttendanceClient
      classes={formattedClasses}
    />
  );
}
