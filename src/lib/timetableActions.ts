"use server";

import { revalidatePath } from "next/cache";
import prisma from "./prisma";
import { TimetableSchema } from "./formValidationSchemas";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { writeServerAuditLog } from "./audit-server";

type ActionState = { success: boolean; error: boolean; message?: string };

export const createTimetable = async (
  currentState: ActionState,
  data: TimetableSchema
): Promise<ActionState> => {
  const startedAt = Date.now();
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return { success: false, error: true, message: "Unauthorized action." };
  }

  try {
    const timetable = await prisma.timetable.create({
      data: {
        title: data.title,
        semester: data.semester,
        academicYear: data.academicYear,
        targetGroup: data.targetGroup,
        fileUrl: data.fileUrl || "",
        fileType: data.fileType || "PDF",
        uploadedBy: session.user.name || "Admin",
      },
    });

    revalidatePath("/dashboard/lessons");
    revalidatePath("/dashboard/classes");
    revalidatePath("/dashboard/academics");
    await writeServerAuditLog({
      action: "timetable.create",
      category: "academics",
      summary: `Posted timetable ${data.title}`,
      durationMs: Date.now() - startedAt,
      entity: {
        type: "timetable",
        id: timetable.id,
        label: data.title,
      },
      metadata: {
        semester: data.semester,
        academicYear: data.academicYear,
        targetGroup: data.targetGroup,
      },
    });
    return { success: true, error: false, message: "Timetable posted successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to post timetable!" };
  }
};

export const deleteTimetable = async (
  currentState: ActionState,
  data: FormData
): Promise<ActionState> => {
  const startedAt = Date.now();
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return { success: false, error: true, message: "Unauthorized action." };
  }

  const id = data.get("id") as string;

  try {
    await prisma.timetable.delete({
      where: { id: parseInt(id) },
    });

    revalidatePath("/dashboard/lessons");
    revalidatePath("/dashboard/classes");
    revalidatePath("/dashboard/academics");
    await writeServerAuditLog({
      action: "timetable.delete",
      category: "academics",
      summary: `Deleted timetable ${id}`,
      durationMs: Date.now() - startedAt,
      entity: {
        type: "timetable",
        id,
      },
    });
    return { success: true, error: false, message: "Timetable deleted successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to delete timetable!" };
  }
};
