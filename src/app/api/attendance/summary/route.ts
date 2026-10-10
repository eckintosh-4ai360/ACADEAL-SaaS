import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { format } from "date-fns";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "admin" && session.user.role !== "teacher")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { classId, startDate, endDate } = body;

    if (!classId || !startDate || !endDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get the class info
    const classData = await prisma.class.findUnique({
      where: { id: parseInt(classId) },
      include: {
        students: {
          include: {
            grade: true,
          },
        },
      },
    });

    if (!classData) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Get all lessons for this class
    const lessons = await prisma.lesson.findMany({
      where: { classId: parseInt(classId) },
      include: {
        attendances: {
          where: {
            date: {
              gte: start,
              lte: end,
            },
          },
        },
      },
    });

    const lessonIds = lessons.map(l => l.id);

    // Get all attendance records for the date range
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        lessonId: { in: lessonIds },
        date: {
          gte: start,
          lte: end,
        },
      },
      include: {
        student: true,
        lesson: true,
      },
    });

    // Calculate summary statistics
    const totalStudents = classData.students.length;
    const totalSessions = lessons.length;
    
    // Group by student
    const studentStats = classData.students.map(student => {
      const studentAttendances = attendanceRecords.filter(a => a.studentId === student.id);
      const presentCount = studentAttendances.filter(a => a.present).length;
      const absentCount = studentAttendances.filter(a => !a.present).length;
      const totalRecords = presentCount + absentCount;
      const attendanceRate = totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0;

      return {
        id: student.id,
        name: `${student.name} ${student.surname}`,
        grade: student.grade.level,
        totalSessions,
        present: presentCount,
        absent: absentCount,
        attendanceRate: Math.round(attendanceRate * 10) / 10,
      };
    });

    // Overall class statistics
    const totalPresent = attendanceRecords.filter(a => a.present).length;
    const totalAbsent = attendanceRecords.filter(a => !a.present).length;
    const totalRecords = totalPresent + totalAbsent;
    const overallAttendanceRate = totalRecords > 0 ? (totalPresent / totalRecords) * 100 : 0;

    // Find students with perfect attendance
    const perfectAttendance = studentStats.filter(s => s.attendanceRate === 100 && s.present > 0);
    
    // Find students with low attendance (< 75%)
    const lowAttendance = studentStats.filter(s => s.attendanceRate < 75 && s.totalSessions > 0);

    return NextResponse.json({
      success: true,
      data: {
        className: classData.name,
        dateRange: {
          start: format(start, "MMM dd, yyyy"),
          end: format(end, "MMM dd, yyyy"),
        },
        overview: {
          totalStudents,
          totalSessions,
          totalPresent,
          totalAbsent,
          overallAttendanceRate: Math.round(overallAttendanceRate * 10) / 10,
        },
        studentStats,
        highlights: {
          perfectAttendance: perfectAttendance.map(s => s.name),
          lowAttendance: lowAttendance.map(s => ({ name: s.name, rate: s.attendanceRate })),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching attendance summary:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
