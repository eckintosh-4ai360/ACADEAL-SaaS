/**
 * app/api/sync/pull/route.ts
 *
 * Returns server records updated after a given timestamp for a given table.
 * Used for initial hydration and periodic refresh.
 *
 * GET /api/sync/pull?table=students&since=<unix_ms>
 * Response: { records: unknown[], table: string, pulledAt: number }
 */

import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ─── Validation ───────────────────────────────────────────────────────────────

const QuerySchema = z.object({
  table: z.enum(["students", "teachers", "attendance", "fees", "announcements", "events", "results"]),
  // Use coerce for clean number parsing from URL query params
  since: z.coerce.number().int().nonnegative().default(0),
  limit: z.coerce.number().int().positive().max(1000).default(500),
});

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch (authError) {
    console.error("[sync/pull] Auth error:", authError);
    return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
  }

  const rawParams: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    rawParams[key] = value;
  });

  const parsed = QuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query params", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { table, since, limit } = parsed.data;
  const sinceDate = new Date(since);
  const pulledAt = Date.now();

  try {
    const records = await fetchTable(table, sinceDate, limit);
    return NextResponse.json({ records, table, pulledAt, count: records.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[sync/pull] Error fetching ${table}:`, message);
    return NextResponse.json({ error: "Failed to fetch records" }, { status: 500 });
  }
}

// ─── Table fetchers ───────────────────────────────────────────────────────────

async function fetchTable(
  table: string,
  since: Date,
  limit: number
): Promise<unknown[]> {
  switch (table) {
    case "students":
      return prisma.student.findMany({
        where: { updatedAt: { gt: since } },
        take: limit,
        orderBy: { updatedAt: "asc" },
        select: {
          id: true, name: true, surname: true, username: true,
          email: true, phone: true, address: true, sex: true,
          bloodType: true, birthday: true, gradeId: true,
          classId: true, parentId: true, studentId: true,
          img: true, updatedAt: true,
        },
      });

    case "teachers":
      // Note: Teacher has no bloodType field in the Prisma schema
      return prisma.teacher.findMany({
        where: { updatedAt: { gt: since } },
        take: limit,
        orderBy: { updatedAt: "asc" },
        select: {
          id: true, name: true, surname: true, username: true,
          email: true, phone: true, address: true, sex: true,
          birthday: true, img: true, updatedAt: true,
        },
      });

    case "attendance":
      // Attendance has no updatedAt field — filter by date instead
      return prisma.attendance.findMany({
        where: { date: { gt: since } },
        take: limit,
        orderBy: { date: "asc" },
        select: {
          // id is Int in schema (not UUID)
          id: true, studentId: true, lessonId: true,
          date: true, present: true,
        },
      });

    case "fees":
      // Note: Fee has no paidAt field in the Prisma schema
      return prisma.fee.findMany({
        where: { updatedAt: { gt: since } },
        take: limit,
        orderBy: { updatedAt: "asc" },
        select: {
          id: true, studentId: true, title: true, description: true,
          amount: true, status: true, dueDate: true, updatedAt: true,
        },
      });

    case "announcements":
      return prisma.announcement.findMany({
        where: { date: { gt: since } },
        take: limit,
        orderBy: { date: "desc" },
        select: {
          id: true, title: true, description: true, date: true, classId: true,
        },
      });

    case "events":
      return prisma.event.findMany({
        where: { startTime: { gte: new Date() } },
        take: limit,
        orderBy: { startTime: "asc" },
        select: {
          id: true, title: true, description: true,
          startTime: true, endTime: true, classId: true,
        },
      });

    case "results":
      return prisma.result.findMany({
        where: { id: { gt: 0 } },
        take: limit,
        orderBy: { id: "desc" },
        select: {
          id: true, score: true, studentId: true,
          examId: true, assignmentId: true,
        },
      });

    default:
      return [];
  }
}
