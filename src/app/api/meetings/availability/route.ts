import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  setTeacherAvailability,
  updateTeacherAvailability,
  deleteTeacherAvailability,
  getTeacherAvailability,
} from "@/lib/meetingScheduler";
import prisma from "@/lib/prisma";

//* GET - Get teacher's availability
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const teacherId = searchParams.get("teacherId");
    const includeInactive = searchParams.get("includeInactive") === "true";

    //* Only teachers can manage their own availability, admins can view all
    if (session.user.role === "teacher" && !teacherId) {
      return NextResponse.json(
        { error: "teacherId is required" },
        { status: 400 }
      );
    }

    const targetTeacherId = teacherId || session.user.id;

    const result = await getTeacherAvailability(targetTeacherId, includeInactive);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Get availability error:", error);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    );
  }
}

//* POST - Create or update availability
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      action,
      availabilityId,
      teacherId,
      dayOfWeek,
      startTime,
      endTime,
      isActive,
      startDate,
      endDate,
    } = body;

    //* Only teachers can manage their own availability
    if (session.user.role === "teacher" && teacherId && teacherId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const targetTeacherId = teacherId || session.user.id;

    //* Update existing availability
    if (action === "update" && availabilityId) {
      const result = await updateTeacherAvailability(parseInt(availabilityId), {
        dayOfWeek,
        startTime,
        endTime,
        isActive,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        );
      }
      return NextResponse.json(result);
    }

    //* Create new availability
    if (!action || action === "create") {
      if (dayOfWeek === undefined || !startTime || !endTime) {
        return NextResponse.json(
          { error: "dayOfWeek, startTime, and endTime are required" },
          { status: 400 }
        );
      }

      const result = await setTeacherAvailability({
        teacherId: targetTeacherId,
        dayOfWeek,
        startTime,
        endTime,
        isActive,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
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
    console.error("Availability operation error:", error);
    return NextResponse.json(
      { error: "Failed to process availability" },
      { status: 500 }
    );
  }
}

//* DELETE - Delete availability
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const availabilityId = searchParams.get("id");

    if (!availabilityId) {
      return NextResponse.json(
        { error: "Availability ID is required" },
        { status: 400 }
      );
    }

    const result = await deleteTeacherAvailability(parseInt(availabilityId));

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Delete availability error:", error);
    return NextResponse.json(
      { error: "Failed to delete availability" },
      { status: 500 }
    );
  }
}
