"use server";

import prisma from "../prisma";
import { revalidatePath } from "next/cache";
import { getSystemSettings } from "../settings";
import { normalizeTermValue } from "../termUtils";
import { requireStaff, requireStudentAccess } from "@/lib/security/guard";

export type SaveReportCardInput = {
  studentName: string;
  className: string;
  term: string;
  academicYear: string;
  level: string;
  savedBy?: string;
  studentId?: string;
  cardData: any; // the full JSON structure
};

/**
 * Auto-populated report card fields for a student
 */
export type ReportCardAutoFields = {
  rollNo: string;
  nextTerm: string;
  attendance: string;
  promotedTo: string;
};

/**
 * Get auto-populated report card fields for a student
 * - rollNo: Number of students in the same class
 * - nextTerm: Reopening date from settings
 * - attendance: Total present attendance records for the student
 * - promotedTo: Next class based on current class (e.g., Basic 5A → Basic 6A)
 */
export async function getReportCardAutoFields(studentId: string): Promise<{ success: boolean; data?: ReportCardAutoFields; error?: string }> {
  try {
    await requireStudentAccess(studentId);
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: true,
        grade: true,
      },
    });

    if (!student) {
      return { success: false, error: "Student not found" };
    }

    console.log(`[getReportCardAutoFields] Student: ${student.name} ${student.surname}, Class: "${student.class.name}", Grade Level: ${student.grade.level}`);

    // 1. Number on Roll: Count students in the same class
    const rollNo = await prisma.student.count({
      where: { classId: student.classId },
    });

    // 2. Next Term Begins: From settings reopeningDate
    const settings = await getSystemSettings();
    const nextTerm = settings?.reopeningDate
      ? new Date(settings.reopeningDate).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "Not set";

    // 3. Attendance: Sum of present attendance records for this student
    const attendanceCount = await prisma.attendance.count({
      where: {
        studentId,
        present: true,
      },
    });

    // 4. Promoted To: Find the next class by grade level
    const promotedTo = await getPromotedToClass(student.class, student.grade.level);

    console.log(`[getReportCardAutoFields] Auto fields: rollNo=${rollNo}, nextTerm=${nextTerm}, attendance=${attendanceCount}, promotedTo=${promotedTo}`);

    return {
      success: true,
      data: {
        rollNo: rollNo.toString(),
        nextTerm,
        attendance: attendanceCount.toString(),
        promotedTo,
      },
    };
  } catch (error) {
    console.error("Error fetching report card auto fields:", error);
    return { success: false, error: "Failed to fetch auto fields" };
  }
}

/**
 * Find the next class for promotion based on grade level
 * Looks for a class with the next grade level and similar suffix pattern
 */
async function getPromotedToClass(currentClass: { name: string; gradeId: number }, currentGradeLevel: number): Promise<string> {
  const nextGradeLevel = currentGradeLevel + 1;
  
  // Extract the suffix letter from current class name (e.g., "A" from "Basic 5A")
  const suffixMatch = currentClass.name.match(/([A-Z])$/i);
  const suffix = suffixMatch ? suffixMatch[1].toUpperCase() : null;
  
  // Find classes at the next grade level
  const nextGradeClasses = await prisma.class.findMany({
    where: {
      grade: {
        level: nextGradeLevel,
      },
    },
    include: {
      grade: true,
    },
  });
  
  console.log(`[getPromotedToClass] Current: "${currentClass.name}" (Grade ${currentGradeLevel}), Looking for Grade ${nextGradeLevel}${suffix ? ` with suffix "${suffix}"` : ''}. Found: ${nextGradeClasses.map(c => c.name).join(', ')}`);
  
  if (nextGradeClasses.length === 0) {
    // No next grade class found, use string manipulation as fallback
    const fallback = calculateNextClassName(currentClass.name);
    console.log(`[getPromotedToClass] No next grade classes found, using fallback: "${fallback}"`);
    return fallback;
  }
  
  // Try to find a class with the same suffix letter
  if (suffix) {
    const matchingClass = nextGradeClasses.find(c => c.name.endsWith(suffix));
    if (matchingClass) {
      console.log(`[getPromotedToClass] Found matching class with suffix: "${matchingClass.name}"`);
      return matchingClass.name;
    }
  }
  
  // If no exact match, return the first available class at next grade level
  const firstNextClass = nextGradeClasses[0];
  console.log(`[getPromotedToClass] Using first available next class: "${firstNextClass.name}"`);
  return firstNextClass.name;
}

