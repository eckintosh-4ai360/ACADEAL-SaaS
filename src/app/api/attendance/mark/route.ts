import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    //* RBAC — only admin and teacher can mark attendance
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "admin" && session.user.role !== "teacher")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { classId, date, attendances, paidAuxiliaryFeeStudentIds = [] } = body;

    if (!classId || !date || !attendances) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    const endOfAttendanceDate = new Date(attendanceDate);
    endOfAttendanceDate.setHours(23, 59, 59, 999);

    //* 1. Find or Create a "Daily Attendance" Lesson for this class
    //* We use a convention: a lesson named "Daily Attendance" for each class.
    let lesson = await prisma.lesson.findFirst({
      where: {
        classId: parseInt(classId),
        name: "Daily Attendance",
      },
    });

    if (!lesson) {
      //* We need a teacher and a subject. Let's find any teacher or use a default if exists.
      const classData = await prisma.class.findUnique({
        where: { id: parseInt(classId) },
        include: { supervisor: true },
      });

      const subject = await prisma.subject.findFirst() || await prisma.subject.create({ data: { name: "General" } });
      const teacher = classData?.supervisor || await prisma.teacher.findFirst();

      if (!teacher) {
        return NextResponse.json({ error: "No teacher available to assign to attendance lesson" }, { status: 500 });
      }

      lesson = await prisma.lesson.create({
        data: {
          name: "Daily Attendance",
          classId: parseInt(classId),
          teacherId: teacher.id,
          subjectId: subject.id,
          day: "MONDAY", // Dummy day, as attendance is date-based
          startTime: new Date(),
          endTime: new Date(),
        },
      });
    }

    //* 2. Mark Attendance and Sync with Fees
    for (const record of attendances) {
      const { studentId, present } = record;
      const isFeePaidManually = paidAuxiliaryFeeStudentIds.includes(studentId);
      const shouldBePaid = present || isFeePaidManually;

      //* Create or Update Attendance for the selected date
      const existingAttendance = await prisma.attendance.findFirst({
        where: {
          studentId,
          lessonId: lesson.id,
          date: attendanceDate,
        },
      });

      if (existingAttendance) {
        await prisma.attendance.update({
          where: { id: existingAttendance.id },
          data: { present },
        });
      } else {
        await prisma.attendance.create({
          data: {
            studentId,
            lessonId: lesson.id,
            date: attendanceDate,
            present,
          },
        });
      }

      //* Sync the fee that belongs to the same selected date
      const feeForSelectedDate = await prisma.fee.findFirst({
        where: {
          studentId,
          title: { contains: "auxiliary", mode: "insensitive" },
          dueDate: { gte: attendanceDate, lte: endOfAttendanceDate },
        },
      });

      if (feeForSelectedDate) {
        if (shouldBePaid) {
          await prisma.fee.update({
            where: { id: feeForSelectedDate.id },
            data: {
              status: "PAID",
              paymentMethod: "CASH",
            },
          });
        } else if (feeForSelectedDate.status === "PAID") {
          await prisma.fee.update({
            where: { id: feeForSelectedDate.id },
            data: {
              status: "PENDING",
              paymentMethod: null,
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking attendance:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
