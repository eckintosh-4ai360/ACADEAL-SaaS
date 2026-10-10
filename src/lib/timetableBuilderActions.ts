"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Day } from "@prisma/client";
import { requireAdmin, requireStaff } from "@/lib/security/guard";

export async function createPeriod(data: {
  name: string;
  startTime: string;
  endTime: string;
  isBreak?: boolean;
  order?: number;
}) {
  try {
    await requireAdmin();
    const count = await prisma.timetablePeriod.count();
    const period = await prisma.timetablePeriod.create({
      data: {
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        isBreak: data.isBreak ?? false,
        order: data.order ?? count + 1,
      },
    });

    revalidatePath("/dashboard/schedule");
    return { success: true, period, message: "Period created successfully" };
  } catch (error: any) {
    console.error("Failed to create period:", error);
    return { success: false, message: error?.message || "Failed to create period" };
  }
}

export async function updatePeriod(
  id: number,
  data: {
    name: string;
    startTime: string;
    endTime: string;
    isBreak?: boolean;
    order?: number;
  }
) {
  try {
    await requireAdmin();
    const period = await prisma.timetablePeriod.update({
      where: { id },
      data: {
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        isBreak: data.isBreak ?? false,
        order: data.order,
      },
    });

    revalidatePath("/dashboard/schedule");
    return { success: true, period, message: "Period updated successfully" };
  } catch (error: any) {
    console.error("Failed to update period:", error);
    return { success: false, message: error?.message || "Failed to update period" };
  }
}

export async function deletePeriod(id: number) {
  try {
    await requireAdmin();
    await prisma.timetablePeriod.delete({
      where: { id },
    });

    revalidatePath("/dashboard/schedule");
    return { success: true, message: "Period deleted successfully" };
  } catch (error: any) {
    console.error("Failed to delete period:", error);
    return { success: false, message: error?.message || "Failed to delete period" };
  }
}

export async function getOrCreateScheduleTimetable(
  classId: number,
  term: string = "Term 1",
  academicYear: string = "2024-2025"
) {
  try {
    await requireStaff();
    let timetable = await prisma.scheduleTimetable.findUnique({
      where: {
        classId_term_academicYear: {
          classId,
          term,
          academicYear,
        },
      },
      include: {
        entries: {
          include: {
            subject: true,
            teacher: true,
            period: true,
          },
        },
        class: true,
      },
    });

    if (!timetable) {
      timetable = await prisma.scheduleTimetable.create({
        data: {
          classId,
          term,
          academicYear,
        },
        include: {
          entries: {
            include: {
              subject: true,
              teacher: true,
              period: true,
            },
          },
          class: true,
        },
      });
    }

    revalidatePath("/dashboard/schedule");
    return { success: true, timetable };
  } catch (error: any) {
    console.error("Failed to get/create schedule timetable:", error);
    return { success: false, message: error?.message || "Failed to load timetable" };
  }
}

export async function upsertTimetableCellEntry(data: {
  timetableId: number;
  periodId: number;
  day: Day;
  subjectId?: number | null;
  teacherId?: string | null;
  note?: string | null;
}) {
  try {
    await requireAdmin();
    const { timetableId, periodId, day, subjectId, teacherId, note } = data;

    // If both subject and note are empty, delete the entry if it exists
    if (!subjectId && !note) {
      await prisma.timetableEntry.deleteMany({
        where: {
          timetableId,
          periodId,
          day,
        },
      });
      revalidatePath("/dashboard/schedule");
      return { success: true, message: "Slot cleared" };
    }

    const entry = await prisma.timetableEntry.upsert({
      where: {
        timetableId_periodId_day: {
          timetableId,
          periodId,
          day,
        },
      },
      create: {
        timetableId,
        periodId,
        day,
        subjectId: subjectId || null,
        teacherId: teacherId || null,
        note: note || null,
      },
      update: {
        subjectId: subjectId || null,
        teacherId: teacherId || null,
        note: note || null,
      },
    });

    revalidatePath("/dashboard/schedule");
    return { success: true, entry, message: "Slot updated" };
  } catch (error: any) {
    console.error("Failed to update slot:", error);
    return { success: false, message: error?.message || "Failed to update slot" };
  }
}

export async function publishScheduleTimetable(timetableId: number) {
  try {
    await requireAdmin();
    const timetable = await prisma.scheduleTimetable.update({
      where: { id: timetableId },
      data: {
        isPublished: true,
        publishedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/schedule");
    revalidatePath("/dashboard/lessons");
    return { success: true, timetable, message: "Timetable published successfully!" };
  } catch (error: any) {
    console.error("Failed to publish timetable:", error);
    return { success: false, message: error?.message || "Failed to publish timetable" };
  }
}

export async function unpublishScheduleTimetable(timetableId: number) {
  try {
    await requireAdmin();
    const timetable = await prisma.scheduleTimetable.update({
      where: { id: timetableId },
      data: {
        isPublished: false,
      },
    });

    revalidatePath("/dashboard/schedule");
    revalidatePath("/dashboard/lessons");
    return { success: true, timetable, message: "Timetable unpublished." };
  } catch (error: any) {
    console.error("Failed to unpublish timetable:", error);
    return { success: false, message: error?.message || "Failed to unpublish timetable" };
  }
}
