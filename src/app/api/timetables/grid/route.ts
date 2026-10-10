import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { guardSession } from "@/lib/security/guard";

export async function GET(req: NextRequest) {
  const guard = await guardSession();
  if (!guard.ok) {
    return guard.response;
  }

  try {
    const { searchParams } = new URL(req.url);
    const targetGroup = searchParams.get("targetGroup");
    const classIdParam = searchParams.get("classId");

    let gradeLevels: number[] | null = null;
    if (targetGroup) {
      if (targetGroup === "PRE_SCHOOL") gradeLevels = [1, 2, 3, 4, 5];
      else if (targetGroup === "LOWER_PRIMARY") gradeLevels = [6, 7, 8];
      else if (targetGroup === "UPPER_PRIMARY") gradeLevels = [9, 10, 11];
      else if (targetGroup === "JUNIOR_HIGH") gradeLevels = [12, 13, 14];
    }

    const classWhere = classIdParam
      ? { id: parseInt(classIdParam) }
      : gradeLevels
      ? { grade: { level: { in: gradeLevels } } }
      : undefined;

    // 1. Try finding published timetables matching class / target group
    let timetables = await prisma.scheduleTimetable.findMany({
      where: {
        isPublished: true,
        ...(classWhere ? { class: classWhere } : {}),
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            gradeId: true,
            grade: { select: { level: true } },
          },
        },
        entries: {
          include: {
            subject: { select: { name: true } },
            teacher: { select: { name: true, surname: true } },
            period: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // 2. Fallback: search any timetables matching class / target group (even if not marked published)
    if (timetables.length === 0) {
      timetables = await prisma.scheduleTimetable.findMany({
        where: classWhere ? { class: classWhere } : undefined,
        include: {
          class: {
            select: {
              id: true,
              name: true,
              gradeId: true,
              grade: { select: { level: true } },
            },
          },
          entries: {
            include: {
              subject: { select: { name: true } },
              teacher: { select: { name: true, surname: true } },
              period: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });
    }

    // 3. Fallback: search ALL schedule timetables in system
    if (timetables.length === 0) {
      timetables = await prisma.scheduleTimetable.findMany({
        include: {
          class: {
            select: {
              id: true,
              name: true,
              gradeId: true,
              grade: { select: { level: true } },
            },
          },
          entries: {
            include: {
              subject: { select: { name: true } },
              teacher: { select: { name: true, surname: true } },
              period: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });
    }

    const periods = await prisma.timetablePeriod.findMany({
      orderBy: { order: "asc" },
    });

    return NextResponse.json({
      success: true,
      timetables,
      periods,
    });
  } catch (error) {
    console.error("Error fetching grid timetables:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load timetables" },
      { status: 500 }
    );
  }
}
