/**
 * app/api/sync/push/route.ts
 *
 * Receives batches of SyncQueueItems from the client and applies them
 * to PostgreSQL via Prisma using last-write-wins conflict resolution.
 *
 * POST /api/sync/push
 * Body: { items: SyncQueueItem[] }
 * Response: { synced: string[], failed: { id, error }[] }
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { deleteStaffProfile, upsertStaffProfile } from "@/lib/staff";
import { getCurrentFeePeriod } from "@/lib/feePeriod";

// ─── Zod validation schema ────────────────────────────────────────────────────

const SyncOperationSchema = z.enum(["create", "update", "delete"]);
const SyncTableSchema = z.enum([
  "students",
  "teachers",
  "attendance",
  "fees",
  "announcements",
  "events",
  "results",
]);

const SyncQueueItemSchema = z.object({
  id: z.string().uuid(),
  table: SyncTableSchema,
  operation: SyncOperationSchema,
  payload: z.record(z.string(), z.unknown()),
  createdAt: z.number().int().positive(),
  attempts: z.number().int().min(0),
  lastError: z.string().nullable(),
});

const PushBodySchema = z.object({
  items: z.array(SyncQueueItemSchema).min(1).max(50),
});

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<NextResponse> {
  // Auth check — only logged-in users can push
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch (authError) {
    console.error("[sync/push] Auth error:", authError);
    return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
  }

  // Parse and validate body
  let body: z.infer<typeof PushBodySchema>;
  try {
    const raw = await request.json();
    const parsed = PushBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    body = parsed.data;
  } catch (parseError) {
    console.error("[sync/push] Body parse error:", parseError);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const synced: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];

  // Process each item individually so partial success is possible
  for (const item of body.items) {
    try {
      await applyItem(item);
      synced.push(item.id);
    } catch (itemError) {
      const message = itemError instanceof Error ? itemError.message : String(itemError);
      console.error(`[sync/push] Failed to apply item ${item.id} (${item.table}/${item.operation}):`, message);
      failed.push({ id: item.id, error: message });
    }
  }

  return NextResponse.json({ synced, failed });
}

// ─── Per-item application with last-write-wins ────────────────────────────────

async function applyItem(item: z.infer<typeof SyncQueueItemSchema>): Promise<void> {
  const { table, operation, payload } = item;

  switch (table) {
    case "students":
      await applyStudent(operation, payload);
      break;
    case "attendance":
      await applyAttendance(operation, payload);
      break;
    case "fees":
      await applyFee(operation, payload);
      break;
    case "teachers":
      await applyTeacher(operation, payload);
      break;
    default:
      // For other tables: just skip gracefully
      console.warn(`[sync/push] Table "${table}" not yet handled in push route`);
      break;
  }
}

// ─── Table-specific handlers ──────────────────────────────────────────────────

async function applyStudent(
  operation: string,
  payload: Record<string, unknown>
): Promise<void> {
  if (operation === "delete") {
    const id = String(payload.id ?? "");
    if (!id) throw new Error("Missing id for student delete");
    await prisma.student.deleteMany({ where: { id } });
    return;
  }

  const id = String(payload.id ?? "");
  const incomingUpdatedAt = Number(payload.updatedAt ?? 0);
  if (!id) throw new Error("Missing id for student upsert");

  // Last-write-wins: check server record timestamp
  const existing = await prisma.student.findUnique({
    where: { id },
    select: { id: true, updatedAt: true },
  });

  if (existing) {
    const serverMs = existing.updatedAt instanceof Date
      ? existing.updatedAt.getTime()
      : Number(existing.updatedAt);
    // If server record is newer, skip (server wins)
    if (serverMs > incomingUpdatedAt) return;
  }

  // Build update data: only include defined fields
  const data: Record<string, unknown> = {
    updatedAt: new Date(incomingUpdatedAt),
  };

  const stringFields = ["name", "surname", "username", "address", "bloodType", "img", "studentId"] as const;
  const nullableStrings = ["email", "phone", "parentId"] as const;

  for (const f of stringFields) {
    if (payload[f] !== undefined) data[f] = String(payload[f]);
  }
  for (const f of nullableStrings) {
    if (payload[f] !== undefined) data[f] = payload[f] === null ? null : String(payload[f]);
  }
  if (payload.sex !== undefined) {
    data.sex = payload.sex === "FEMALE" ? "FEMALE" : "MALE";
  }
  if (payload.birthday !== undefined) {
    data.birthday = payload.birthday ? new Date(String(payload.birthday)) : null;
  }
  if (payload.gradeId !== undefined) {
    data.gradeId = payload.gradeId === null ? null : Number(payload.gradeId);
  }
  if (payload.classId !== undefined) {
    data.classId = payload.classId === null ? null : Number(payload.classId);
  }

  if (operation === "create" && !existing) {
    // Create requires more required fields — provide defaults for missing ones
    const createData = {
      ...(data as Prisma.StudentUncheckedCreateInput),
      id,
      name:
        typeof data.name === "string"
          ? data.name
          : String(payload.name ?? ""),
      surname:
        typeof data.surname === "string"
          ? data.surname
          : String(payload.surname ?? ""),
      username:
        typeof data.username === "string"
          ? data.username
          : String(payload.username ?? id),
      sex:
        data.sex === "FEMALE" || data.sex === "MALE"
          ? data.sex
          : payload.sex === "FEMALE"
            ? "FEMALE"
            : "MALE",
      bloodType:
        typeof data.bloodType === "string"
          ? data.bloodType
          : String(payload.bloodType ?? ""),
      birthday:
        data.birthday instanceof Date
          ? data.birthday
          : payload.birthday
            ? new Date(String(payload.birthday))
            : new Date(),
    } satisfies Prisma.StudentUncheckedCreateInput;

    await prisma.student.create({
      data: createData,
    });
  } else if (existing) {
    await prisma.student.update({
      where: { id },
      data: data as Prisma.StudentUncheckedUpdateInput,
    });
  }
}

async function applyAttendance(
  operation: string,
  payload: Record<string, unknown>
): Promise<void> {
  const studentId = String(payload.studentId ?? "");
  const lessonId = Number(payload.lessonId ?? 0);
  const date = payload.date ? new Date(String(payload.date)) : new Date();
  const present = Boolean(payload.present);

  if (operation === "delete") {
    // Attendance has no UUID — find by composite key and delete
    await prisma.attendance.deleteMany({ where: { studentId, lessonId } });
    return;
  }

  // Upsert by composite key (studentId + lessonId) — no updatedAt on Attendance model
  // Simply overwrite existing record (last writer wins by nature of the upsert)
  const existing = await prisma.attendance.findFirst({
    where: { studentId, lessonId },
    select: { id: true },
  });

  if (existing) {
    await prisma.attendance.update({
      where: { id: existing.id },
      data: { present, date },
    });
  } else {
    await prisma.attendance.create({
      data: { studentId, lessonId, date, present },
    });
  }
}

async function applyFee(
  operation: string,
  payload: Record<string, unknown>
): Promise<void> {
  // Note: Fee.id is an Int (autoincrement) in Prisma — not a UUID.
  // The local `id` in the payload is a local UUID generated client-side.
  // We use `localId` stored in payload to find by studentId+title if serverId is missing.
  const serverIdRaw = payload.serverId; // set after first successful sync
  const serverId = serverIdRaw ? Number(serverIdRaw) : null;
  const incomingUpdatedAt = Number(payload.updatedAt ?? 0);

  const studentId = String(payload.studentId ?? "");
  const title = String(payload.title ?? "");
  const status = String(payload.status ?? "PENDING") as "PENDING" | "PAID" | "OVERDUE";
  const amount = Number(payload.amount ?? 0);
  const dueDate = payload.dueDate ? new Date(String(payload.dueDate)) : new Date();
  const description = payload.description ? String(payload.description) : null;

  if (operation === "delete" && serverId) {
    await prisma.fee.deleteMany({ where: { id: serverId } });
    return;
  }

  if (serverId) {
    // Last-write-wins check using server id
    const existing = await prisma.fee.findUnique({
      where: { id: serverId },
      select: { id: true, updatedAt: true },
    });

    if (existing) {
      const serverMs = existing.updatedAt instanceof Date
        ? existing.updatedAt.getTime()
        : Number(existing.updatedAt);
      if (serverMs > incomingUpdatedAt) return;
      await prisma.fee.update({
        where: { id: serverId },
        data: { status, amount, title, dueDate, description, updatedAt: new Date(incomingUpdatedAt) },
      });
      return;
    }
  }

  // No serverId — create a new fee record
  if (operation !== "delete") {
    //* A fee raised offline belongs to the term it is synced into. Without the
    //* stamp it matches no filter on the Fees table and arrives invisible.
    const period = await getCurrentFeePeriod();
    await prisma.fee.create({
      data: {
        studentId,
        title,
        description,
        amount,
        status,
        dueDate,
        term: period.term,
        academicYear: period.academicYear,
        updatedAt: new Date(incomingUpdatedAt),
      },
    });
  }
}

async function applyTeacher(
  operation: string,
  payload: Record<string, unknown>
): Promise<void> {
  if (operation === "delete") {
    const id = String(payload.id ?? "");
    if (!id) throw new Error("Missing id for teacher delete");
    const existingTeacher = await prisma.teacher.findUnique({
      where: { id },
      select: {
        staffId: true,
        staffProfileId: true,
      },
    });

    await prisma.teacher.deleteMany({ where: { id } });
    await deleteStaffProfile(prisma, {
      staffId: existingTeacher?.staffId,
      staffProfileId: existingTeacher?.staffProfileId,
    });
    return;
  }

  const id = String(payload.id ?? "");
  const incomingUpdatedAt = Number(payload.updatedAt ?? 0);
  if (!id) throw new Error("Missing id for teacher upsert");

  const existing = await prisma.teacher.findUnique({
    where: { id },
    select: { id: true, updatedAt: true },
  });

  if (existing) {
    const serverMs = existing.updatedAt instanceof Date
      ? existing.updatedAt.getTime()
      : Number(existing.updatedAt);
    if (serverMs > incomingUpdatedAt) return;
    const teacher = await prisma.teacher.update({
      where: { id },
      data: {
        name: payload.name ? String(payload.name) : undefined,
        surname: payload.surname ? String(payload.surname) : undefined,
        phone: payload.phone ? String(payload.phone) : undefined,
        // address is non-nullable in schema — only update if provided
        ...(payload.address !== undefined && { address: String(payload.address ?? "") }),
        img: payload.img ? String(payload.img) : undefined,
        updatedAt: new Date(incomingUpdatedAt),
      },
      select: {
        id: true,
        username: true,
        staffId: true,
        password: true,
        name: true,
        surname: true,
        email: true,
        phone: true,
        address: true,
        img: true,
        sex: true,
        birthday: true,
        permissions: true,
      },
    });

    await upsertStaffProfile(prisma, {
      staffId: teacher.staffId,
      username: teacher.username,
      password: teacher.password,
      name: teacher.name,
      surname: teacher.surname,
      email: teacher.email ?? null,
      phone: teacher.phone ?? null,
      address: teacher.address,
      img: teacher.img ?? null,
      sex: teacher.sex,
      birthday: teacher.birthday,
      permissions: teacher.permissions ?? null,
      staffType: "TEACHER",
    });
  }
  // We don't auto-create teachers from client — they must be created server-side
}

