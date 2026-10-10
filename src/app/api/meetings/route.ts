import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createMeeting,
  getMeeting,
  getUserMeetings,
  confirmMeeting,
  cancelMeeting,
  rescheduleMeeting,
  completeMeeting,
  getTeacherAvailability,
  getAvailableTimeSlots,
  sendMeetingReminder,
} from "@/lib/meetingScheduler";
import { MeetingStatus, MeetingType, UserType } from "@prisma/client";
import prisma from "@/lib/prisma";

//* GET - Get meetings for user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const meetingId = searchParams.get("meetingId");
    const status = searchParams.get("status") as MeetingStatus | null;
    const upcoming = searchParams.get("upcoming") === "true";
    const past = searchParams.get("past") === "true";
    const teacherId = searchParams.get("teacherId");

    const userTypeMap: Record<string, UserType> = {
      admin: UserType.ADMIN,
      teacher: UserType.TEACHER,
      parent: UserType.PARENT,
      student: UserType.STUDENT,
    };

    const userType = userTypeMap[session.user.role as string] || UserType.ADMIN;

    //* Get single meeting
    if (meetingId) {
      const result = await getMeeting(parseInt(meetingId));
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 404 }
        );
      }
      return NextResponse.json(result);
    }

    //* Get teacher availability (for parents booking meetings)
    if (teacherId) {
      const availability = await getTeacherAvailability(teacherId);
      return NextResponse.json(availability);
    }

    //* Get user's meetings
    const result = await getUserMeetings(session.user.id, userType, {
      status: status || undefined,
      upcoming,
      past,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Get meetings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch meetings" },
      { status: 500 }
    );
  }
}

//* POST - Create meeting or perform meeting actions
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      action,
      meetingId,
      title,
      description,
      meetingType,
      date,
      startTime,
      endTime,
      location,
      teacherId,
      parentId,
      studentId,
      reason,
      notes,
      newDate,
      newStartTime,
      newEndTime,
    } = body;

    const userTypeMap: Record<string, UserType> = {
      admin: UserType.ADMIN,
      teacher: UserType.TEACHER,
      parent: UserType.PARENT,
      student: UserType.STUDENT,
    };

    const userType = userTypeMap[session.user.role as string] || UserType.ADMIN;

    //* Get available time slots for a teacher
    if (action === "getAvailableSlots" && teacherId && date) {
      const slots = await getAvailableTimeSlots(teacherId, date);
      return NextResponse.json(slots);
    }

    //* Send meeting reminder (admin/teacher only)
    if (action === "sendReminder" && meetingId) {
      if (userType !== UserType.ADMIN && userType !== UserType.TEACHER) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const result = await sendMeetingReminder(parseInt(meetingId));
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        );
      }
      return NextResponse.json(result);
    }

    //* Confirm meeting
    if (action === "confirm" && meetingId) {
      const result = await confirmMeeting(parseInt(meetingId), session.user.id);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        );
      }
      return NextResponse.json(result);
    }

    //* Cancel meeting
    if (action === "cancel" && meetingId) {
      const result = await cancelMeeting(
        parseInt(meetingId),
        session.user.id,
        reason
      );
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        );
      }
      return NextResponse.json(result);
    }

    //* Reschedule meeting
    if (action === "reschedule" && meetingId && newDate && newStartTime) {
      const result = await rescheduleMeeting(
        parseInt(meetingId),
        new Date(newDate),
        new Date(newStartTime),
        new Date(newEndTime || newStartTime),
        location
      );
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        );
      }
      return NextResponse.json(result);
    }

    //* Complete meeting
    if (action === "complete" && meetingId) {
      const result = await completeMeeting(
        parseInt(meetingId),
        session.user.id,
        notes
      );
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        );
      }
      return NextResponse.json(result);
    }

    //* Create new meeting
    if (!action || action === "create") {
      if (!title || !startTime || !endTime) {
        return NextResponse.json(
          { error: "Title, startTime, and endTime are required" },
          { status: 400 }
        );
      }

      //* Determine teacherId and parentId based on who is creating
      let finalTeacherId = teacherId;
      let finalParentId = parentId;

      if (userType === UserType.TEACHER) {
        finalTeacherId = session.user.id;
        if (!finalParentId) {
          return NextResponse.json(
            { error: "parentId is required" },
            { status: 400 }
          );
        }
      } else if (userType === UserType.PARENT) {
        finalParentId = session.user.id;
        if (!finalTeacherId) {
          return NextResponse.json(
            { error: "teacherId is required" },
            { status: 400 }
          );
        }
      } else if (userType === UserType.ADMIN) {
        if (!finalTeacherId || !finalParentId) {
          return NextResponse.json(
            { error: "teacherId and parentId are required" },
            { status: 400 }
          );
        }
      }

      const meetingDate = date ? new Date(date) : new Date(startTime);

      const result = await createMeeting({
        title,
        description,
        meetingType: meetingType || MeetingType.IN_PERSON,
        date: meetingDate,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location,
        teacherId: finalTeacherId,
        parentId: finalParentId,
        studentId,
        requestedBy: userType,
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        );
      }

      return NextResponse.json(result, { status: 201 });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Meeting operation error:", error);
    return NextResponse.json(
      { error: "Failed to process meeting" },
      { status: 500 }
    );
  }
}

//* DELETE - Cancel meeting
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const meetingId = searchParams.get("id");
    const reason = searchParams.get("reason");

    if (!meetingId) {
      return NextResponse.json(
        { error: "Meeting ID is required" },
        { status: 400 }
      );
    }

    const result = await cancelMeeting(
      parseInt(meetingId),
      session.user.id,
      reason || undefined
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Cancel meeting error:", error);
    return NextResponse.json(
      { error: "Failed to cancel meeting" },
      { status: 500 }
    );
  }
}
