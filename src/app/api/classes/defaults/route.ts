import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sortClassesByGrade } from "@/lib/class-management";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [classes, grades] = await Promise.all([
      prisma.class.findMany({
        select: { id: true, name: true, gradeId: true },
      }),
      prisma.grade.findMany({
        select: { id: true, level: true },
        orderBy: { level: "asc" },
      }),
    ]);

    return NextResponse.json({
      classes: sortClassesByGrade(classes, grades),
    });
  } catch (error) {
    console.error("Error loading configured classes:", error);
    return NextResponse.json(
      { error: "Failed to load classes" },
      { status: 500 }
    );
  }
}
