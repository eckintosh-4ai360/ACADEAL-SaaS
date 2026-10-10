import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createBlackoutPeriod,
  getBlackoutPeriods,
  deleteBlackoutPeriod,
} from "@/lib/meetingScheduler";
import { UserType } from "@prisma/client";

//* GET - Get blackout periods
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const upcoming = searchParams.get("upcoming") === "true";
    const past = searchParams.get("past") === "true";
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;

    const result = await getBlackoutPeriods({ upcoming, past, limit });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Get blackouts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch blackout periods" },
      { status: 500 }
    );
  }
}

//* POST - Create blackout period
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    //* Only admins and teachers can create blackout periods
    if (session.user.role !== "admin" && session.user.role !== "teacher") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, startTime, endTime } = body;

    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Title, startTime, and endTime are required" },
        { status: 400 }
      );
    }

    const result = await createBlackoutPeriod({
      title,
      description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      createdBy: session.user.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Create blackout error:", error);
    return NextResponse.json(
      { error: "Failed to create blackout period" },
      { status: 500 }
    );
  }
}

//* DELETE - Delete blackout period
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    //* Only admins and teachers can delete blackout periods
    if (session.user.role !== "admin" && session.user.role !== "teacher") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const blackoutId = searchParams.get("id");

    if (!blackoutId) {
      return NextResponse.json(
        { error: "Blackout ID is required" },
        { status: 400 }
      );
    }

    const result = await deleteBlackoutPeriod(parseInt(blackoutId));

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Delete blackout error:", error);
    return NextResponse.json(
      { error: "Failed to delete blackout period" },
      { status: 500 }
    );
  }
}