/**
 * Fallback: Calculate next class name by incrementing the number in the class name
 * Handles patterns like: Basic 5A → Basic 6A, JHS 1A → JHS 2A, Basic 5 A → Basic 6 A, etc.
 */
function calculateNextClassName(currentClassName: string): string {
  // Trim any whitespace
  const className = currentClassName.trim();
  
  // Try to match patterns like "Basic 5A", "JHS 1A", "Grade 5A", "Basic 5 A", etc.
  // The regex now handles optional space before the letter suffix
  const match = className.match(/^(.*?)(\d+)\s*([A-Z]?)$/i);

  if (match) {
    const [, prefix, gradeNum, suffix] = match;
    const nextGradeNum = parseInt(gradeNum) + 1;
    // Preserve the space format if it existed
    const hasSpace = className.match(/\d+\s+[A-Z]/);
    const space = hasSpace ? ' ' : '';
    const result = `${prefix}${nextGradeNum}${suffix ? space + suffix : ''}`;
    console.log(`[calculateNextClassName] Class: "${className}" → "${result}" (prefix="${prefix}", gradeNum="${gradeNum}", suffix="${suffix}")`);
    return result;
  }

  // Fallback: Return class name with "Next" prefix if no pattern match
  console.log(`[calculateNextClassName] No match for class: "${className}", using fallback`);
  return `Next: ${className}`;
}

export async function saveReportCard(data: SaveReportCardInput) {
  try {
    await requireStaff();
    const newCard = await prisma.savedReportCard.create({
      data: {
        studentName: data.studentName,
        className: data.className,
        term: data.term,
        academicYear: data.academicYear,
        level: data.level,
        savedBy: data.savedBy,
        student: data.studentId ? { connect: { id: data.studentId } } : undefined,
        cardData: data.cardData,
      },
    });

    revalidatePath("/dashboard/teachers/report-card");
    return { success: true, data: newCard };
  } catch (error) {
    console.error("Error saving report card:", error);
    return { success: false, error: "Failed to save report card." };
  }
}

export async function getSavedReportCards() {
  try {
    await requireStaff();
    const cards = await prisma.savedReportCard.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: cards };
  } catch (error) {
    console.error("Error fetching report cards:", error);
    return { success: false, error: "Failed to fetch report cards." };
  }
}

export async function deleteSavedReportCard(id: string) {
  try {
    await requireStaff();
    await prisma.savedReportCard.delete({
      where: { id },
    });
    revalidatePath("/dashboard/teachers/report-card");
    return { success: true };
  } catch (error) {
    console.error("Error deleting report card:", error);
    return { success: false, error: "Failed to delete report card." };
  }
}

export async function updateReportCardRanks(updates: { id: string; overallPos: string }[]) {
  try {
    await requireStaff();
    for (const update of updates) {
      const card = await prisma.savedReportCard.findUnique({ where: { id: update.id } });
      if (card) {
        const cardData = card.cardData as any;
        cardData.overallPos = update.overallPos;
        await prisma.savedReportCard.update({
          where: { id: update.id },
          data: { cardData },
        });
      }
    }
    revalidatePath("/dashboard/teachers/report-card");
    return { success: true };
  } catch (error) {
    console.error("Error updating report card ranks:", error);
    return { success: false, error: "Failed to update report card ranks." };
  }
}

