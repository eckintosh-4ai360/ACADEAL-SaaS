import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teachers = await prisma.teacher.findMany({
      select: {
        id: true,
        name: true,
        surname: true,
        username: true,
        staffId: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ teachers });
  } catch (error) {
    console.error("Error fetching teachers:", error);
    return NextResponse.json({ error: "Failed to fetch teachers" }, { status: 500 });
  }
}
