import prisma from "./prisma";
import { MeetingStatus, MeetingType, UserType } from "@prisma/client";
import { sendNotification } from "./notifications";
import { getEmailTemplate, sendTemplateEmail } from "./emailTemplates";
import { EmailTemplateCategory } from "@prisma/client";

type CreateMeetingData = {
  title: string;
  description?: string;
  meetingType: MeetingType;
  date: Date;
  startTime: Date;
  endTime: Date;
  location?: string;
  teacherId: string;
  parentId: string;
  studentId?: string;
  requestedBy: UserType;
};

type MeetingAvailabilityData = {
  teacherId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive?: boolean;
  startDate?: Date;
  endDate?: Date;
};

/**
 * Create a parent-teacher meeting request
 */
export async function createMeeting(data: CreateMeetingData) {
  try {
    const meeting = await prisma.parentTeacherMeeting.create({
      data: {
        title: data.title,
        description: data.description,
        meetingType: data.meetingType,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        location: data.location,
        teacherId: data.teacherId,
        parentId: data.parentId,
        studentId: data.studentId,
        requestedBy: data.requestedBy,
        status: MeetingStatus.PENDING,
      },
      include: {
        teacher: { select: { id: true, name: true, surname: true, email: true } },
        parent: { select: { id: true, name: true, surname: true, email: true, phone: true } },
        student: { select: { id: true, name: true, studentId: true } },
      },
    });

    //* Send notification to the other party
    const isParentRequest = data.requestedBy === UserType.PARENT;
    const recipientId = isParentRequest ? data.teacherId : data.parentId;
    const recipientType = isParentRequest ? UserType.TEACHER : UserType.PARENT;

    //* Fetch names for notification
    const teacher = await prisma.teacher.findUnique({
      where: { id: data.teacherId },
      select: { name: true, surname: true },
    });

    const parent = await prisma.parent.findUnique({
      where: { id: data.parentId },
      select: { name: true, surname: true },
    });

    const requesterName = isParentRequest
      ? `${parent?.name || ""} ${parent?.surname || ""}`.trim()
      : `${teacher?.name || ""} ${teacher?.surname || ""}`.trim();

    await sendNotification({
      title: "New Meeting Request",
      message: `${requesterName} has requested a meeting for ${data.studentId ? "your child" : "your child"}`,
      type: "MEETING_REQUEST",
      recipientId,
      recipientType,
      metadata: { meetingId: meeting.id },
    });

    //* Send email notification
    await sendMeetingRequestEmail(meeting);

    return { success: true, meeting };
  } catch (error) {
    console.error("Create meeting error:", error);
    return { success: false, error: "Failed to create meeting" };
  }
}

/**
 * Get meeting by ID
 */
export async function getMeeting(meetingId: number) {
  try {
    const meeting = await prisma.parentTeacherMeeting.findUnique({
      where: { id: meetingId },
      include: {
        teacher: { select: { id: true, name: true, surname: true, email: true, phone: true } },
        parent: { select: { id: true, name: true, surname: true, email: true, phone: true } },
        student: { select: { id: true, name: true, studentId: true, email: true } },
      },
    });

    if (!meeting) {
      return { success: false, error: "Meeting not found" };
    }

    return { success: true, meeting };
  } catch (error) {
    console.error("Get meeting error:", error);
    return { success: false, error: "Failed to get meeting" };
  }
}

/**
 * Get meetings for a user (teacher, parent, or student)
 */
export async function getUserMeetings(
  userId: string,
  userType: UserType,
  options?: {
    status?: MeetingStatus;
    upcoming?: boolean;
    past?: boolean;
    limit?: number;
  }
) {
  try {
    const { status, upcoming, past, limit = 50 } = options || {};
    const now = new Date();

    const whereClause: Record<string, unknown> = {};

    //* Filter by user type
    if (userType === UserType.TEACHER) {
      whereClause.teacherId = userId;
    } else if (userType === UserType.PARENT) {
      whereClause.parentId = userId;
    } else if (userType === UserType.STUDENT) {
      whereClause.studentId = userId;
    }

    //* Filter by status
    if (status) {
      whereClause.status = status;
    }

    //* Filter by date
    if (upcoming) {
      whereClause.startTime = { gte: now };
    } else if (past) {
      whereClause.startTime = { lt: now };
    }

    const meetings = await prisma.parentTeacherMeeting.findMany({
      where: whereClause,
      include: {
        teacher: { select: { id: true, name: true, surname: true } },
        parent: { select: { id: true, name: true, surname: true } },
        student: { select: { id: true, name: true, studentId: true } },
      },
      orderBy: { startTime: "asc" },
      take: limit,
    });

    return { success: true, meetings };
  } catch (error) {
    console.error("Get user meetings error:", error);
    return { success: false, error: "Failed to get meetings" };
  }
}

