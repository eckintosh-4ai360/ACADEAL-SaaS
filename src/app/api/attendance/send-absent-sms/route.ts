import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getSystemSettings } from "@/lib/settings";
import { sendSMS } from "@/lib/sms";

export async function POST(request: Request) {
  try {
    // RBAC — only admin and teacher can send SMS
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "admin" && session.user.role !== "teacher")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { classId, date } = body;

    if (!classId || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Find the "Daily Attendance" lesson for this class
    const lesson = await prisma.lesson.findFirst({
      where: {
        classId: parseInt(classId),
        name: "Daily Attendance",
      },
    });

    if (!lesson) {
      return NextResponse.json(
        { error: "No attendance records found for this class on the selected date" },
        { status: 404 }
      );
    }

    // Get all attendance records for this class on the selected date
    const attendances = await prisma.attendance.findMany({
      where: {
        lessonId: lesson.id,
        date: attendanceDate,
        present: false, // Only absent students
      },
      include: {
        student: {
          include: {
            parent: true,
          },
        },
      },
    });

    if (attendances.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No absent students found for this date.",
        sent: 0,
        failed: 0,
      });
    }

    // Get settings for school name
    const settings = await getSystemSettings();
    const schoolName = settings?.schoolName || "School";

    // Send SMS to parents of absent students
    const dateStr = attendanceDate.toLocaleDateString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const results = await Promise.allSettled(
      attendances.map(async (attendance) => {
        const { student } = attendance;
        // Priority: parent.phone → student.contactNumber
        const phone = student.parent?.phone || student.contactNumber;

        if (!phone) {
          return { success: false, error: "No phone number", studentName: student.name };
        }

        const message = `Dear Parent/Guardian, this is to inform you that ${student.name} ${student.surname} was ABSENT from ${schoolName} on ${dateStr}. Please follow up with your child.`;

        const result = await sendSMS(phone, message);
        return {
          success: result.success,
          error: result.error,
          studentName: `${student.name} ${student.surname}`,
          phone,
        };
      })
    );

    const sent = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;
    const failed = results.length - sent;

    // Log the SMS sends
    for (const result of results) {
      if (result.status === "fulfilled" && result.value.success && result.value.phone) {
        await prisma.smsLog.create({
          data: {
            sender: session.user.id,
            recipient: result.value.phone,
            message: `Absent alert for ${result.value.studentName}`,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `SMS sent to ${sent} parent(s) of absent student(s).`,
      sent,
      failed,
      details: results.map((r) => (r.status === "fulfilled" ? r.value : { success: false, error: "Failed" })),
    });
  } catch (error) {
    console.error("Error sending absence SMS:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
