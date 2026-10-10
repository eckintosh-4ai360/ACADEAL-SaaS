import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { guardStaff } from "@/lib/security/guard";

export async function GET() {
  //* Staff only — this returns the whole directory, which is the raw material
  //* for credential stuffing if students or guardians can read it.
  const guard = await guardStaff();
  if (!guard.ok) {
    return guard.response;
  }

  try {
    //* Fetch students
    const students = await prisma.student.findMany({
      select: {
        id: true,
        name: true,
        surname: true,
        username: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    //* Fetch teachers
    const teachers = await prisma.teacher.findMany({
      select: {
        id: true,
        name: true,
        surname: true,
        username: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    //* Fetch parents
    const parents = await prisma.parent.findMany({
      select: {
        id: true,
        name: true,
        surname: true,
        username: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    //* Combine and format
    const users = [
      ...students.map((s) => ({ ...s, type: "STUDENT" as const })),
      ...teachers.map((t) => ({ ...t, type: "TEACHER" as const })),
      ...parents.map((p) => ({ ...p, type: "PARENT" as const })),
    ];

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