export async function updateReportCardSubjectPositions(
  updates: { id: string; rows: any[] }[]
) {
  try {
    await requireStaff();
    for (const update of updates) {
      const card = await prisma.savedReportCard.findUnique({ where: { id: update.id } });
      if (card) {
        const cardData = card.cardData as any;
        cardData.rows = update.rows;
        await prisma.savedReportCard.update({
          where: { id: update.id },
          data: { cardData },
        });
      }
    }
    revalidatePath("/dashboard/teachers/report-card");
    return { success: true };
  } catch (error) {
    console.error("Error updating subject positions:", error);
    return { success: false, error: "Failed to update subject positions." };
  }
}

export async function getStudentReportCards(studentId: string) {
  try {
    await requireStudentAccess(studentId);
    const cards = await prisma.savedReportCard.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: cards };
  } catch (error) {
    console.error("Error fetching student report cards:", error);
    return { success: false, error: "Failed to fetch student report cards." };
  }
}

// ─── PER-SUBJECT ENTRY ACTIONS (multi-teacher concurrency safe) ───────────

export type ReportCardEntryInput = {
  studentId: string;
  subjectName: string;
  term: string;
  academicYear: string;
  classScore: string;
  examScore: string;
  total: string;
  grade: string;
  remarks: string;
  savedBy: string;       // teacher ID
  savedByName: string;   // teacher display name
};

/**
 * Upsert per-subject score rows for a student.
 * Each row is keyed on (studentId, subjectName, term, academicYear).
 * Two teachers saving different subjects NEVER overwrite each other.
 */
export async function upsertReportCardEntries(entries: ReportCardEntryInput[]) {
  try {
    await requireStaff();
    for (const entry of entries) {
      await prisma.reportCardEntry.upsert({
        where: {
          studentId_subjectName_term_academicYear: {
            studentId: entry.studentId,
            subjectName: entry.subjectName,
            term: entry.term,
            academicYear: entry.academicYear,
          },
        },
        update: {
          classScore: entry.classScore,
          examScore: entry.examScore,
          total: entry.total,
          grade: entry.grade,
          remarks: entry.remarks,
          savedBy: entry.savedBy,
          savedByName: entry.savedByName,
        },
        create: {
          studentId: entry.studentId,
          subjectName: entry.subjectName,
          term: entry.term,
          academicYear: entry.academicYear,
          classScore: entry.classScore,
          examScore: entry.examScore,
          total: entry.total,
          grade: entry.grade,
          remarks: entry.remarks,
          savedBy: entry.savedBy,
          savedByName: entry.savedByName,
        },
      });
    }
    revalidatePath("/dashboard/teachers/report-card");
    return { success: true };
  } catch (error) {
    console.error("Error upserting report card entries:", error);
    return { success: false, error: "Failed to save report card entries." };
  }
}

/**
 * Load all per-subject entries for one student + term + year.
 * Returns a map of subjectName → entry so the UI can pre-fill scores
 * and know who saved each subject (for the lock indicator).
 */
export async function getStudentReportCardEntries(
  studentId: string,
  term: string,
  academicYear: string
) {
  try {
    await requireStudentAccess(studentId);
    const entries = await prisma.reportCardEntry.findMany({
      where: { studentId, term, academicYear },
      orderBy: { subjectName: "asc" },
    });
    return { success: true, data: entries };
  } catch (error) {
    console.error("Error fetching report card entries:", error);
    return { success: false, error: "Failed to fetch report card entries." };
  }
}

// ─── STUDENT PERFORMANCE TREND (class position across terms) ─────────────

export type StudentTermPerformance = {
  id: string;
  term: string;
  academicYear: string;
  className: string;
  position: number | null;
  positionLabel: string;
  classSize: number | null;
  average: number | null;
  savedAt: string;
};