/**
 * Confirm a meeting
 */
export async function confirmMeeting(meetingId: number, confirmedBy: string) {
  try {
    const meeting = await prisma.parentTeacherMeeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) {
      return { success: false, error: "Meeting not found" };
    }

    if (meeting.status !== MeetingStatus.PENDING) {
      return { success: false, error: "Meeting is not pending confirmation" };
    }

    const updated = await prisma.parentTeacherMeeting.update({
      where: { id: meetingId },
      data: {
        status: MeetingStatus.CONFIRMED,
        confirmedAt: new Date(),
      },
      include: {
        teacher: { select: { id: true, name: true, surname: true, email: true } },
        parent: { select: { id: true, name: true, surname: true, email: true } },
        student: { select: { id: true, name: true } },
      },
    });

    //* Send notification
    const isTeacherConfirming = confirmedBy === meeting.teacherId;
    const recipientId = isTeacherConfirming ? meeting.parentId : meeting.teacherId;
    const recipientType = isTeacherConfirming ? UserType.PARENT : UserType.TEACHER;

    await sendNotification({
      title: "Meeting Confirmed",
      message: `Your meeting request has been confirmed for ${updated.startTime.toLocaleDateString()}`,
      type: "MEETING_CONFIRMATION",
      recipientId,
      recipientType,
      metadata: { meetingId: meeting.id },
    });

    //* Send confirmation email
    await sendMeetingConfirmationEmail(updated);

    return { success: true, meeting: updated };
  } catch (error) {
    console.error("Confirm meeting error:", error);
    return { success: false, error: "Failed to confirm meeting" };
  }
}

/**
 * Cancel a meeting
 */
export async function cancelMeeting(meetingId: number, cancelledBy: string, reason?: string) {
  try {
    const meeting = await prisma.parentTeacherMeeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) {
      return { success: false, error: "Meeting not found" };
    }

    if (meeting.status === "CANCELLED" || meeting.status === "COMPLETED") {
      return { success: false, error: "Meeting cannot be cancelled" };
    }

    const updated = await prisma.parentTeacherMeeting.update({
      where: { id: meetingId },
      data: {
        status: MeetingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
      include: {
        teacher: { select: { id: true, name: true, surname: true, email: true } },
        parent: { select: { id: true, name: true, surname: true, email: true } },
        student: { select: { id: true, name: true } },
      },
    });

    //* Send notification
    const isTeacherCancelling = cancelledBy === meeting.teacherId;
    const recipientId = isTeacherCancelling ? meeting.parentId : meeting.teacherId;
    const recipientType = isTeacherCancelling ? UserType.PARENT : UserType.TEACHER;

    await sendNotification({
      title: "Meeting Cancelled",
      message: `The meeting scheduled for ${meeting.startTime.toLocaleDateString()} has been cancelled. ${reason ? `Reason: ${reason}` : ""}`,
      type: "MEETING_REQUEST",
      recipientId,
      recipientType,
      metadata: { meetingId: meeting.id },
    });

    return { success: true, meeting: updated };
  } catch (error) {
    console.error("Cancel meeting error:", error);
    return { success: false, error: "Failed to cancel meeting" };
  }
}

/**
 * Reschedule a meeting
 */
