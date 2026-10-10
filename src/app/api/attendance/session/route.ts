import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "admin" && session.user.role !== "teacher")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { classId, date } = body;

    if (!classId || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const classNumericId = Number.parseInt(classId, 10);
    if (Number.isNaN(classNumericId)) {
      return NextResponse.json({ error: "Invalid class ID" }, { status: 400 });
    }

    const sessionDate = new Date(date);
    sessionDate.setHours(0, 0, 0, 0);
    const endOfSessionDate = new Date(sessionDate);
    endOfSessionDate.setHours(23, 59, 59, 999);

    const whereClause: Prisma.ClassWhereInput = { id: classNumericId };
    if (session.user.role === "teacher") {
      whereClause.OR = [
        { supervisorId: session.user.id },
        { lessons: { some: { teacherId: session.user.id } } },
      ];
    }

    const classData = await prisma.class.findFirst({
      where: whereClause,
      include: {
        students: {
          include: {
            grade: true,
            attendances: {
              where: {
                date: {
                  gte: sessionDate,
                  lte: endOfSessionDate,
                },
              },
              select: {
                id: true,
                present: true,
                lessonId: true,
                date: true,
              },
              take: 1,
            },
            fees: {
              where: {
                title: { contains: "auxiliary", mode: "insensitive" },
                dueDate: {
                  gte: sessionDate,
                  lte: endOfSessionDate,
                },
              },
              select: {
                id: true,
                status: true,
                dueDate: true,
                amount: true,
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!classData) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const dailyAttendanceLesson = await prisma.lesson.findFirst({
      where: {
        classId: classNumericId,
        name: "Daily Attendance",
      },
      select: {
        id: true,
      },
    });

    const students = classData.students.map((student) => {
      const attendanceRecord = dailyAttendanceLesson
        ? student.attendances.find((attendance) => attendance.lessonId === dailyAttendanceLesson.id) || null
        : null;
      const feeRecord = student.fees[0] || null;

      return {
        id: student.id,
        name: student.name,
        surname: student.surname,
        othername: student.otherNames,
        grade: student.grade,
        attendancePresent: attendanceRecord?.present ?? false,
        auxiliaryFeeStatus: feeRecord
          ? (feeRecord.status === "PAID" ? "PAID" : feeRecord.status)
          : ("N/A" as const),
      };
    });

    const attendanceMarks: Record<string, boolean> = {};
    students.forEach((student) => {
      if (student.attendancePresent) {
        attendanceMarks[student.id] = true;
      }
    });

    const auxiliaryFeeMarks: Record<string, boolean> = {};
    students.forEach((student) => {
      if (student.auxiliaryFeeStatus === "PAID") {
        auxiliaryFeeMarks[student.id] = true;
      }
    });

    const dailyAuxiliaryFeeAmount = classData.students.find((student) => student.fees[0])?.fees[0]?.amount ?? null;
    const hasAttendanceRecords = dailyAttendanceLesson
      ? classData.students.some((student) =>
          student.attendances.some((attendance) => attendance.lessonId === dailyAttendanceLesson.id)
        )
      : false;
    const hasAuxiliaryFeeRecords = classData.students.some((student) => student.fees.length > 0);

    return NextResponse.json({
      success: true,
      data: {
        classId: classData.id,
        className: classData.name,
        date: sessionDate.toISOString(),
        dailyAuxiliaryFeeAmount,
        hasAttendanceRecords,
        hasAuxiliaryFeeRecords,
        attendanceMarks,
        auxiliaryFeeMarks,
        students,
      },
    });
  } catch (error) {
    console.error("Error fetching attendance session:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