/** Extracts the leading integer from an ordinal string like "1st", "23rd". */
function parseOrdinalPosition(overallPos: unknown): number | null {
  if (typeof overallPos !== "string") return null;
  const match = overallPos.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

type ScoreCol = { id: string; weight: number };
type ScoreRow = Record<string, string | undefined>;

/** Average percentage across subject rows, mirroring getCardTotal() in ReportCardDesigner. */
function computeCardAverage(cardData: { rows?: unknown; scoreCols?: unknown }): number | null {
  const rows: ScoreRow[] = Array.isArray(cardData?.rows) ? cardData.rows : [];
  const scoreCols: ScoreCol[] = Array.isArray(cardData?.scoreCols) ? cardData.scoreCols : [];
  if (rows.length === 0 || scoreCols.length === 0) return null;

  let subjectsWithScore = 0;
  let grandTotal = 0;
  for (const row of rows) {
    const hasAny = scoreCols.some((col) => (row[col.id] ?? "") !== "" && !isNaN(parseFloat(row[col.id] ?? "")));
    if (!hasAny) continue;
    subjectsWithScore++;
    grandTotal += scoreCols.reduce((sum, col) => {
      const v = parseFloat(row[col.id] ?? "");
      return sum + (isNaN(v) ? 0 : (v / 100) * col.weight);
    }, 0);
  }
  if (subjectsWithScore === 0) return null;
  return Math.round((grandTotal / subjectsWithScore) * 10) / 10;
}

/**
 * Builds a chronological "class position over time" series for one student, sourced
 * from saved end-of-term report cards. Terms are ordered by canonical term (One/Two/Three)
 * then academic year; when a term was saved more than once, the most recent save wins.
 */
export async function getStudentPerformanceHistory(studentId: string) {
  try {
    await requireStudentAccess(studentId);
    const cards = await prisma.savedReportCard.findMany({
      where: { studentId },
      orderBy: { createdAt: "asc" },
    });

    const byTermYear = new Map<string, StudentTermPerformance>();

    for (const card of cards) {
      const data = card.cardData as {
        reportTitle?: string;
        academicYear?: string;
        className?: string;
        overallPos?: string;
        rollNo?: string;
        rows?: unknown;
        scoreCols?: unknown;
      };
      const term = data?.reportTitle || card.term;
      const academicYear = data?.academicYear || card.academicYear;
      const key = `${normalizeTermValue(term)}||${academicYear}`;

      byTermYear.set(key, {
        id: card.id,
        term,
        academicYear,
        className: data?.className || card.className,
        position: parseOrdinalPosition(data?.overallPos),
        positionLabel: data?.overallPos || "—",
        classSize: data?.rollNo ? parseInt(data.rollNo, 10) || null : null,
        average: computeCardAverage(data),
        savedAt: card.createdAt.toISOString(),
      });
    }

    const termOrder: Record<string, number> = { One: 0, Two: 1, Three: 2 };
    const sorted = Array.from(byTermYear.values()).sort((a, b) => {
      if (a.academicYear !== b.academicYear) return a.academicYear.localeCompare(b.academicYear);
      return termOrder[normalizeTermValue(a.term)] - termOrder[normalizeTermValue(b.term)];
    });

    return { success: true, data: sorted };
  } catch (error) {
    console.error("Error building student performance history:", error);
    return { success: false, error: "Failed to load performance history." };
  }
}

/**
 * Load all per-subject entries for every student in a class for a given term.
 * Used by the class supervisor to see the full assembled picture.
 */
export async function getClassReportCardEntries(
  classId: number,
  term: string,
  academicYear: string
) {
  try {
    await requireStaff();
    const entries = await prisma.reportCardEntry.findMany({
      where: {
        term,
        academicYear,
        student: { classId },
      },
      include: {
        student: { select: { id: true, name: true, surname: true, studentId: true } },
      },
      orderBy: [{ studentId: "asc" }, { subjectName: "asc" }],
    });
    return { success: true, data: entries };
  } catch (error) {
    console.error("Error fetching class report card entries:", error);
    return { success: false, error: "Failed to fetch class entries." };
  }
}