export async function rescheduleMeeting(
  meetingId: number,
  newDate: Date,
  newStartTime: Date,
  newEndTime: Date,
  location?: string
) {
  try {
    const meeting = await prisma.parentTeacherMeeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) {
      return { success: false, error: "Meeting not found" };
    }

    if (meeting.status === MeetingStatus.CANCELLED) {
      return { success: false, error: "Cannot reschedule a cancelled meeting" };
    }

    const updated = await prisma.parentTeacherMeeting.update({
      where: { id: meetingId },
      data: {
        date: newDate,
        startTime: newStartTime,
        endTime: newEndTime,
        location: location || meeting.location,
        status: MeetingStatus.RESCHEDULED,
      },
      include: {
        teacher: { select: { id: true, name: true, surname: true, email: true } },
        parent: { select: { id: true, name: true, surname: true, email: true } },
        student: { select: { id: true, name: true } },
      },
    });

    //* Send notifications to both parties
    await sendNotification({
      title: "Meeting Rescheduled",
      message: `Your meeting has been rescheduled to ${newDate.toLocaleDateString()} at ${newStartTime.toLocaleTimeString()}`,
      type: "MEETING_REMINDER",
      recipientId: meeting.teacherId,
      recipientType: UserType.TEACHER,
      metadata: { meetingId: meeting.id },
    });

    await sendNotification({
      title: "Meeting Rescheduled",
      message: `Your meeting has been rescheduled to ${newDate.toLocaleDateString()} at ${newStartTime.toLocaleTimeString()}`,
      type: "MEETING_REMINDER",
      recipientId: meeting.parentId,
      recipientType: UserType.PARENT,
      metadata: { meetingId: meeting.id },
    });

    return { success: true, meeting: updated };
  } catch (error) {
    console.error("Reschedule meeting error:", error);
    return { success: false, error: "Failed to reschedule meeting" };
  }
}

/**
 * Complete a meeting
 */
export async function completeMeeting(
  meetingId: number,
  completedBy: string,
  notes?: { teacherNotes?: string; parentNotes?: string; followUpRequired?: boolean; followUpNotes?: string }
) {
  try {
    const updated = await prisma.parentTeacherMeeting.update({
      where: { id: meetingId },
      data: {
        status: MeetingStatus.COMPLETED,
        ...notes,
      },
      include: {
        teacher: { select: { id: true, name: true, surname: true } },
        parent: { select: { id: true, name: true, surname: true } },
        student: { select: { id: true, name: true } },
      },
    });

    return { success: true, meeting: updated };
  } catch (error) {
    console.error("Complete meeting error:", error);
    return { success: false, error: "Failed to complete meeting" };
  }
}

/**
 * Set teacher availability for meetings
 */
export async function setTeacherAvailability(data: MeetingAvailabilityData) {
  try {
    const availability = await prisma.meetingAvailability.create({
      data,
    });

    return { success: true, availability };
  } catch (error) {
    console.error("Set availability error:", error);
    return { success: false, error: "Failed to set availability" };
  }
}

/**
 * Get teacher availability
 */
