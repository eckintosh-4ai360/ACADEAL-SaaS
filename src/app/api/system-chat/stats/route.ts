import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getActiveStudentWhere } from "@/lib/active-students";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user ? (session.user as { role?: string }).role : undefined;

    if (!session?.user || !["admin", "teacher"].includes(role || "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeStudentWhere = await getActiveStudentWhere();

    const [students, parents, classes] = await Promise.all([
      prisma.student.count({ where: activeStudentWhere }),
      prisma.parent.count(),
      prisma.class.count(),
    ]);

    return NextResponse.json({ students, parents, classes });
  } catch {
    return NextResponse.json({ students: 0, parents: 0, classes: 0 });
  }
}

export const dynamic = "force-dynamic";
