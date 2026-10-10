import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ScheduleManagerClient } from "@/components/schedule/ScheduleManagerClient";

export const metadata = {
  title: "School Timetable Manager | Acadeal",
  description: "Admin control panel for managing classes, subjects, teachers, and timetables",
};

export default async function SchedulePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");

  // Sequential queries: one at a time, connection released between each.
  // This avoids both connection pool exhaustion (from Promise.all)
  // and long-held transactions (from $transaction) on Neon serverless.
  const classes = await prisma.class.findMany({
    include: {
      grade: true,
      supervisor: true,
      _count: { select: { students: true } },
    },
    orderBy: { name: "asc" },
  });

  const teachers = await prisma.teacher.findMany({
    include: { subjects: true },
    orderBy: { name: "asc" },
  });

  const subjects = await prisma.subject.findMany({
    include: { teachers: { select: { id: true, name: true, surname: true } } },
    orderBy: { name: "asc" },
  });

  const timetables = await prisma.timetable.findMany({
    orderBy: { createdAt: "desc" },
  });

  const grades = await prisma.grade.findMany({
    select: { id: true, level: true },
    orderBy: { level: "asc" },
  });

  const periods = await prisma.timetablePeriod.findMany({
    orderBy: { order: "asc" },
  });

  // Only metadata — entries are fetched on demand when admin loads a class grid
  const scheduleTimetableMeta = await prisma.scheduleTimetable.findMany({
    select: {
      id: true,
      classId: true,
      term: true,
      academicYear: true,
      isPublished: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      class: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const serialized = JSON.parse(
    JSON.stringify({
      classes,
      teachers,
      subjects,
      lessons: [],
      timetables,
      grades,
      periods,
      scheduleTimetables: scheduleTimetableMeta,
      teacherList: teachers.map((t) => ({ id: t.id, name: t.name, surname: t.surname })),
      subjectList: subjects.map((s) => ({ id: s.id, name: s.name })),
      classList: classes.map((c) => ({ id: c.id, name: c.name })),
    })
  );

  return <ScheduleManagerClient data={serialized} />;
}