export async function getTeacherAvailability(teacherId: string, includeInactive = false) {
  try {
    const availabilities = await prisma.meetingAvailability.findMany({
      where: {
        teacherId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { dayOfWeek: "asc" },
    });

    return { success: true, availabilities };
  } catch (error) {
    console.error("Get availability error:", error);
    return { success: false, error: "Failed to get availability" };
  }
}

/**
 * Update teacher availability
 */
export async function updateTeacherAvailability(
  availabilityId: number,
  data: Partial<MeetingAvailabilityData>
) {
  try {
    const updated = await prisma.meetingAvailability.update({
      where: { id: availabilityId },
      data,
    });

    return { success: true, availability: updated };
  } catch (error) {
    console.error("Update availability error:", error);
    return { success: false, error: "Failed to update availability" };
  }
}

/**
 * Delete teacher availability
 */
export async function deleteTeacherAvailability(availabilityId: number) {
  try {
    await prisma.meetingAvailability.delete({
      where: { id: availabilityId },
    });

    return { success: true };
  } catch (error) {
    console.error("Delete availability error:", error);
    return { success: false, error: "Failed to delete availability" };
  }
}

/**
 * Get available time slots for a teacher on a specific date
 */
export async function getAvailableTimeSlots(teacherId: string, dateParam: Date | string) {
  try {
    //* Convert to a date object and ensure we handle it as a calendar date
    //* If it's a string like "2026-03-17", new Date(string) will be UTC midnight
    const date = typeof dateParam === "string" ? new Date(dateParam) : dateParam;
    
    //* Use UTC methods if we want to be consistent with YYYY-MM-DD input
    const dayOfWeek = typeof dateParam === "string" ? date.getUTCDay() : date.getDay();
    
    //* Create boundaries without mutating the original date object
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    //* Get teacher's availability for this day of week
    const availabilities = await prisma.meetingAvailability.findMany({
      where: {
        teacherId,
        dayOfWeek,
        isActive: true,
        OR: [
          { startDate: null, endDate: null },
          { startDate: { lte: endOfDay }, endDate: { gte: startOfDay } },
        ],
      },
    });

    if (availabilities.length === 0) {
      return { success: true, slots: [] };
    }

    //* Get existing meetings for this date
    const existingMeetings = await prisma.parentTeacherMeeting.findMany({
      where: {
        teacherId,
        startTime: { gte: startOfDay, lte: endOfDay },
        status: { notIn: [MeetingStatus.CANCELLED] },
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    //* Get blackout periods
    const blackouts = await prisma.meetingBlackout.findMany({
      where: {
        OR: [
          { startTime: { lte: endOfDay }, endTime: { gte: startOfDay } },
        ],
      },
    });

    //* Generate available slots
    const slots: { startTime: string; endTime: string }[] = [];

    for (const availability of availabilities) {
      const [startHour, startMinute] = availability.startTime.split(":").map(Number);
      const [endHour, endMinute] = availability.endTime.split(":").map(Number);

      let currentMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      while (currentMinutes + 30 <= endMinutes) {
        const nextMinutes = currentMinutes + 30;

        const formatMinutes = (m: number) => {
          const h = Math.floor(m / 60).toString().padStart(2, "0");
          const mins = (m % 60).toString().padStart(2, "0");
          return `${h}:${mins}`;
        };

        const currentStartStr = formatMinutes(currentMinutes);
        const nextSlotStr = formatMinutes(nextMinutes);

        //* Convert to Date objects just for conflict checking
        const currentStartDate = new Date(startOfDay);
        currentStartDate.setUTCHours(Math.floor(currentMinutes / 60), currentMinutes % 60, 0, 0);
        
        const nextSlotDate = new Date(startOfDay);
        nextSlotDate.setUTCHours(Math.floor(nextMinutes / 60), nextMinutes % 60, 0, 0);

        const hasConflict =
          existingMeetings.some(
            (m) =>
              (currentStartDate < m.endTime && nextSlotDate > m.startTime)
          ) ||
          blackouts.some(
            (b) =>
              (currentStartDate < b.endTime && nextSlotDate > b.startTime)
          );

        if (!hasConflict) {
          slots.push({ startTime: currentStartStr, endTime: nextSlotStr });
        }

        currentMinutes = nextMinutes;
      }
    }

    return { success: true, slots };
  } catch (error) {
    console.error("Get time slots error:", error);
    return { success: false, error: "Failed to get time slots" };
  }
}

/**
 * Create a blackout period (no meetings allowed)
 */
export async function createBlackoutPeriod(data: {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  createdBy: string;
}) {
  try {
    const blackout = await prisma.meetingBlackout.create({
      data,
    });

    return { success: true, blackout };
  } catch (error) {
    console.error("Create blackout error:", error);
    return { success: false, error: "Failed to create blackout period" };
  }
}

/**
 * Get blackout periods
 */
export async function getBlackoutPeriods(options?: {
  upcoming?: boolean;
  past?: boolean;
  limit?: number;
}) {
  try {
    const { upcoming, past, limit = 50 } = options || {};
    const now = new Date();

    const whereClause: Record<string, unknown> = {};

    if (upcoming) {
      whereClause.endTime = { gte: now };
    } else if (past) {
      whereClause.endTime = { lt: now };
    }

    const blackouts = await prisma.meetingBlackout.findMany({
      where: whereClause,
      orderBy: { startTime: "asc" },
      take: limit,
    });

    return { success: true, blackouts };
  } catch (error) {
    console.error("Get blackouts error:", error);
    return { success: false, error: "Failed to get blackout periods" };
  }
}

/**
 * Delete a blackout period
 */
export async function deleteBlackoutPeriod(blackoutId: number) {
  try {
    await prisma.meetingBlackout.delete({
      where: { id: blackoutId },
    });

    return { success: true };
  } catch (error) {
    console.error("Delete blackout error:", error);
    return { success: false, error: "Failed to delete blackout period" };
  }
}

/**
 * Send meeting request email
 */
async function sendMeetingRequestEmail(meeting: {
  id: number;
  title: string;
  startTime: Date;
  location: string | null;
  teacher: { name: string; surname: string; email: string | null };
  parent: { name: string; surname: string; email: string | null };
  student: { name: string } | null;
}) {
  try {
    const templateResult = await getEmailTemplate(EmailTemplateCategory.MEETING_REQUEST);
    if (!templateResult.success || !templateResult.template) return;

    const recipientEmail = meeting.parent.email;
    if (!recipientEmail) return;

    const variables = {
      recipientName: `${meeting.parent.name} ${meeting.parent.surname}`,
      requesterName: `${meeting.teacher.name} ${meeting.teacher.surname}`,
      studentName: meeting.student?.name || "your child",
      meetingDate: meeting.startTime.toLocaleDateString("en-GB", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      meetingTime: meeting.startTime.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      location: meeting.location || "To be confirmed",
      purpose: meeting.title,
    };

    await sendTemplateEmail(templateResult.template.id, recipientEmail, variables, {
      meetingId: meeting.id,
    });
  } catch (error) {
    console.error("Send meeting request email error:", error);
  }
}

/**
 * Send meeting confirmation email
 */
async function sendMeetingConfirmationEmail(meeting: {
  id: number;
  startTime: Date;
  location: string | null;
  teacher: { name: string; surname: string; email: string | null };
  parent: { name: string; surname: string; email: string | null };
  student: { name: string } | null;
}) {
  try {
    const templateResult = await getEmailTemplate(EmailTemplateCategory.MEETING_CONFIRMATION);
    if (!templateResult.success || !templateResult.template) return;

    const recipientEmail = meeting.parent.email;
    if (!recipientEmail) return;

    const variables = {
      recipientName: `${meeting.parent.name} ${meeting.parent.surname}`,
      studentName: meeting.student?.name || "your child",
      meetingDate: meeting.startTime.toLocaleDateString("en-GB", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      meetingTime: meeting.startTime.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      location: meeting.location || "To be confirmed",
      teacherName: `${meeting.teacher.name} ${meeting.teacher.surname}`,
    };

    await sendTemplateEmail(templateResult.template.id, recipientEmail, variables, {
      meetingId: meeting.id,
    });
  } catch (error) {
    console.error("Send meeting confirmation email error:", error);
  }
}

/**
 * Send meeting reminder (can be scheduled to run 24 hours before the meeting)
 */
export async function sendMeetingReminder(meetingId: number) {
  try {
    const meeting = await prisma.parentTeacherMeeting.findUnique({
      where: { id: meetingId },
      include: {
        teacher: { select: { name: true, surname: true, email: true } },
        parent: { select: { name: true, surname: true, email: true } },
        student: { select: { name: true } },
      },
    });

    if (!meeting || meeting.reminderSent) {
      return { success: false, error: "Meeting not found or reminder already sent" };
    }

    //* Send in-app notification
    await sendNotification({
      title: "Meeting Reminder",
      message: `Reminder: You have a meeting scheduled for ${meeting.startTime.toLocaleDateString()} at ${meeting.startTime.toLocaleTimeString()}`,
      type: "MEETING_REMINDER",
      recipientId: meeting.parentId,
      recipientType: UserType.PARENT,
      metadata: { meetingId: meeting.id },
    });

    await sendNotification({
      title: "Meeting Reminder",
      message: `Reminder: You have a meeting scheduled for ${meeting.startTime.toLocaleDateString()} at ${meeting.startTime.toLocaleTimeString()}`,
      type: "MEETING_REMINDER",
      recipientId: meeting.teacherId,
      recipientType: UserType.TEACHER,
      metadata: { meetingId: meeting.id },
    });

    //* Send email reminder
    const templateResult = await getEmailTemplate(EmailTemplateCategory.MEETING_REMINDER);
    if (templateResult.success && templateResult.template && meeting.parent.email) {
      await sendTemplateEmail(
        templateResult.template.id,
        meeting.parent.email,
        {
          recipientName: `${meeting.parent.name} ${meeting.parent.surname}`,
          studentName: meeting.student?.name || "your child",
          meetingDate: meeting.startTime.toLocaleDateString("en-GB", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          meetingTime: meeting.startTime.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          location: meeting.location || "To be confirmed",
          teacherName: `${meeting.teacher.name} ${meeting.teacher.surname}`,
        },
        { meetingId: meeting.id }
      );
    }

    //* Mark reminder as sent
    await prisma.parentTeacherMeeting.update({
      where: { id: meetingId },
      data: {
        reminderSent: true,
        reminderSentAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Send meeting reminder error:", error);
    return { success: false, error: "Failed to send reminder" };
  }
}
