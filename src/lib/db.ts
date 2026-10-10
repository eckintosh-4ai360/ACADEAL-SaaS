/**
 * lib/db.ts — IndexedDB layer via Dexie (Piece 2)
 *
 * All interfaces are exported for use across the app.
 * All IDs are UUIDs (crypto.randomUUID()).
 * All timestamps are Unix milliseconds (Date.now()).
 * The `synced` field is always a boolean — never undefined.
 */

import Dexie, { type Table } from "dexie";

// ─── Exported Interfaces ─────────────────────────────────────────────────────

export interface LocalStudent {
  id: string;
  name: string;
  surname: string;
  username: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  sex: "MALE" | "FEMALE";
  bloodType: string | null;
  birthday: string | null; // ISO date string
  gradeId: number | null;
  classId: number | null;
  parentId: string | null;
  studentId: string | null;
  img: string | null;
  updatedAt: number; // Unix milliseconds
  synced: boolean;
}

export interface LocalTeacher {
  id: string;
  name: string;
  surname: string;
  username: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  sex: "MALE" | "FEMALE";
  bloodType: string | null;
  birthday: string | null;
  img: string | null;
  updatedAt: number;
  synced: boolean;
}

export interface LocalAttendance {
  id: string;
  studentId: string;
  lessonId: number;
  date: string; // ISO date string "YYYY-MM-DD"
  present: boolean;
  updatedAt: number;
  synced: boolean;
}

export interface LocalFee {
  id: string;
  studentId: string;
  title: string;
  description: string | null;
  amount: number;
  status: "PENDING" | "PAID" | "OVERDUE";
  dueDate: string; // ISO date string
  paidAt: string | null;
  updatedAt: number;
  synced: boolean;
}

export interface LocalAnnouncement {
  id: number;
  title: string;
  description: string;
  date: string;
  classId: number | null;
  updatedAt: number;
  synced: boolean;
}

export interface LocalEvent {
  id: number;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  classId: number | null;
  updatedAt: number;
  synced: boolean;
}

export interface LocalResult {
  id: number;
  score: number;
  studentId: string;
  examId: number | null;
  assignmentId: number | null;
  updatedAt: number;
  synced: boolean;
}

export type SyncOperation = "create" | "update" | "delete";
export type SyncTable =
  | "students"
  | "teachers"
  | "attendance"
  | "fees"
  | "announcements"
  | "events"
  | "results";

export interface SyncQueueItem {
  id: string; // UUID
  table: SyncTable;
  operation: SyncOperation;
  payload: Record<string, unknown>;
  createdAt: number; // Unix milliseconds
  attempts: number;
  lastError: string | null;
}

// ─── Dexie Database Class ─────────────────────────────────────────────────────

class AppDB extends Dexie {
  students!: Table<LocalStudent, string>;
  teachers!: Table<LocalTeacher, string>;
  attendance!: Table<LocalAttendance, string>;
  fees!: Table<LocalFee, string>;
  announcements!: Table<LocalAnnouncement, number>;
  events!: Table<LocalEvent, number>;
  results!: Table<LocalResult, number>;
  syncQueue!: Table<SyncQueueItem, string>;

  constructor() {
    super("EckintoshAppDB");

    this.version(1).stores({
      // Primary key is first, then indexed fields
      students: "id, username, gradeId, classId, synced, updatedAt",
      teachers: "id, username, synced, updatedAt",
      attendance: "id, studentId, lessonId, date, synced, updatedAt",
      fees: "id, studentId, status, dueDate, synced, updatedAt",
      announcements: "id, classId, synced, updatedAt",
      events: "id, classId, startTime, synced, updatedAt",
      results: "id, studentId, examId, assignmentId, synced, updatedAt",
      syncQueue: "id, table, createdAt, attempts",
    });
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

/**
 * The global IndexedDB instance. Only instantiated client-side.
 * Never import this in server components or API routes.
 */
export const db = new AppDB();
