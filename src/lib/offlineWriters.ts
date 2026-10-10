/**
 * lib/offlineWriters.ts — Piece 3: Write Operations
 *
 * ALL writes go to IndexedDB first. Network is never touched.
 * Each function:
 *   1. Generates/preserves UUID
 *   2. Sets updatedAt = Date.now(), synced = false
 *   3. Writes to Dexie (try/catch)
 *   4. Enqueues a SyncQueueItem
 *   5. Returns the local record immediately — UI never waits
 */

"use client";

import {
  db,
  type LocalAttendance,
  type LocalFee,
  type LocalStudent,
  type SyncOperation,
  type SyncTable,
} from "@/lib/db";

// ─── Internal helper ──────────────────────────────────────────────────────────

async function enqueue(
  table: SyncTable,
  operation: SyncOperation,
  payload: Record<string, unknown>
): Promise<void> {
  const item = {
    id: crypto.randomUUID(),
    table,
    operation,
    payload,
    createdAt: Date.now(),
    attempts: 0,
    lastError: null,
  };
  try {
    await db.syncQueue.put(item);
  } catch (error) {
    console.error(`[SyncQueue] Failed to enqueue ${operation} on ${table}:`, error);
  }
}

// ─── Student ──────────────────────────────────────────────────────────────────

/**
 * Write a student record locally first, then queue for server sync.
 * Pass `{ id }` of an existing student to update it.
 * Omit `id` to create a new student with a fresh UUID.
 */
export async function writeStudent(
  partial: Partial<LocalStudent>
): Promise<LocalStudent> {
  const existing = partial.id ? await db.students.get(partial.id) : undefined;
  const operation: SyncOperation = existing ? "update" : "create";

  const record: LocalStudent = {
    id: partial.id ?? crypto.randomUUID(),
    name: partial.name ?? existing?.name ?? "",
    surname: partial.surname ?? existing?.surname ?? "",
    username: partial.username ?? existing?.username ?? "",
    email: partial.email ?? existing?.email ?? null,
    phone: partial.phone ?? existing?.phone ?? null,
    address: partial.address ?? existing?.address ?? null,
    sex: partial.sex ?? existing?.sex ?? "MALE",
    bloodType: partial.bloodType ?? existing?.bloodType ?? null,
    birthday: partial.birthday ?? existing?.birthday ?? null,
    gradeId: partial.gradeId ?? existing?.gradeId ?? null,
    classId: partial.classId ?? existing?.classId ?? null,
    parentId: partial.parentId ?? existing?.parentId ?? null,
    studentId: partial.studentId ?? existing?.studentId ?? null,
    img: partial.img ?? existing?.img ?? null,
    updatedAt: Date.now(),
    synced: false,
  };

  try {
    await db.students.put(record);
    await enqueue("students", operation, record as unknown as Record<string, unknown>);
  } catch (error) {
    console.error("[offlineWriters] writeStudent failed:", error);
    throw error;
  }

  return record;
}

// ─── Attendance ───────────────────────────────────────────────────────────────

/**
 * Write an attendance record locally first, then queue for server sync.
 */
export async function writeAttendance(
  partial: Partial<LocalAttendance>
): Promise<LocalAttendance> {
  const existing = partial.id ? await db.attendance.get(partial.id) : undefined;
  const operation: SyncOperation = existing ? "update" : "create";

  const record: LocalAttendance = {
    id: partial.id ?? crypto.randomUUID(),
    studentId: partial.studentId ?? existing?.studentId ?? "",
    lessonId: partial.lessonId ?? existing?.lessonId ?? 0,
    date: partial.date ?? existing?.date ?? new Date().toISOString().split("T")[0],
    present: partial.present ?? existing?.present ?? false,
    updatedAt: Date.now(),
    synced: false,
  };

  try {
    await db.attendance.put(record);
    await enqueue("attendance", operation, record as unknown as Record<string, unknown>);
  } catch (error) {
    console.error("[offlineWriters] writeAttendance failed:", error);
    throw error;
  }

  return record;
}

/**
 * Bulk-write attendance for a full lesson (e.g., taking attendance for a class).
 * Uses Dexie bulkPut for efficiency.
 */
export async function writeBulkAttendance(
  records: Partial<LocalAttendance>[]
): Promise<LocalAttendance[]> {
  const now = Date.now();

  const built: LocalAttendance[] = records.map((r) => ({
    id: r.id ?? crypto.randomUUID(),
    studentId: r.studentId ?? "",
    lessonId: r.lessonId ?? 0,
    date: r.date ?? new Date().toISOString().split("T")[0],
    present: r.present ?? false,
    updatedAt: now,
    synced: false,
  }));

  try {
    await db.attendance.bulkPut(built);

    // Enqueue all as individual sync items
    const queueItems = built.map((rec) => ({
      id: crypto.randomUUID(),
      table: "attendance" as SyncTable,
      operation: "update" as SyncOperation,
      payload: rec as unknown as Record<string, unknown>,
      createdAt: now,
      attempts: 0,
      lastError: null,
    }));
    await db.syncQueue.bulkPut(queueItems);
  } catch (error) {
    console.error("[offlineWriters] writeBulkAttendance failed:", error);
    throw error;
  }

  return built;
}

// ─── Fees ─────────────────────────────────────────────────────────────────────

/**
 * Write a fee record locally first, then queue for server sync.
 */
export async function writeFee(
  partial: Partial<LocalFee>
): Promise<LocalFee> {
  const existing = partial.id ? await db.fees.get(partial.id) : undefined;
  const operation: SyncOperation = existing ? "update" : "create";

  const record: LocalFee = {
    id: partial.id ?? crypto.randomUUID(),
    studentId: partial.studentId ?? existing?.studentId ?? "",
    title: partial.title ?? existing?.title ?? "",
    description: partial.description ?? existing?.description ?? null,
    amount: partial.amount ?? existing?.amount ?? 0,
    status: partial.status ?? existing?.status ?? "PENDING",
    dueDate: partial.dueDate ?? existing?.dueDate ?? new Date().toISOString().split("T")[0],
    paidAt: partial.paidAt ?? existing?.paidAt ?? null,
    updatedAt: Date.now(),
    synced: false,
  };

  try {
    await db.fees.put(record);
    await enqueue("fees", operation, record as unknown as Record<string, unknown>);
  } catch (error) {
    console.error("[offlineWriters] writeFee failed:", error);
    throw error;
  }

  return record;
}

// ─── Generic delete ───────────────────────────────────────────────────────────

/**
 * Delete a record from IndexedDB and enqueue the deletion for server sync.
 */
export async function deleteRecord(
  table: "students" | "attendance" | "fees",
  id: string
): Promise<void> {
  try {
    await db[table].delete(id);
    await enqueue(table as SyncTable, "delete", { id });
  } catch (error) {
    console.error(`[offlineWriters] deleteRecord(${table}, ${id}) failed:`, error);
    throw error;
  }
}
