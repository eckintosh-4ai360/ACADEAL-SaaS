"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import prisma from "./prisma";
import { isMissingDatabaseColumnError, isMissingDatabaseObjectError } from "./prisma-errors";
import { isEntitlementError, requireStudentCapacity } from "./entitlements";
import { getActiveStudentWhere } from "./active-students";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import {
  StudentSchema,
  TeacherSchema,
  ClassSchema,
  SchoolClassStructureSchema,
  SubjectSchema,
  ExamSchema,
  ParentSchema,
  LessonSchema,
  AssignmentSchema,
  ResultSchema,
  AttendanceSchema,
  EventSchema,
  AnnouncementSchema,
  FeeSchema,
  ExcursionCampaignSchema,
  ExcursionPaymentSchema,
  FeeCollectionCampaignSchema,
  FeeCollectionPaymentSchema,
  AdminSchema,
  TimetableSchema,
} from "./formValidationSchemas";
import {
  parseObjectiveFile,
  extractTextFromFile,
  parseObjectiveQuestionsFromText,
  ParsedObjectiveQuestion,
} from "./objective-parser";
import { authOptions } from "./auth";
import { sendAnnouncementSMS, sendEventSMS, sendParentCredentialsSMS, sendStaffCredentialsSMS } from "./sms";
import { sendParentCredentialsEmail } from "./email";
import { resolveCurrentAppBaseUrl } from "./app-url";
import { runAfterResponse } from "./after-response";
import { getSystemSettings } from "./settings";
import { getCurrentFeePeriod } from "./feePeriod";
import {
  buildSchoolClassDefinitions,
  getClassStreamSection,
  getGradeLabel,
  sortClassesByGrade,
} from "./class-management";
import { DEFAULT_CLASS_CAPACITY } from "./default-class-definitions";
import { encodeTermBillScope } from "./termBillScope";
import { assignBilledFeesToNewStudents } from "./fee-assignment";
import {
  ADMIN_STAFF_ID_PREFIX,
  PARENT_USER_ID_PREFIX,
  TEACHER_STAFF_ID_PREFIX,
  buildSequentialId,
  parseSequentialIdValue,
} from "./userIds";
import { writeServerAuditLog } from "./audit-server";
import {
  DEFAULT_USER_PERMISSIONS,
  normalizeUserPermissions,
  type UserPermissions,
} from "./user-permissions";
import { deleteStaffProfile, upsertStaffProfile } from "./staff";
import {
  requireAdmin,
  requireFeeAccess,
  requireFeeEditAccess,
  requireRecordStudentsAccess,
  requireSelfOrAdmin,
  requireSession,
  requireStaff,
  requireSuperAdmin,
  requireStudentAccess,
  toActionFailure,
} from "@/lib/security/guard";
import { generateTemporaryPassword, DEFAULT_TEACHER_PASSWORD, DEFAULT_PARENT_PASSWORD } from "@/lib/security/passwords";

type ActionState = { success: boolean; error: boolean; message?: string };

type ClassSubjectTeacherAssignmentsPayload = {
  classId: number;
  assignments: {
    subjectId: number;
    teacherId: string;
  }[];
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

async function writeActionAuditLog(params: {
  startedAt: number;
  action: string;
  category: string;
  summary: string;
  status?: "SUCCESS" | "FAILURE";
  entity?: {
    type?: string | null;
    id?: string | number | null;
    label?: string | null;
  };
  metadata?: Record<string, unknown>;
}) {
  await writeServerAuditLog({
    action: params.action,
    category: params.category,
    summary: params.summary,
    status: params.status ?? "SUCCESS",
    entity: params.entity,
    metadata: params.metadata,
    durationMs: Date.now() - params.startedAt,
  });
}

function getUniqueConstraintField(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;

  const code = (err as { code?: unknown }).code;
  if (code !== "P2002") return null;

  const metaTarget = (err as { meta?: { target?: unknown } }).meta?.target;
  if (Array.isArray(metaTarget) && metaTarget.length > 0) {
    const first = metaTarget[0];
    if (typeof first === "string") return first;
  }
  if (typeof metaTarget === "string") return metaTarget;

  return "unknown";
}

async function deleteExamsWithDependencies(
  tx: Prisma.TransactionClient,
  examIds: number[]
) {
  if (examIds.length === 0) return;

  const examQuestions = await tx.examQuestion.findMany({
    where: {
      examId: { in: examIds },
    },
    select: {
      id: true,
    },
  });

  const examQuestionIds = examQuestions.map((question) => question.id);

  if (examQuestionIds.length > 0) {
    await tx.studentExamAnswer.deleteMany({
      where: {
        questionId: { in: examQuestionIds },
      },
    });

    await tx.examQuestionOption.deleteMany({
      where: {
        questionId: { in: examQuestionIds },
      },
    });

    await tx.examQuestion.deleteMany({
      where: {
        id: { in: examQuestionIds },
      },
    });
  }

  await tx.result.deleteMany({
    where: {
      examId: { in: examIds },
    },
  });

  await tx.exam.deleteMany({
    where: {
      id: { in: examIds },
    },
  });
}

async function deleteAssignmentsWithDependencies(
  tx: Prisma.TransactionClient,
  assignmentIds: number[]
) {
  if (assignmentIds.length === 0) return;

  const assignmentQuestions = await tx.assignmentQuestion.findMany({
    where: {
      assignmentId: { in: assignmentIds },
    },
    select: {
      id: true,
    },
  });

  const assignmentQuestionIds = assignmentQuestions.map((question) => question.id);

  if (assignmentQuestionIds.length > 0) {
    await tx.studentAnswer.deleteMany({
      where: {
        questionId: { in: assignmentQuestionIds },
      },
    });

    await tx.questionOption.deleteMany({
      where: {
        questionId: { in: assignmentQuestionIds },
      },
    });

    await tx.assignmentQuestion.deleteMany({
      where: {
        id: { in: assignmentQuestionIds },
      },
    });
  }

  await tx.result.deleteMany({
    where: {
      assignmentId: { in: assignmentIds },
    },
  });

  await tx.assignment.deleteMany({
    where: {
      id: { in: assignmentIds },
    },
  });
}

async function generateTeacherStaffId() {
  const lastTeacher = await prisma.teacher.findFirst({
    where: { staffId: { startsWith: TEACHER_STAFF_ID_PREFIX } },
    orderBy: { createdAt: "desc" },
    select: { staffId: true },
  });

  const nextNumber = parseSequentialIdValue(
    lastTeacher?.staffId,
    TEACHER_STAFF_ID_PREFIX
  );

  return buildSequentialId(TEACHER_STAFF_ID_PREFIX, nextNumber);
}

async function generateAdminStaffId() {
  const lastAdmin = await prisma.admin.findFirst({
    where: { staffId: { startsWith: ADMIN_STAFF_ID_PREFIX } },
    orderBy: { createdAt: "desc" },
    select: { staffId: true },
  });

  const nextNumber = parseSequentialIdValue(
    lastAdmin?.staffId,
    ADMIN_STAFF_ID_PREFIX
  );

  return buildSequentialId(ADMIN_STAFF_ID_PREFIX, nextNumber);
}

async function generateParentUserId() {
  const lastParent = await prisma.parent.findFirst({
    where: { parentUserId: { startsWith: PARENT_USER_ID_PREFIX } },
    orderBy: { createdAt: "desc" },
    select: { parentUserId: true },
  });

  const nextNumber = parseSequentialIdValue(
    lastParent?.parentUserId,
    PARENT_USER_ID_PREFIX
  );

  return buildSequentialId(PARENT_USER_ID_PREFIX, nextNumber);
}

async function syncTeacherStaffProfile(
  db: Prisma.TransactionClient | typeof prisma,
  teacher: {
    id: string;
    username: string;
    staffId: string;
    staffProfileId?: string | null;
    password: string;
    name: string;
    surname: string;
    email?: string | null;
    phone?: string | null;
    address: string;
    img?: string | null;
    sex: "MALE" | "FEMALE";
    birthday: Date;
    permissions?: unknown;
  }
) {
  const staffProfile = await upsertStaffProfile(db, {
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

  if (staffProfile && teacher.staffProfileId !== staffProfile.id) {
    await db.teacher.update({
      where: { id: teacher.id },
      data: { staffProfileId: staffProfile.id },
    });
  }
}

async function syncAdminStaffProfile(
  db: Prisma.TransactionClient | typeof prisma,
  admin: {
    id: string;
    username: string;
    staffId: string;
    staffProfileId?: string | null;
    password: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    img?: string | null;
    role: "SUPER_ADMIN" | "ADMIN";
    permissions?: unknown;
  }
) {
  const staffProfile = await upsertStaffProfile(db, {
    staffId: admin.staffId,
    username: admin.username,
    password: admin.password,
    name: admin.name,
    surname: null,
    email: admin.email ?? null,
    phone: admin.phone ?? null,
    address: null,
    img: admin.img ?? null,
    sex: null,
    birthday: null,
    permissions: admin.permissions ?? null,
    staffType: "ADMIN",
    adminRole: admin.role,
  });

  if (staffProfile && admin.staffProfileId !== staffProfile.id) {
    await db.admin.update({
      where: { id: admin.id },
      data: { staffProfileId: staffProfile.id },
    });
  }
}

//! USER PERMISSION ACTIONS

export async function saveUserPermissions(
  userId: string,
  userType: "admin" | "teacher",
  permissions: UserPermissions
): Promise<ActionState> {
  const startedAt = Date.now();
  try {
    //* Only SUPER_ADMIN can modify permissions
    const session = await getServerSession(authOptions);
    if (
      !session ||
      session.user.role !== "admin" ||
      (session.user as { adminRole?: string }).adminRole !== "SUPER_ADMIN"
    ) {
      return { success: false, error: true, message: "Unauthorized: Only Super Admins can manage permissions." };
    }

    await prisma.$transaction(async (tx) => {
      if (userType === "admin") {
        const admin = await tx.admin.update({
          where: { id: userId },
          data: { permissions: permissions as object },
          select: {
            id: true,
            username: true,
            staffId: true,
            staffProfileId: true,
            password: true,
            name: true,
            email: true,
            phone: true,
            img: true,
            role: true,
            permissions: true,
          },
        });

        await syncAdminStaffProfile(tx, admin);
      } else {
        const teacher = await tx.teacher.update({
          where: { id: userId },
          data: { permissions: permissions as object },
          select: {
            id: true,
            username: true,
            staffId: true,
            staffProfileId: true,
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

        await syncTeacherStaffProfile(tx, teacher);
      }
    });

    revalidatePath("/dashboard/settings");
    await writeActionAuditLog({
      startedAt,
      action: "user.permissions.update",
      category: "user_management",
      summary: `Updated permissions for ${userType} ${userId}`,
      entity: { type: userType, id: userId },
      metadata: { permissions },
    });
    return { success: true, error: false, message: "Permissions updated successfully!" };
  } catch (err) {
    console.error(err);
    if (isMissingDatabaseColumnError(err)) {
      return {
        success: false,
        error: true,
        message:
          "Permissions storage is not ready in this tenant database yet. Apply the latest Prisma migration and try again.",
      };
    }

    return { success: false, error: true, message: "Failed to update permissions." };
  }
}

export async function saveAllTeachersPermissions(
  permissions: UserPermissions
): Promise<ActionState> {
  const startedAt = Date.now();
  try {
    //* Only SUPER_ADMIN can modify permissions
    const session = await getServerSession(authOptions);
    if (
      !session ||
      session.user.role !== "admin" ||
      (session.user as { adminRole?: string }).adminRole !== "SUPER_ADMIN"
    ) {
      return { success: false, error: true, message: "Unauthorized: Only Super Admins can manage permissions." };
    }

    const allTeachers = await prisma.teacher.findMany({
      select: { id: true },
    });

    if (allTeachers.length === 0) {
      return { success: false, error: true, message: "No teachers found in the system." };
    }

    await prisma.teacher.updateMany({
      data: { permissions: permissions as object },
    });

    revalidatePath("/dashboard/settings");
    await writeActionAuditLog({
      startedAt,
      action: "user.permissions.bulk_update_teachers",
      category: "user_management",
      summary: `Bulk-updated permissions for all ${allTeachers.length} teacher(s)`,
      entity: { type: "teacher", id: "ALL" },
      metadata: { permissions, affectedCount: allTeachers.length },
    });
    return {
      success: true,
      error: false,
      message: `Permissions applied to all ${allTeachers.length} teacher(s) successfully!`,
    };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to update permissions for all teachers." };
  }
}

export const updateAssignmentQuestion = async (
  currentState: ActionState,
  formData: FormData
): Promise<ActionState> => {
  try {
    await requireStaff();
    const questionId = parseInt(formData.get("questionId") as string);
    const assignmentId = parseInt(formData.get("assignmentId") as string);
    const questionType = formData.get("questionType") as string;
    const questionText = formData.get("questionText") as string;
    const points = parseInt(formData.get("points") as string);
    const optionsJson = formData.get("options") as string;

    if (!questionId || !assignmentId) {
      return { success: false, error: true, message: "Missing required parameters." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.assignmentQuestion.update({
        where: { id: questionId },
        data: {
          questionType: questionType as any,
          questionText,
          points,
        },
      });

      // Update options: delete old ones and recreate
      await tx.questionOption.deleteMany({
        where: { questionId },
      });

      if (questionType === "MULTIPLE_CHOICE" && optionsJson) {
        const options = JSON.parse(optionsJson);
        if (Array.isArray(options) && options.length > 0) {
          await tx.questionOption.createMany({
            data: options.map((opt: any) => ({
              questionId,
              optionText: opt.text,
              isCorrect: Boolean(opt.isCorrect),
            })),
          });
        }
      }
    });

    revalidatePath(`/dashboard/assignments/${assignmentId}`);
    return { success: true, error: false, message: "Question updated successfully!" };
  } catch (err) {
    console.error("updateAssignmentQuestion error:", err);
    return { success: false, error: true, message: "Failed to update question!" };
  }
};

export const deleteAssignmentQuestion = async (
  questionId: number,
  assignmentId: number
): Promise<ActionState> => {
  try {
    await requireStaff();
    if (!questionId || !assignmentId) {
      return { success: false, error: true, message: "Invalid question parameters." };
    }

    await prisma.assignmentQuestion.delete({
      where: { id: questionId },
    });

    revalidatePath(`/dashboard/assignments/${assignmentId}`);
    return { success: true, error: false, message: "Question deleted successfully!" };
  } catch (err) {
    console.error("deleteAssignmentQuestion error:", err);
    return { success: false, error: true, message: "Failed to delete question!" };
  }
};

export const deleteAllAssignmentQuestions = async (
  assignmentId: number
): Promise<ActionState> => {
  try {
    await requireStaff();
    if (!assignmentId) {
      return { success: false, error: true, message: "Invalid assignment ID." };
    }

    await prisma.assignmentQuestion.deleteMany({
      where: { assignmentId },
    });

    revalidatePath(`/dashboard/assignments/${assignmentId}`);
    return { success: true, error: false, message: "All questions deleted successfully!" };
  } catch (err) {
    console.error("deleteAllAssignmentQuestions error:", err);
    return { success: false, error: true, message: "Failed to delete all questions!" };
  }
};

export const updateExamQuestion = async (
  currentState: ActionState,
  formData: FormData
): Promise<ActionState> => {
  try {
    await requireStaff();
    const questionId = parseInt(formData.get("questionId") as string);
    const examId = parseInt(formData.get("examId") as string);
    const questionType = formData.get("questionType") as string;
    const questionText = formData.get("questionText") as string;
    const points = parseInt(formData.get("points") as string);
    const optionsJson = formData.get("options") as string;

    if (!questionId || !examId) {
      return { success: false, error: true, message: "Missing required parameters." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.examQuestion.update({
        where: { id: questionId },
        data: {
          questionType: questionType as any,
          questionText,
          points,
        },
      });

      // Update options: delete old ones and recreate
      await tx.examQuestionOption.deleteMany({
        where: { questionId },
      });

      if (questionType === "MULTIPLE_CHOICE" && optionsJson) {
        const options = JSON.parse(optionsJson);
        if (Array.isArray(options) && options.length > 0) {
          await tx.examQuestionOption.createMany({
            data: options.map((opt: any) => ({
              questionId,
              optionText: opt.text,
              isCorrect: Boolean(opt.isCorrect),
            })),
          });
        }
      }
    });

    revalidatePath(`/dashboard/exams/${examId}`);
    return { success: true, error: false, message: "Question updated successfully!" };
  } catch (err) {
    console.error("updateExamQuestion error:", err);
    return { success: false, error: true, message: "Failed to update question!" };
  }
};

export const deleteExamQuestion = async (
  questionId: number,
  examId: number
): Promise<ActionState> => {
  try {
    await requireStaff();
    if (!questionId || !examId) {
      return { success: false, error: true, message: "Invalid question parameters." };
    }

    await prisma.examQuestion.delete({
      where: { id: questionId },
    });

    revalidatePath(`/dashboard/exams/${examId}`);
    return { success: true, error: false, message: "Question deleted successfully!" };
  } catch (err) {
    console.error("deleteExamQuestion error:", err);
    return { success: false, error: true, message: "Failed to delete question!" };
  }
};

export const deleteAllExamQuestions = async (
  examId: number
): Promise<ActionState> => {
  try {
    await requireStaff();
    if (!examId) {
      return { success: false, error: true, message: "Invalid exam ID." };
    }

    await prisma.examQuestion.deleteMany({
      where: { examId },
    });

    revalidatePath(`/dashboard/exams/${examId}`);
    return { success: true, error: false, message: "All questions deleted successfully!" };
  } catch (err) {
    console.error("deleteAllExamQuestions error:", err);
    return { success: false, error: true, message: "Failed to delete all questions!" };
  }
};

export const parseObjectiveFileAction = async (
  formData: FormData
): Promise<{ success: boolean; message?: string; questions?: ParsedObjectiveQuestion[] }> => {
  try {
    await requireStaff();
    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, message: "No file provided for extraction." };
    }

    const fileName = file.name.toLowerCase();
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const questions = await parseObjectiveFile(file, buffer);

    if (questions.length === 0) {
      // Give a specific hint for PDFs, since they are the most common failure mode
      const isPdf = fileName.endsWith(".pdf") || file.type.includes("pdf");
      return {
        success: false,
        message: isPdf
          ? "Could not read text from this PDF. If it was created in Microsoft Word, please re-save it as a .docx file and upload that instead. PDFs that are image-scanned or heavily formatted may not extract correctly."
          : "No objective questions could be extracted. Please ensure your file contains numbered questions with lettered options (e.g. 1. Question... A. Option A  B. Option B) or use a CSV with Question and Option columns.",
      };
    }

    return {
      success: true,
      message: `Successfully extracted ${questions.length} objective question(s).`,
      questions,
    };
  } catch (err) {
    console.error("parseObjectiveFileAction error:", err);
    return { success: false, message: "Failed to extract questions from file." };
  }
};

export const createBulkAssignmentQuestions = async (
  assignmentId: number,
  questions: ParsedObjectiveQuestion[]
): Promise<ActionState> => {
  try {
    await requireStaff();
    if (!assignmentId || !questions || questions.length === 0) {
      return { success: false, error: true, message: "Invalid parameters for bulk creation." };
    }

    //! See createBulkExamQuestions – keeps the uploaded paper's question order.
    const importedAt = Date.now();

    await prisma.$transaction(
      async (tx) => {
        for (const [index, q] of questions.entries()) {
          await tx.assignmentQuestion.create({
            data: {
              assignmentId,
              questionType: "MULTIPLE_CHOICE",
              questionText: q.questionText,
              points: q.points || 1,
              createdAt: new Date(importedAt + index),
              options: q.options && q.options.length > 0 ? {
                create: q.options.map((opt) => ({
                  optionText: opt.text,
                  isCorrect: opt.isCorrect,
                })),
              } : undefined,
            },
          });
        }
      },
      { maxWait: 10000, timeout: 30000 }
    );

    revalidatePath(`/dashboard/assignments/${assignmentId}`);
    return {
      success: true,
      error: false,
      message: `Successfully created ${questions.length} objective question(s)!`,
    };
  } catch (err) {
    console.error("createBulkAssignmentQuestions error:", err);
    return { success: false, error: true, message: "Failed to create objective questions." };
  }
};

export const createBulkExamQuestions = async (
  examId: number,
  questions: ParsedObjectiveQuestion[]
): Promise<ActionState> => {
  try {
    await requireStaff();
    if (!examId || !questions || questions.length === 0) {
      return { success: false, error: true, message: "Invalid parameters for bulk creation." };
    }

    //! Postgres CURRENT_TIMESTAMP is the transaction start time, so every row
    //! created in this loop would otherwise share one createdAt and lose the
    //! order of the uploaded paper. Stamp each question a millisecond apart.
    const importedAt = Date.now();

    await prisma.$transaction(
      async (tx) => {
        for (const [index, q] of questions.entries()) {
          await tx.examQuestion.create({
            data: {
              examId,
              questionType: "MULTIPLE_CHOICE",
              questionText: q.questionText,
              points: q.points || 1,
              createdAt: new Date(importedAt + index),
              options: q.options && q.options.length > 0 ? {
                create: q.options.map((opt) => ({
                  optionText: opt.text,
                  isCorrect: opt.isCorrect,
                })),
              } : undefined,
            },
          });
        }
      },
      { maxWait: 10000, timeout: 30000 }
    );

    revalidatePath(`/dashboard/exams/${examId}`);
    return {
      success: true,
      error: false,
      message: `Successfully created ${questions.length} objective question(s)!`,
    };
  } catch (err) {
    console.error("createBulkExamQuestions error:", err);
    return { success: false, error: true, message: "Failed to create objective questions." };
  }
};

export async function getUserPermissions(
  userId: string,
  userType: "admin" | "teacher"
): Promise<UserPermissions> {
  try {
    await requireStaff();
    let raw: unknown = null;
    if (userType === "admin") {
      const record = await prisma.admin.findUnique({
        where: { id: userId },
        select: {
          permissions: true,
          staffProfile: {
            select: { permissions: true },
          },
        },
      });
      raw = record?.staffProfile?.permissions ?? record?.permissions;
    } else {
      const record = await prisma.teacher.findUnique({
        where: { id: userId },
        select: {
          permissions: true,
          staffProfile: {
            select: { permissions: true },
          },
        },
      });
      raw = record?.staffProfile?.permissions ?? record?.permissions;
    }

    return normalizeUserPermissions(raw);
  } catch (err) {
    if (isMissingDatabaseObjectError(err)) {
      try {
        const fallbackRecord =
          userType === "admin"
            ? await prisma.admin.findUnique({
                where: { id: userId },
                select: { permissions: true },
              })
            : await prisma.teacher.findUnique({
                where: { id: userId },
                select: { permissions: true },
              });

        return normalizeUserPermissions(fallbackRecord?.permissions);
      } catch (fallbackError) {
        if (!isMissingDatabaseColumnError(fallbackError)) {
          console.error(fallbackError);
        }
      }
    } else {
      console.error(err);
    }

    return { ...DEFAULT_USER_PERMISSIONS };
  }
}

//! STUDENT ACTIONS
export const createStudent = async (
  currentState: ActionState,
  data: StudentSchema
): Promise<ActionState> => {
  const startedAt = Date.now();

  try {
    //* RBAC — only admins can create students
    await requireRecordStudentsAccess();

    //* Plan enforcement — the school's tier caps enrollment
    try {
      const activeStudentWhere = await getActiveStudentWhere();
      const studentCount = await prisma.student.count({ where: activeStudentWhere });
      await requireStudentCapacity(studentCount);
    } catch (entitlementError) {
      if (isEntitlementError(entitlementError)) {
        return {
          success: false,
          error: true,
          message: entitlementError.message,
        };
      }
      throw entitlementError;
    }

    const selectedClass = await prisma.class.findUnique({
      where: { id: data.classId },
      select: { id: true, gradeId: true, grade: { select: { level: true } } },
    });

    if (!selectedClass) {
      return {
        success: false,
        error: true,
        message: "Selected class could not be found.",
      };
    }
    const resolvedGradeId = selectedClass.gradeId;

    //* Capture plaintext BEFORE hashing (needed for credential notification)
    const plaintextStudentPassword = data.password || generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(plaintextStudentPassword, 10);

    //* Get studentIdInitials from system settings
    const settings = await getSystemSettings();
    const initials = settings.studentIdInitials?.trim() || "STU";

    //* Generate student ID: {initials}{MMYY}{3-digit seq}
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yy = String(now.getFullYear()).slice(-2);
    const prefix = `${initials}${mm}${yy}`;

    const lastStudent = await prisma.student.findFirst({
      where: { studentId: { startsWith: prefix } },
      orderBy: { createdAt: "desc" },
    });

    let nextNumber = 1;
    if (lastStudent) {
      const lastNumberStr = lastStudent.studentId.slice(prefix.length);
      const lastNumber = parseInt(lastNumberStr);
      if (!isNaN(lastNumber)) nextNumber = lastNumber + 1;
    }

    const studentId = `${prefix}${String(nextNumber).padStart(3, "0")}`;

    //* Auto-generate a username from name + studentId suffix
    const username = data.username ||
      `${data.name.toLowerCase().replace(/\s+/g, "")}.${data.surname.toLowerCase().replace(/\s+/g, "")}.${String(nextNumber).padStart(3, "0")}`;

    //* Parent Logic
    let parentId = data.parentId;
    let createdParentUserId: string | null = null;
    let parentPhone: string | null = null;
    let parentEmail: string | null = null;
    let parentName: string | null = null;
    const plaintextParentPassword = DEFAULT_PARENT_PASSWORD;

    if (data.parentType === "new" && data.parentName && data.parentSurname && data.parentPhone) {
      //* Create a complete parent record (no pending state)
      const phoneSuffix = data.parentPhone.slice(-4);
      const parentUsername = `p.${data.parentName.toLowerCase()}${phoneSuffix}`;
      const hashedParentPassword = await bcrypt.hash(plaintextParentPassword, 10);
      const parentUserId = await generateParentUserId();

      const newParent = await prisma.parent.create({
        data: {
          username: parentUsername,
          parentUserId,
          password: hashedParentPassword,
          name: data.parentName,
          surname: data.parentSurname,
          phone: data.parentPhone,
          email: data.parentEmail || null,
          address: (data as any).parentAddress || "",
          isProfileComplete: true,
        },
      });
      parentId = newParent.id;
      createdParentUserId = parentUserId;
      parentPhone = data.parentPhone;
      parentEmail = data.parentEmail || null;
      parentName = `${data.parentName} ${data.parentSurname}`;
    } else if (data.parentId) {
      //* Fetch existing parent contact details for notification
      const existingParent = await prisma.parent.findUnique({
        where: { id: data.parentId },
        select: { phone: true, email: true, name: true, surname: true, parentUserId: true },
      });
      if (existingParent) {
        parentPhone = existingParent.phone;
        parentEmail = existingParent.email;
        parentName = `${existingParent.name} ${existingParent.surname}`;
      }
    }

    const student = await prisma.student.create({
      data: {
        username,
        studentId,
        password: hashedPassword,
        name: data.name,
        surname: data.surname,
        otherNames: data.otherNames || null,
        email: data.email || null,
        sex: data.sex,
        birthday: data.birthday,
        residencyStatus: data.residencyStatus,
        house: data.house || null,
        guardianName: data.guardianName || `${data.parentName} ${data.parentSurname}`,
        contactNumber: data.contactNumber || data.parentPhone,
        occupation: data.occupation || null,
        nhisNumber: data.nhisNumber || null,
        admissionDate: data.admissionDate || null,
        emergencyContact: data.emergencyContact || null,
        img: data.img || null,
        gradeId: resolvedGradeId,
        classId: data.classId,
        parentId: parentId || null,
        address: "",
        bloodType: null,
      },
    });

    //* Bill the new student now rather than waiting for an admin to re-run
    //* Prepare Bill: the admission fee for their level, or the class term bill
    //* where no admission bill covers it. Never let a billing problem undo the
    //* admission.
    let billingNote = "";
    try {
      const billing = await assignBilledFeesToNewStudents([
        {
          id: student.id,
          classId: data.classId,
          gradeLevel: selectedClass.grade.level,
        },
      ]);

      if (billing.admissionFeesCreated > 0) {
        billingNote = " The admission fee for their level was assigned.";
      } else if (billing.termFeesCreated > 0) {
        billingNote = " The current term bill for the class was assigned.";
      }
    } catch (billingErr) {
      console.error("[STUDENT FEES] Failed to assign bills to new student:", billingErr);
    }

    revalidatePath("/dashboard/students");
    revalidatePath("/dashboard/fees");
    await writeActionAuditLog({
      startedAt,
      action: "student.create",
      category: "user_management",
      summary: `Created student ${data.name} ${data.surname}`,
      entity: {
        type: "student",
        id: student.id,
        label: `${data.name} ${data.surname}`,
      },
      metadata: {
        studentId,
        username,
        gradeId: resolvedGradeId,
        classId: data.classId,
        parentId: parentId || null,
        createdParent: Boolean(createdParentUserId),
        parentUserId: createdParentUserId,
      },
    });

    //* Send the credential SMS before reporting a successful registration. A
    //* registration is an interactive request, so deferring this send means a
    //* serverless runtime can finish the action while the SMS work is still
    //* pending. Email remains deferred because it is only a secondary channel.
    let credentialSmsWarning = "";
    if (parentPhone || parentEmail) {
      const studentFullName = `${data.name} ${data.surname}`;
      const resolvedParentUserId = createdParentUserId ?? (data.parentId
        ? (await prisma.parent.findUnique({ where: { id: data.parentId }, select: { parentUserId: true } }))?.parentUserId ?? ""
        : "");

      const credStudents = [{
        studentName: studentFullName,
        studentId,
        password: plaintextStudentPassword,
      }];

      const rawAppUrl = settings.publicAppUrl || await resolveCurrentAppBaseUrl();
      const appUrl = rawAppUrl.replace(/\/+$/, "");
      const loginUrl = `${appUrl}/login`;

      if (parentPhone) {
        const smsResults = await sendParentCredentialsSMS({
          parentPhone,
          parentName: parentName ?? "Parent",
          parentUserId: resolvedParentUserId,
          parentPassword: plaintextParentPassword,
          schoolName: settings.schoolName || "our school",
          schoolPhone: settings.schoolPhone || "the school office",
          publicAppUrl: appUrl,
          students: credStudents,
          loginUrl,
        });

        const failedSms = smsResults.filter((result) => !result.success);
        if (failedSms.length > 0) {
          credentialSmsWarning =
            " The parent SMS could not be submitted; check SMS settings before resending credentials.";
          console.error("[CREDENTIALS] Parent SMS failed:", failedSms);
        }
      }

      if (parentEmail) {
        runAfterResponse("CREDENTIALS EMAIL", async () => {
          try {
            await sendParentCredentialsEmail({
              parentEmail,
              parentName: parentName ?? "Parent",
              parentUserId: resolvedParentUserId,
              parentPassword: plaintextParentPassword,
              students: credStudents,
            });
          } catch (notifyErr) {
            console.error("[CREDENTIALS EMAIL] Notification error:", notifyErr);
          }
        });
      }
    }

    return {
      success: true,
      error: false,
      message: `Student created successfully!${billingNote}${credentialSmsWarning}`,
    };


  } catch (err) {
    console.error(err);
    const authorizationFailure = toActionFailure(err);
    if (authorizationFailure) {
      return authorizationFailure;
    }
    return { success: false, error: true, message: "Failed to create student!" };
  }
};

export const updateStudent = async (
  currentState: ActionState,
  data: StudentSchema
): Promise<ActionState> => {
  const startedAt = Date.now();

  if (!data.id) {
    return { success: false, error: true, message: "Student ID is required!" };
  }

  try {
    await requireAdmin();
    const selectedClass = await prisma.class.findUnique({
      where: { id: data.classId },
      select: { id: true, gradeId: true },
    });

    if (!selectedClass) {
      return {
        success: false,
        error: true,
        message: "Selected class could not be found.",
      };
    }
    const resolvedGradeId = selectedClass.gradeId;

    const updateData: any = {
      name: data.name,
      surname: data.surname,
      otherNames: data.otherNames || null,
      email: data.email || null,
      sex: data.sex,
      birthday: data.birthday,
      residencyStatus: data.residencyStatus,
      house: data.house || null,
      guardianName: data.guardianName,
      contactNumber: data.contactNumber,
      occupation: data.occupation || null,
      nhisNumber: data.nhisNumber || null,
      admissionDate: data.admissionDate || null,
      emergencyContact: data.emergencyContact || null,
      img: data.img || null,
      gradeId: resolvedGradeId,
      classId: data.classId,
      parentId: data.parentId || null,
    };

    if (data.password && data.password !== "") {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    await prisma.student.update({
      where: { id: data.id },
      data: updateData,
    });

    revalidatePath("/dashboard/students");
    await writeActionAuditLog({
      startedAt,
      action: "student.update",
      category: "user_management",
      summary: `Updated student ${data.name} ${data.surname}`,
      entity: {
        type: "student",
        id: data.id,
        label: `${data.name} ${data.surname}`,
      },
      metadata: {
        gradeId: resolvedGradeId,
        classId: data.classId,
        parentId: data.parentId || null,
        passwordChanged: Boolean(data.password),
      },
    });
    return { success: true, error: false, message: "Student updated successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to update student!" };
  }
};

export const deleteStudent = async (
  currentState: ActionState,
  data: FormData
): Promise<ActionState> => {
  const startedAt = Date.now();
  const id = data.get("id") as string;

  try {
    //* RBAC — only admins can delete students
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return { success: false, error: true, message: "Unauthorized: Only admins can delete students." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.attendance.deleteMany({ where: { studentId: id } });
      await tx.result.deleteMany({ where: { studentId: id } });
      await tx.feePayment.deleteMany({ where: { studentId: id } });
      await tx.fee.deleteMany({ where: { studentId: id } });
      await tx.behavior.deleteMany({ where: { studentId: id } });
      await tx.medicalInfo.deleteMany({ where: { studentId: id } });
      await tx.document.deleteMany({ where: { studentId: id } });
      await tx.comment.deleteMany({ where: { studentId: id } });
      await tx.studentAnswer.deleteMany({ where: { studentId: id } });
      await tx.aiQuizAttempt.deleteMany({ where: { studentId: id } });
      await tx.savedReportCard.deleteMany({ where: { studentId: id } });
      await tx.parentTeacherMeeting.deleteMany({ where: { studentId: id } });
      await tx.excursionPayment.deleteMany({ where: { studentId: id } });
      await tx.feeCollectionPayment.deleteMany({ where: { studentId: id } });
      await tx.student.delete({ where: { id } });
    });

    revalidatePath("/dashboard/students");
    await writeActionAuditLog({
      startedAt,
      action: "student.delete",
      category: "user_management",
      summary: `Deleted student ${id}`,
      entity: {
        type: "student",
        id,
      },
    });
    return { success: true, error: false, message: "Student deleted successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to delete student!" };
  }
};

export const bulkDeleteStudents = async (
  ids: string[]
): Promise<{ success: boolean; error: boolean; message: string; count?: number }> => {
  const startedAt = Date.now();

  try {
    //* RBAC — only admins can delete students
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return { success: false, error: true, message: "Unauthorized: Only admins can delete students." };
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return { success: false, error: true, message: "No students selected for deletion." };
    }

    const cleanIds = ids.filter((id): id is string => typeof id === "string" && id.trim().length > 0);
    if (cleanIds.length === 0) {
      return { success: false, error: true, message: "Invalid student IDs provided." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.attendance.deleteMany({ where: { studentId: { in: cleanIds } } });
      await tx.result.deleteMany({ where: { studentId: { in: cleanIds } } });
      await tx.feePayment.deleteMany({ where: { studentId: { in: cleanIds } } });
      await tx.fee.deleteMany({ where: { studentId: { in: cleanIds } } });
      await tx.behavior.deleteMany({ where: { studentId: { in: cleanIds } } });
      await tx.medicalInfo.deleteMany({ where: { studentId: { in: cleanIds } } });
      await tx.document.deleteMany({ where: { studentId: { in: cleanIds } } });
      await tx.comment.deleteMany({ where: { studentId: { in: cleanIds } } });
      await tx.studentAnswer.deleteMany({ where: { studentId: { in: cleanIds } } });
      await tx.studentExamAnswer.deleteMany({ where: { studentId: { in: cleanIds } } });
      await tx.aiQuizAttempt.deleteMany({ where: { studentId: { in: cleanIds } } });
      await tx.savedReportCard.deleteMany({ where: { studentId: { in: cleanIds } } });
      await tx.reportCardEntry.deleteMany({ where: { studentId: { in: cleanIds } } });
      await tx.parentTeacherMeeting.deleteMany({ where: { studentId: { in: cleanIds } } });
      await tx.excursionPayment.deleteMany({ where: { studentId: { in: cleanIds } } });
      await tx.feeCollectionPayment.deleteMany({ where: { studentId: { in: cleanIds } } });
      await tx.libraryBorrow.deleteMany({ where: { studentId: { in: cleanIds } } });
      await tx.student.deleteMany({ where: { id: { in: cleanIds } } });
    });

    revalidatePath("/dashboard/students");
    await writeActionAuditLog({
      startedAt,
      action: "student.bulk_delete",
      category: "user_management",
      summary: `Bulk deleted ${cleanIds.length} student(s)`,
      entity: {
        type: "student",
        id: cleanIds.slice(0, 5).join(",") + (cleanIds.length > 5 ? ` (+${cleanIds.length - 5} more)` : ""),
      },
    });

    return {
      success: true,
      error: false,
      count: cleanIds.length,
      message: `Successfully deleted ${cleanIds.length} student${cleanIds.length > 1 ? "s" : ""}.`,
    };
  } catch (err) {
    console.error("Failed to bulk delete students:", err);
    return { success: false, error: true, message: "Failed to delete selected students." };
  }
};

//* Credential SMS for newly registered staff, sent after the response. Never
//* blocks or fails the creation itself — a dead SMS gateway must not lose the
//* account.
const notifyStaffCredentials = (params: {
  phone: string;
  name: string;
  staffId: string;
  password: string;
  role: "teacher" | "admin";
}) => {
  runAfterResponse("CREDENTIALS", async () => {
    try {
      const settings = await getSystemSettings();
      const rawAppUrl = settings.publicAppUrl || (await resolveCurrentAppBaseUrl());

      const result = await sendStaffCredentialsSMS({
        ...params,
        schoolName: settings.schoolName || "our school",
        schoolPhone: settings.schoolPhone || "the school office",
        publicAppUrl: rawAppUrl.replace(/\/+$/, ""),
      });

      if (!result.success) {
        console.warn(`[CREDENTIALS] Staff SMS failed for ${params.staffId}:`, result.error);
      }
    } catch (notifyErr) {
      console.error("[CREDENTIALS] Staff SMS error (non-blocking):", notifyErr);
    }
  });
};

//! TEACHER ACTIONS
export const createTeacher = async (
  currentState: ActionState,
  data: TeacherSchema
): Promise<ActionState> => {
  const startedAt = Date.now();

  try {
    //* RBAC — only admins can create teachers
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return { success: false, error: true, message: "Unauthorized: Only admins can create teachers." };
    }

    const plaintextPassword = data.password || DEFAULT_TEACHER_PASSWORD;
    const hashedPassword = await bcrypt.hash(plaintextPassword, 10);
    const staffId = await generateTeacherStaffId();

    const teacher = await prisma.$transaction(async (tx) => {
      const staffProfile = await upsertStaffProfile(tx, {
        staffId,
        username: data.username,
        password: hashedPassword,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        sex: data.sex,
        birthday: data.birthday,
        permissions: null,
        staffType: "TEACHER",
      });

      return tx.teacher.create({
        data: {
          username: data.username,
          staffId,
          ...(staffProfile ? { staffProfileId: staffProfile.id } : {}),
          password: hashedPassword,
          name: data.name,
          surname: data.surname,
          email: data.email || null,
          phone: data.phone || null,
          address: data.address,
          img: data.img || null,
          sex: data.sex,
          birthday: data.birthday,
          subjects: {
            connect: data.subjects?.map((subjectId: string) => ({
              id: parseInt(subjectId),
            })),
          },
        },
      });
    });

    revalidatePath("/dashboard/teachers");
    await writeActionAuditLog({
      startedAt,
      action: "teacher.create",
      category: "user_management",
      summary: `Created teacher ${data.name} ${data.surname}`,
      entity: {
        type: "teacher",
        id: teacher.id,
        label: `${data.name} ${data.surname}`,
      },
      metadata: {
        staffId,
        username: data.username,
        subjectCount: data.subjects?.length || 0,
      },
    });

    if (data.phone) {
      notifyStaffCredentials({
        phone: data.phone,
        name: `${data.name} ${data.surname}`,
        staffId,
        password: plaintextPassword,
        role: "teacher",
      });
    }

    return { success: true, error: false, message: "Teacher created successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to create teacher!" };
  }
};

export const updateTeacher = async (
  currentState: ActionState,
  data: TeacherSchema
): Promise<ActionState> => {
  const startedAt = Date.now();

  if (!data.id) {
    return { success: false, error: true, message: "Teacher ID is required!" };
  }

  try {
    await requireAdmin();
    await prisma.$transaction(async (tx) => {
      const existingTeacher = await tx.teacher.findUnique({
        where: { id: data.id },
        select: {
          id: true,
          username: true,
          staffId: true,
          staffProfileId: true,
          password: true,
          permissions: true,
        },
      });

      if (!existingTeacher) {
        throw new Error("Teacher not found!");
      }

      const passwordHash =
        data.password && data.password !== ""
          ? await bcrypt.hash(data.password, 10)
          : existingTeacher.password;

      const staffProfile = await upsertStaffProfile(tx, {
        staffId: existingTeacher.staffId,
        username: data.username,
        password: passwordHash,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        sex: data.sex,
        birthday: data.birthday,
        permissions: existingTeacher.permissions ?? null,
        staffType: "TEACHER",
      });

      const updateData: Prisma.TeacherUpdateInput = {
        username: data.username,
        ...(staffProfile ? { staffProfile: { connect: { id: staffProfile.id } } } : {}),
        password: passwordHash,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        sex: data.sex,
        birthday: data.birthday,
        subjects: {
          set: data.subjects?.map((subjectId: string) => ({
            id: parseInt(subjectId),
          })),
        },
      };

      await tx.teacher.update({
        where: { id: data.id },
        data: updateData,
      });
    });

    revalidatePath("/dashboard/teachers");
    await writeActionAuditLog({
      startedAt,
      action: "teacher.update",
      category: "user_management",
      summary: `Updated teacher ${data.name} ${data.surname}`,
      entity: {
        type: "teacher",
        id: data.id,
        label: `${data.name} ${data.surname}`,
      },
      metadata: {
        username: data.username,
        subjectCount: data.subjects?.length || 0,
        passwordChanged: Boolean(data.password),
      },
    });
    return { success: true, error: false, message: "Teacher updated successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to update teacher!" };
  }
};

export const deleteTeacher = async (
  currentState: ActionState,
  data: FormData
): Promise<ActionState> => {
  const startedAt = Date.now();
  const id = data.get("id") as string;

  try {
    //* RBAC — only admins can delete teachers
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return { success: false, error: true, message: "Unauthorized: Only admins can delete teachers." };
    }

    await prisma.$transaction(async (tx) => {
      const existingTeacher = await tx.teacher.findUnique({
        where: { id },
        select: {
          staffId: true,
          staffProfileId: true,
        },
      });

      await tx.teacher.delete({
        where: { id },
      });

      await deleteStaffProfile(tx, {
        staffId: existingTeacher?.staffId,
        staffProfileId: existingTeacher?.staffProfileId,
      });
    });

    revalidatePath("/dashboard/teachers");
    await writeActionAuditLog({
      startedAt,
      action: "teacher.delete",
      category: "user_management",
      summary: `Deleted teacher ${id}`,
      entity: {
        type: "teacher",
        id,
      },
    });
    return { success: true, error: false, message: "Teacher deleted successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to delete teacher!" };
  }
};

type ManagedClassRecord = {
  id: number;
  name: string;
  capacity: number;
  gradeId: number;
  supervisorId: string | null;
  grade: {
    id: number;
    level: number;
  };
};

type ManagedGradeRecord = {
  id: number;
  level: number;
};

type GradeStructurePlan = {
  grade: ManagedGradeRecord;
  targets: Array<{
    name: string;
    gradeId: number;
    gradeLevel: number;
    streamLabel: string | null;
    matchedExistingClass: ManagedClassRecord | null;
  }>;
  removedClasses: Array<{
    existingClass: ManagedClassRecord;
    fallbackTargetName: string;
  }>;
};

const normalizeClassKey = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

function getStreamOrderIndex(streamLabel: string | null) {
  if (!streamLabel) {
    return -1;
  }

  const normalizedLabel = streamLabel.trim().toUpperCase();
  if (/^[A-Z]$/.test(normalizedLabel)) {
    return normalizedLabel.charCodeAt(0) - 65;
  }

  return Number.MAX_SAFE_INTEGER;
}

function sortClassesWithinGrade(
  classes: ManagedClassRecord[],
  grade: ManagedGradeRecord
) {
  return sortClassesByGrade(classes, [grade]);
}

function matchExistingClassesToTargets(
  existingClasses: ManagedClassRecord[],
  targets: Array<{
    name: string;
    gradeId: number;
    gradeLevel: number;
    streamLabel: string | null;
  }>,
  gradeLevel: number
) {
  const availableClasses = [...existingClasses];
  const matchedByTargetName = new Map<string, ManagedClassRecord>();

  for (const target of targets) {
    const exactMatchIndex = availableClasses.findIndex(
      (classItem) =>
        normalizeClassKey(classItem.name) === normalizeClassKey(target.name)
    );

    if (exactMatchIndex >= 0) {
      matchedByTargetName.set(target.name, availableClasses[exactMatchIndex]);
      availableClasses.splice(exactMatchIndex, 1);
    }
  }

  for (const target of targets) {
    if (matchedByTargetName.has(target.name)) {
      continue;
    }

    const sectionMatchIndex = availableClasses.findIndex((classItem) => {
      return (
        getClassStreamSection(classItem.name, gradeLevel) === target.streamLabel
      );
    });

    if (sectionMatchIndex >= 0) {
      matchedByTargetName.set(target.name, availableClasses[sectionMatchIndex]);
      availableClasses.splice(sectionMatchIndex, 1);
    }
  }

  for (const target of targets) {
    if (matchedByTargetName.has(target.name)) {
      continue;
    }

    const nextAvailableClass = availableClasses.shift();
    if (!nextAvailableClass) {
      break;
    }

    matchedByTargetName.set(target.name, nextAvailableClass);
  }

  return {
    matchedByTargetName,
    removedClasses: availableClasses,
  };
}

function resolveFallbackTargetName(
  existingClass: ManagedClassRecord,
  targets: Array<{
    name: string;
    gradeId: number;
    gradeLevel: number;
    streamLabel: string | null;
  }>
) {
  if (targets.length === 0) {
    throw new Error("No target classes were generated for the selected grade.");
  }

  const currentSection = getClassStreamSection(
    existingClass.name,
    existingClass.grade.level
  );

  if (currentSection) {
    const exactTarget = targets.find(
      (target) => target.streamLabel === currentSection
    );

    if (exactTarget) {
      return exactTarget.name;
    }
  }

  const indexedTargets = [...targets].sort((left, right) => {
    return getStreamOrderIndex(left.streamLabel) - getStreamOrderIndex(right.streamLabel);
  });
  const currentSectionIndex = getStreamOrderIndex(currentSection);

  if (currentSectionIndex !== Number.MAX_SAFE_INTEGER) {
    const boundedIndex = Math.min(
      Math.max(currentSectionIndex, 0),
      indexedTargets.length - 1
    );

    return indexedTargets[boundedIndex].name;
  }

  return indexedTargets[0].name;
}

function buildGradeStructurePlans(
  grades: ManagedGradeRecord[],
  existingClasses: ManagedClassRecord[],
  streamCount: number
) {
  const targets = buildSchoolClassDefinitions(grades, streamCount);

  return grades
    .slice()
    .sort((left, right) => left.level - right.level)
    .map((grade) => {
      const targetsForGrade = targets.filter((target) => target.gradeId === grade.id);
      const existingForGrade = sortClassesWithinGrade(
        existingClasses.filter((classItem) => classItem.gradeId === grade.id),
        grade
      );
      const { matchedByTargetName, removedClasses } = matchExistingClassesToTargets(
        existingForGrade,
        targetsForGrade,
        grade.level
      );

      return {
        grade,
        targets: targetsForGrade.map((target) => ({
          ...target,
          matchedExistingClass: matchedByTargetName.get(target.name) ?? null,
        })),
        removedClasses: removedClasses.map((existingClass) => ({
          existingClass,
          fallbackTargetName: resolveFallbackTargetName(
            existingClass,
            targetsForGrade
          ),
        })),
      } satisfies GradeStructurePlan;
    });
}

//! CLASS ACTIONS
export const createClass = async (
  currentState: ActionState,
  data: ClassSchema
): Promise<ActionState> => {
  const startedAt = Date.now();

  try {
    //* RBAC — only admins can create classes
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return { success: false, error: true, message: "Unauthorized: Only admins can create classes." };
    }

    const classroom = await prisma.class.create({
      data: {
        name: data.name.trim(),
        capacity: data.capacity,
        gradeId: data.gradeId,
        supervisorId: data.supervisorId || null,
      },
    });

    revalidatePath("/dashboard/classes");
    revalidatePath("/dashboard/students");
    await writeActionAuditLog({
      startedAt,
      action: "class.create",
      category: "academics",
      summary: `Created class ${data.name}`,
      entity: {
        type: "class",
        id: classroom.id,
        label: data.name,
      },
      metadata: {
        gradeId: data.gradeId,
        capacity: data.capacity,
        supervisorId: data.supervisorId || null,
      },
    });
    return { success: true, error: false, message: "Class created successfully!" };
  } catch (err) {
    console.error(err);
    if (getUniqueConstraintField(err) === "name") {
      return {
        success: false,
        error: true,
        message: "A class with this name already exists.",
      };
    }
    return { success: false, error: true, message: "Failed to create class!" };
  }
};

export const replaceSchoolClassStructure = async (
  currentState: ActionState,
  data: SchoolClassStructureSchema
): Promise<ActionState> => {
  const startedAt = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return {
        success: false,
        error: true,
        message: "Unauthorized: Only admins can update class streams.",
      };
    }

    const allGrades = await prisma.grade.findMany({
      select: { id: true, level: true },
      orderBy: { level: "asc" },
    });
    const grades = allGrades.filter((grade) => grade.level <= 14);

    if (grades.length === 0) {
      return {
        success: false,
        error: true,
        message: "No grades were found. Set up grades before configuring streams.",
      };
    }

    const existingClasses = await prisma.class.findMany({
      where: {
        gradeId: {
          in: grades.map((grade) => grade.id),
        },
      },
      select: {
        id: true,
        name: true,
        capacity: true,
        gradeId: true,
        supervisorId: true,
        grade: {
          select: {
            id: true,
            level: true,
          },
        },
      },
    });

    const structurePlans = buildGradeStructurePlans(
      grades,
      existingClasses,
      data.streamCount
    );
    const removedClassPlans = structurePlans.flatMap((plan) =>
      plan.removedClasses.map((removedClass) => ({
        ...removedClass,
        gradeLevel: plan.grade.level,
      }))
    );
    const matchedTargetCount = structurePlans.reduce((total, plan) => {
      return (
        total +
        plan.targets.filter((target) => target.matchedExistingClass !== null).length
      );
    }, 0);
    const createdTargetCount = structurePlans.reduce((total, plan) => {
      return (
        total +
        plan.targets.filter((target) => target.matchedExistingClass === null).length
      );
    }, 0);
    const renamedTargetCount = structurePlans.reduce((total, plan) => {
      return (
        total +
        plan.targets.filter((target) => {
          return (
            target.matchedExistingClass !== null &&
            normalizeClassKey(target.matchedExistingClass.name) !==
              normalizeClassKey(target.name)
          );
        }).length
      );
    }, 0);
    const hasStructuralChange =
      createdTargetCount > 0 ||
      removedClassPlans.length > 0 ||
      renamedTargetCount > 0;

    if (!hasStructuralChange) {
      return {
        success: true,
        error: false,
        message: `The school already uses the Creche to JHS 3 structure with ${
          data.streamCount
        } stream${data.streamCount === 1 ? "" : "s"} from KG 1 to JHS 3.`,
      };
    }

    const targetPlanByName = new Map(
      structurePlans.flatMap((plan) =>
        plan.targets.map((target) => [target.name, target] as const)
      )
    );
    const removedClassMappings = removedClassPlans.map((removedClass) => {
      const targetPlan = targetPlanByName.get(removedClass.fallbackTargetName);

      if (!targetPlan) {
        throw new Error(
          `Could not find a replacement class for ${removedClass.existingClass.name}.`
        );
      }

      return {
        ...removedClass,
        fallbackTargetExistingClassId: targetPlan.matchedExistingClass?.id ?? null,
      };
    });
    const removedClassScopeByLevel = new Map(
      removedClassMappings.map((removedClass) => [
        encodeTermBillScope({
          targetType: "CLASS",
          targetId: removedClass.existingClass.id,
        }),
        removedClass,
      ])
    );
    const removableClassScopes = [...removedClassScopeByLevel.keys()];

    if (removableClassScopes.length > 0) {
      const existingTargetScopes = removedClassMappings
        .map((removedClass) =>
          removedClass.fallbackTargetExistingClassId
            ? encodeTermBillScope({
                targetType: "CLASS",
                targetId: removedClass.fallbackTargetExistingClassId,
              })
            : null
        )
        .filter((scope): scope is string => scope !== null);
      const [sourceTermBills, targetTermBills] = await Promise.all([
        prisma.termBill.findMany({
          where: {
            level: {
              in: removableClassScopes,
            },
          },
          select: {
            id: true,
            level: true,
            term: true,
            academicYear: true,
          },
        }),
        existingTargetScopes.length > 0
          ? prisma.termBill.findMany({
              where: {
                level: {
                  in: [...new Set(existingTargetScopes)],
                },
              },
              select: {
                id: true,
                level: true,
                term: true,
                academicYear: true,
              },
            })
          : Promise.resolve([]),
      ]);
      const sourceConflictKeys = new Set<string>();
      const existingTargetConflictKeys = new Set(
        targetTermBills.map((termBill) => {
          const removedClass = removedClassMappings.find((candidate) => {
            return (
              candidate.fallbackTargetExistingClassId !== null &&
              encodeTermBillScope({
                targetType: "CLASS",
                targetId: candidate.fallbackTargetExistingClassId,
              }) === termBill.level
            );
          });

          return removedClass
            ? `${removedClass.fallbackTargetName}|${termBill.term}|${termBill.academicYear}`
            : "";
        })
      );
      existingTargetConflictKeys.delete("");
      const conflictingTermBills = sourceTermBills.filter((termBill) => {
        const removedClass = removedClassScopeByLevel.get(termBill.level);
        if (!removedClass) {
          return false;
        }

        const conflictKey = `${removedClass.fallbackTargetName}|${termBill.term}|${termBill.academicYear}`;
        if (
          sourceConflictKeys.has(conflictKey) ||
          existingTargetConflictKeys.has(conflictKey)
        ) {
          return true;
        }

        sourceConflictKeys.add(conflictKey);
        return false;
      });

      if (conflictingTermBills.length > 0) {
        return {
          success: false,
          error: true,
          message:
            "This stream change would collide with existing class fee bills. Delete or retarget the class-specific bills first, then try again.",
        };
      }
    }

    const temporaryNameSeed = Date.now();
    const temporaryNamePrefix = `__stream_reset_${temporaryNameSeed}_`;
    const existingClassIds = existingClasses.map((classItem) => classItem.id);
    const reusableTargets = structurePlans.flatMap((plan) =>
      plan.targets.filter(
        (
          target
        ): target is typeof target & { matchedExistingClass: ManagedClassRecord } =>
          target.matchedExistingClass !== null
      )
    );
    const newTargets = structurePlans.flatMap((plan) => {
      const fallbackCapacity =
        plan.targets.find((target) => target.matchedExistingClass !== null)
          ?.matchedExistingClass?.capacity ??
        plan.removedClasses[0]?.existingClass.capacity ??
        DEFAULT_CLASS_CAPACITY;

      return plan.targets
        .filter((target) => target.matchedExistingClass === null)
        .map((target) => ({
          name: target.name,
          gradeId: target.gradeId,
          capacity: fallbackCapacity,
        }));
    });
    const targetNames = structurePlans.flatMap((plan) =>
      plan.targets.map((target) => target.name)
    );

    await prisma.$transaction(
      async (tx) => {
        if (existingClassIds.length > 0) {
          await tx.$executeRaw(Prisma.sql`
            UPDATE "Class"
            SET "name" = ${temporaryNamePrefix} || "id"::text
            WHERE "id" IN (${Prisma.join(existingClassIds)})
          `);
        }

        if (reusableTargets.length > 0) {
          const reusableTargetIds = reusableTargets.map(
            (target) => target.matchedExistingClass.id
          );
          const nameCases = Prisma.join(
            reusableTargets.map((target) => Prisma.sql`
              WHEN ${target.matchedExistingClass.id} THEN ${target.name}
            `),
            " "
          );
          const gradeCases = Prisma.join(
            reusableTargets.map((target) => Prisma.sql`
              WHEN ${target.matchedExistingClass.id} THEN ${target.gradeId}
            `),
            " "
          );

          await tx.$executeRaw(Prisma.sql`
            UPDATE "Class"
            SET
              "name" = CASE "id"
                ${nameCases}
                ELSE "name"
              END,
              "gradeId" = CASE "id"
                ${gradeCases}
                ELSE "gradeId"
              END
            WHERE "id" IN (${Prisma.join(reusableTargetIds)})
          `);
        }

        if (newTargets.length > 0) {
          await tx.class.createMany({
            data: newTargets,
          });
        }

        const finalClasses = await tx.class.findMany({
          where: {
            name: {
              in: targetNames,
            },
          },
          select: {
            id: true,
            name: true,
            gradeId: true,
          },
        });
        const finalClassesByName = new Map(
          finalClasses.map((classItem) => [
            classItem.name,
            {
              id: classItem.id,
              gradeId: classItem.gradeId,
            },
          ])
        );

        const remapGroups = new Map<
          number,
          {
            replacementClassId: number;
            replacementGradeId: number;
            sourceClassIds: number[];
            sourceScopes: string[];
          }
        >();

        for (const removedClass of removedClassMappings) {
          const replacementClass = finalClassesByName.get(
            removedClass.fallbackTargetName
          );

          if (!replacementClass) {
            throw new Error(
              `Could not resolve replacement class ${removedClass.fallbackTargetName}.`
            );
          }

          const existingGroup = remapGroups.get(replacementClass.id);
          if (existingGroup) {
            existingGroup.sourceClassIds.push(removedClass.existingClass.id);
            existingGroup.sourceScopes.push(
              encodeTermBillScope({
                targetType: "CLASS",
                targetId: removedClass.existingClass.id,
              })
            );
            continue;
          }

          remapGroups.set(replacementClass.id, {
            replacementClassId: replacementClass.id,
            replacementGradeId: replacementClass.gradeId,
            sourceClassIds: [removedClass.existingClass.id],
            sourceScopes: [
              encodeTermBillScope({
                targetType: "CLASS",
                targetId: removedClass.existingClass.id,
              }),
            ],
          });
        }

        for (const remapGroup of remapGroups.values()) {
          const targetScope = encodeTermBillScope({
            targetType: "CLASS",
            targetId: remapGroup.replacementClassId,
          });

          await tx.termBill.updateMany({
            where: {
              level: {
                in: remapGroup.sourceScopes,
              },
            },
            data: { level: targetScope },
          });
          await tx.student.updateMany({
            where: {
              classId: {
                in: remapGroup.sourceClassIds,
              },
            },
            data: {
              classId: remapGroup.replacementClassId,
              gradeId: remapGroup.replacementGradeId,
            },
          });
          await tx.lesson.updateMany({
            where: {
              classId: {
                in: remapGroup.sourceClassIds,
              },
            },
            data: {
              classId: remapGroup.replacementClassId,
            },
          });
          await tx.event.updateMany({
            where: {
              classId: {
                in: remapGroup.sourceClassIds,
              },
            },
            data: {
              classId: remapGroup.replacementClassId,
            },
          });
          await tx.announcement.updateMany({
            where: {
              classId: {
                in: remapGroup.sourceClassIds,
              },
            },
            data: {
              classId: remapGroup.replacementClassId,
            },
          });
          await tx.notification.updateMany({
            where: {
              classId: {
                in: remapGroup.sourceClassIds,
              },
            },
            data: {
              classId: remapGroup.replacementClassId,
            },
          });
          await tx.excursionCampaign.updateMany({
            where: {
              classId: {
                in: remapGroup.sourceClassIds,
              },
            },
            data: {
              classId: remapGroup.replacementClassId,
            },
          });
          await tx.feeCollectionCampaign.updateMany({
            where: {
              classId: {
                in: remapGroup.sourceClassIds,
              },
            },
            data: {
              classId: remapGroup.replacementClassId,
            },
          });
        }

        if (removedClassMappings.length > 0) {
          await tx.class.deleteMany({
            where: {
              id: {
                in: removedClassMappings.map(
                  (removedClass) => removedClass.existingClass.id
                ),
              },
            },
          });
        }
      },
      {
        maxWait: 10_000,
        timeout: 30_000,
      }
    );

    revalidatePath("/dashboard/classes");
    revalidatePath("/dashboard/students");
    revalidatePath("/dashboard/fees");
    revalidatePath("/dashboard/events");
    revalidatePath("/dashboard/announcements");

    await writeActionAuditLog({
      startedAt,
      action: "class_structure.replace",
      category: "academics",
      summary: `Replaced school class structure with ${data.streamCount} stream${
        data.streamCount === 1 ? "" : "s"
      }`,
      entity: {
        type: "class_structure",
        id: data.streamCount,
        label: `${data.streamCount} stream${
          data.streamCount === 1 ? "" : "s"
        }`,
      },
      metadata: {
        streamCount: data.streamCount,
        createdClassCount: createdTargetCount,
        reusedClassCount: matchedTargetCount,
        removedClassCount: removedClassPlans.length,
        renamedClassCount: renamedTargetCount,
        remappedClassNames: removedClassPlans.map((removedClass) => ({
          from: removedClass.existingClass.name,
          to: removedClass.fallbackTargetName,
          grade: getGradeLabel(removedClass.gradeLevel),
        })),
      },
    });

    return {
      success: true,
      error: false,
      message: `Updated the school class structure from Creche to JHS 3 with ${
        data.streamCount
      } stream${data.streamCount === 1 ? "" : "s"} from KG 1 to JHS 3. Created ${createdTargetCount} class${
        createdTargetCount === 1 ? "" : "es"
      } and removed ${removedClassPlans.length}.`,
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      error: true,
      message: "Failed to update the school class structure.",
    };
  }
};

export const updateClass = async (
  currentState: ActionState,
  data: ClassSchema
): Promise<ActionState> => {
  const startedAt = Date.now();

  if (!data.id) {
    return { success: false, error: true, message: "Class ID is required!" };
  }

  try {
    //* RBAC — only admins can update classes
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return { success: false, error: true, message: "Unauthorized: Only admins can update classes." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.class.update({
        where: { id: data.id },
        data: {
          name: data.name.trim(),
          capacity: data.capacity,
          gradeId: data.gradeId,
          supervisorId: data.supervisorId || null,
        },
      });

      await tx.student.updateMany({
        where: { classId: data.id },
        data: { gradeId: data.gradeId },
      });
    });

    revalidatePath("/dashboard/classes");
    revalidatePath("/dashboard/students");
    revalidatePath(`/dashboard/classes/${data.id}`);
    await writeActionAuditLog({
      startedAt,
      action: "class.update",
      category: "academics",
      summary: `Updated class ${data.name}`,
      entity: {
        type: "class",
        id: data.id,
        label: data.name,
      },
      metadata: {
        gradeId: data.gradeId,
        capacity: data.capacity,
        supervisorId: data.supervisorId || null,
      },
    });
    return { success: true, error: false, message: "Class updated successfully!" };
  } catch (err) {
    console.error(err);
    if (getUniqueConstraintField(err) === "name") {
      return {
        success: false,
        error: true,
        message: "A class with this name already exists.",
      };
    }
    return { success: false, error: true, message: "Failed to update class!" };
  }
};

export const deleteClass = async (
  currentState: ActionState,
  data: FormData
): Promise<ActionState> => {
  const startedAt = Date.now();
  const id = data.get("id") as string;

  try {
    //* RBAC — only admins can delete classes
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return { success: false, error: true, message: "Unauthorized: Only admins can delete classes." };
    }

    await prisma.class.delete({
      where: { id: parseInt(id) },
    });

    revalidatePath("/dashboard/classes");
    revalidatePath("/dashboard/students");
    await writeActionAuditLog({
      startedAt,
      action: "class.delete",
      category: "academics",
      summary: `Deleted class ${id}`,
      entity: {
        type: "class",
        id,
      },
    });
    return { success: true, error: false, message: "Class deleted successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to delete class!" };
  }
};

export const updateClassSubjectTeacherAssignments = async (
  currentState: ActionState,
  data: ClassSubjectTeacherAssignmentsPayload
): Promise<ActionState> => {
  const startedAt = Date.now();
  const classId = Number(data.classId);

  if (!Number.isInteger(classId) || classId <= 0) {
    return { success: false, error: true, message: "Invalid class ID!" };
  }

  const assignmentMap = new Map<number, string>();

  for (const assignment of data.assignments || []) {
    const subjectId = Number(assignment.subjectId);
    const teacherId = assignment.teacherId?.trim();

    if (!Number.isInteger(subjectId) || subjectId <= 0 || !teacherId) {
      continue;
    }

    assignmentMap.set(subjectId, teacherId);
  }

  const assignments = Array.from(assignmentMap.entries()).map(([subjectId, teacherId]) => ({
    subjectId,
    teacherId,
  }));

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return {
        success: false,
        error: true,
        message: "Unauthorized: Only admins can update class subject teachers.",
      };
    }

    const [classRecord, subjects, teachers] = await Promise.all([
      prisma.class.findUnique({
        where: { id: classId },
        select: { id: true, name: true },
      }),
      prisma.subject.findMany({
        where: {
          id: {
            in: assignments.map((assignment) => assignment.subjectId),
          },
        },
        select: { id: true },
      }),
      prisma.teacher.findMany({
        where: {
          id: {
            in: assignments.map((assignment) => assignment.teacherId),
          },
        },
        select: { id: true },
      }),
    ]);

    if (!classRecord) {
      return { success: false, error: true, message: "Class not found." };
    }

    const subjectIds = new Set(subjects.map((subject) => subject.id));
    const teacherIds = new Set(teachers.map((teacher) => teacher.id));
    const hasInvalidAssignment = assignments.some(
      (assignment) =>
        !subjectIds.has(assignment.subjectId) || !teacherIds.has(assignment.teacherId)
    );

    if (hasInvalidAssignment) {
      return {
        success: false,
        error: true,
        message: "One or more subject teacher assignments are invalid.",
      };
    }

    await prisma.$transaction(async (tx) => {
      if (assignments.length === 0) {
        await tx.classSubjectTeacher.deleteMany({ where: { classId } });
        return;
      }

      await tx.classSubjectTeacher.deleteMany({
        where: {
          classId,
          subjectId: {
            notIn: assignments.map((assignment) => assignment.subjectId),
          },
        },
      });

      for (const assignment of assignments) {
        await tx.classSubjectTeacher.upsert({
          where: {
            classId_subjectId: {
              classId,
              subjectId: assignment.subjectId,
            },
          },
          create: {
            classId,
            subjectId: assignment.subjectId,
            teacherId: assignment.teacherId,
          },
          update: {
            teacherId: assignment.teacherId,
          },
        });
      }
    });

    revalidatePath("/dashboard/classes");
    revalidatePath(`/dashboard/classes/${classId}`);
    revalidatePath("/dashboard/lessons");
    await writeActionAuditLog({
      startedAt,
      action: "class_subject_teacher.update",
      category: "academics",
      summary: `Updated subject teachers for ${classRecord.name}`,
      entity: {
        type: "class",
        id: classId,
        label: classRecord.name,
      },
      metadata: {
        assignmentCount: assignments.length,
      },
    });

    return {
      success: true,
      error: false,
      message: "Class subject teachers updated successfully!",
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      error: true,
      message: "Failed to update class subject teachers!",
    };
  }
};

//! SUBJECT ACTIONS
export const createSubject = async (
  currentState: ActionState,
  data: SubjectSchema
): Promise<ActionState> => {
  const startedAt = Date.now();
  const subjectName = data.name.trim();
  const teacherIds = Array.from(new Set(data.teachers.filter(Boolean)));

  if (!subjectName) {
    return { success: false, error: true, message: "Subject name is required!" };
  }

  try {
    await requireAdmin();
    const existingSubject = await prisma.subject.findUnique({
      where: { name: subjectName },
      include: {
        teachers: {
          select: { id: true },
        },
      },
    });

    if (existingSubject) {
      const existingTeacherIds = new Set(
        existingSubject.teachers.map((teacher) => teacher.id)
      );
      const teacherIdsToConnect = teacherIds.filter(
        (teacherId) => !existingTeacherIds.has(teacherId)
      );

      if (teacherIdsToConnect.length > 0) {
        await prisma.subject.update({
          where: { id: existingSubject.id },
          data: {
            teachers: {
              connect: teacherIdsToConnect.map((teacherId) => ({ id: teacherId })),
            },
          },
        });
      }

      revalidatePath("/dashboard/subjects");
      await writeActionAuditLog({
        startedAt,
        action: "subject.attach_teachers",
        category: "academics",
        summary: `Attached teachers to existing subject ${subjectName}`,
        entity: {
          type: "subject",
          id: existingSubject.id,
          label: subjectName,
        },
        metadata: {
          teacherCount: teacherIds.length,
          newTeacherCount: teacherIdsToConnect.length,
        },
      });

      return {
        success: true,
        error: false,
        message:
          teacherIdsToConnect.length > 0
            ? "Subject already exists; teacher assignments updated."
            : "Subject already exists.",
      };
    }

    const subject = await prisma.subject.create({
      data: {
        name: subjectName,
        teachers: {
          connect: teacherIds.map((teacherId) => ({ id: teacherId })),
        },
      },
    });

    revalidatePath("/dashboard/subjects");
    await writeActionAuditLog({
      startedAt,
      action: "subject.create",
      category: "academics",
      summary: `Created subject ${subjectName}`,
      entity: {
        type: "subject",
        id: subject.id,
        label: subjectName,
      },
      metadata: {
        teacherCount: teacherIds.length,
      },
    });
    return { success: true, error: false, message: "Subject created successfully!" };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return {
        success: false,
        error: true,
        message: "A subject with this name already exists.",
      };
    }

    console.error(err);
    return { success: false, error: true, message: "Failed to create subject!" };
  }
};

export const updateSubject = async (
  currentState: ActionState,
  data: SubjectSchema
): Promise<ActionState> => {
  const startedAt = Date.now();

  if (!data.id) {
    return { success: false, error: true, message: "Subject ID is required!" };
  }

  try {
    await requireAdmin();
    await prisma.subject.update({
      where: { id: data.id },
      data: {
        name: data.name,
        teachers: {
          set: data.teachers.map((teacherId) => ({ id: teacherId })),
        },
      },
    });

    revalidatePath("/dashboard/subjects");
    await writeActionAuditLog({
      startedAt,
      action: "subject.update",
      category: "academics",
      summary: `Updated subject ${data.name}`,
      entity: {
        type: "subject",
        id: data.id,
        label: data.name,
      },
      metadata: {
        teacherCount: data.teachers.length,
      },
    });
    return { success: true, error: false, message: "Subject updated successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to update subject!" };
  }
};

export const deleteSubject = async (
  currentState: ActionState,
  data: FormData
): Promise<ActionState> => {
  const startedAt = Date.now();
  const id = data.get("id") as string;

  try {
    await requireAdmin();
    await prisma.subject.delete({
      where: { id: parseInt(id) },
    });

    revalidatePath("/dashboard/subjects");
    await writeActionAuditLog({
      startedAt,
      action: "subject.delete",
      category: "academics",
      summary: `Deleted subject ${id}`,
      entity: {
        type: "subject",
        id,
      },
    });
    return { success: true, error: false, message: "Subject deleted successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to delete subject!" };
  }
};

//! EXAM ACTIONS
export const createExam = async (
  currentState: ActionState,
  data: ExamSchema
): Promise<ActionState> => {
  const startedAt = Date.now();
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { success: false, error: true, message: "Unauthorized action." };
  }

  const role = session.user.role;
  if (role === "student" || role === "parent") {
    return { success: false, error: true, message: "Only staff can create exams." };
  }

  if (role === "teacher") {
    const lesson = await prisma.lesson.findUnique({
      where: { id: data.lessonId },
      select: { teacherId: true },
    });

    if (!lesson) {
      return { success: false, error: true, message: "Lesson not found." };
    }

    if (lesson.teacherId !== session.user.id) {
      return { success: false, error: true, message: "You can only create exams for your lessons." };
    }
  }

  try {
    const exam = await prisma.exam.create({
      data: {
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        lessonId: data.lessonId,
      },
    });

    revalidatePath("/dashboard/exams");
    await writeActionAuditLog({
      startedAt,
      action: "exam.create",
      category: "assessments",
      summary: `Created exam ${data.title}`,
      entity: {
        type: "exam",
        id: exam.id,
        label: data.title,
      },
      metadata: {
        lessonId: data.lessonId,
        ownerRole: role,
      },
    });
    return { success: true, error: false, message: "Exam created successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to create exam!" };
  }
};

export const updateExam = async (
  currentState: ActionState,
  data: ExamSchema
): Promise<ActionState> => {
  const startedAt = Date.now();

  if (!data.id) {
    return { success: false, error: true, message: "Exam ID is required!" };
  }

  try {
    await requireStaff();
    await prisma.exam.update({
      where: { id: data.id },
      data: {
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        lessonId: data.lessonId,
      },
    });

    revalidatePath("/dashboard/exams");
    await writeActionAuditLog({
      startedAt,
      action: "exam.update",
      category: "assessments",
      summary: `Updated exam ${data.title}`,
      entity: {
        type: "exam",
        id: data.id,
        label: data.title,
      },
      metadata: {
        lessonId: data.lessonId,
      },
    });
    return { success: true, error: false, message: "Exam updated successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to update exam!" };
  }
};

export const deleteExam = async (
  currentState: ActionState,
  data: FormData
): Promise<ActionState> => {
  const startedAt = Date.now();
  const examId = Number.parseInt(data.get("id") as string, 10);

  if (!Number.isInteger(examId) || examId <= 0) {
    return { success: false, error: true, message: "Invalid exam ID!" };
  }

  try {
    await requireStaff();
    const existingExam = await prisma.exam.findUnique({
      where: { id: examId },
      select: { id: true },
    });

    if (!existingExam) {
      return { success: false, error: true, message: "Exam not found." };
    }

    await prisma.$transaction(async (tx) => {
      await deleteExamsWithDependencies(tx, [examId]);
    });

    revalidatePath("/dashboard/exams");
    await writeActionAuditLog({
      startedAt,
      action: "exam.delete",
      category: "assessments",
      summary: `Deleted exam ${examId}`,
      entity: {
        type: "exam",
        id: examId,
      },
    });
    return { success: true, error: false, message: "Exam deleted successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to delete exam!" };
  }
};

//! PARENT ACTIONS
export const createParent = async (
  currentState: ActionState,
  data: ParentSchema
): Promise<ActionState> => {
  const startedAt = Date.now();

  try {
    //* RBAC — only admins can directly create parents
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return { success: false, error: true, message: "Unauthorized: Only admins can create parents." };
    }

    const hashedPassword = await bcrypt.hash(data.password || DEFAULT_PARENT_PASSWORD, 10);
    const parentUserId = await generateParentUserId();

    const parent = await prisma.parent.create({
      data: {
        username: data.username,
        parentUserId,
        password: hashedPassword,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone,
        address: data.address,
        img: data.img || null,
      },
    });

    revalidatePath("/dashboard/parents");
    await writeActionAuditLog({
      startedAt,
      action: "parent.create",
      category: "user_management",
      summary: `Created parent ${data.name} ${data.surname}`,
      entity: {
        type: "parent",
        id: parent.id,
        label: `${data.name} ${data.surname}`,
      },
      metadata: {
        parentUserId,
        username: data.username,
        hasEmail: Boolean(data.email),
      },
    });
    return { success: true, error: false, message: "Parent created successfully!" };
  } catch (err) {
    const conflictField = getUniqueConstraintField(err);
    if (conflictField) {
      if (conflictField.includes("username")) {
        return {
          success: false,
          error: true,
          message: "Username already exists. Please choose a different username.",
        };
      }
      if (conflictField.includes("email")) {
        return {
          success: false,
          error: true,
          message: "Email already exists. Please use a different email address.",
        };
      }
      if (conflictField.includes("parentUserId")) {
        return {
          success: false,
          error: true,
          message: "Parent ID generation failed due to a duplicate value. Please try again.",
        };
      }
      return {
        success: false,
        error: true,
        message: "A parent with one of these details already exists.",
      };
    }
    console.error(err);
    return { success: false, error: true, message: "Failed to create parent!" };
  }
};

export const updateParent = async (
  currentState: ActionState,
  data: ParentSchema
): Promise<ActionState> => {
  const startedAt = Date.now();

  if (!data.id) {
    return { success: false, error: true, message: "Parent ID is required!" };
  }

  try {
    await requireAdmin();
    const isProfileComplete = Boolean(
      data.username?.trim() &&
      data.name?.trim() &&
      data.surname?.trim() &&
      data.phone?.trim()
    );

    const updateData: any = {
      username: data.username,
      name: data.name,
      surname: data.surname,
      email: data.email || null,
      phone: data.phone,
      address: data.address,
      img: data.img || null,
      isProfileComplete,
    };

    if (data.password && data.password !== "") {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    await prisma.parent.update({
      where: { id: data.id },
      data: updateData,
    });

    revalidatePath("/dashboard/parents");
    await writeActionAuditLog({
      startedAt,
      action: "parent.update",
      category: "user_management",
      summary: `Updated parent ${data.name} ${data.surname}`,
      entity: {
        type: "parent",
        id: data.id,
        label: `${data.name} ${data.surname}`,
      },
      metadata: {
        username: data.username,
        hasEmail: Boolean(data.email),
        profileComplete: isProfileComplete,
        passwordChanged: Boolean(data.password),
      },
    });
    return { success: true, error: false, message: "Parent updated successfully!" };
  } catch (err) {
    const conflictField = getUniqueConstraintField(err);
    if (conflictField) {
      if (conflictField.includes("username")) {
        return {
          success: false,
          error: true,
          message: "Username already exists. Please choose a different username.",
        };
      }
      if (conflictField.includes("email")) {
        return {
          success: false,
          error: true,
          message: "Email already exists. Please use a different email address.",
        };
      }
      if (conflictField.includes("parentUserId")) {
        return {
          success: false,
          error: true,
          message: "Update failed because the parent ID is already in use.",
        };
      }
      return {
        success: false,
        error: true,
        message: "Update failed because one of the values is already in use.",
      };
    }
    console.error(err);
    return { success: false, error: true, message: "Failed to update parent!" };
  }
};

export const deleteParent = async (
  currentState: ActionState,
  data: FormData
): Promise<ActionState> => {
  const startedAt = Date.now();
  const id = data.get("id") as string;

  try {
    //* RBAC — only admins can delete parents
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return { success: false, error: true, message: "Unauthorized: Only admins can delete parents." };
    }

    await prisma.parent.delete({
      where: { id },
    });

    revalidatePath("/dashboard/parents");
    await writeActionAuditLog({
      startedAt,
      action: "parent.delete",
      category: "user_management",
      summary: `Deleted parent ${id}`,
      entity: {
        type: "parent",
        id,
      },
    });
    return { success: true, error: false, message: "Parent deleted successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to delete parent!" };
  }
};

//! ANNOUNCEMENT ACTIONS
export const createAnnouncement = async (
  currentState: ActionState,
  data: AnnouncementSchema
): Promise<ActionState> => {
  const startedAt = Date.now();

  try {
    await requireStaff();
    const announcement = await prisma.announcement.create({
      data: {
        title: data.title,
        description: data.description,
        date: data.date,
        classId: data.classId || null,
      },
    });

    //* SMS broadcast, deferred past the response but kept alive by after().
    if (data.sendSms) {
      runAfterResponse("SMS", () =>
        sendAnnouncementSMS(data.title, data.description, data.classId)
      );
    }

    revalidatePath("/dashboard/announcements");
    await writeActionAuditLog({
      startedAt,
      action: "announcement.create",
      category: "communication",
      summary: `Created announcement ${data.title}`,
      entity: {
        type: "announcement",
        id: announcement.id,
        label: data.title,
      },
      metadata: {
        classId: data.classId || null,
        sendSms: Boolean(data.sendSms),
      },
    });
    return { success: true, error: false, message: "Announcement created successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to create announcement!" };
  }
};

export const updateAnnouncement = async (
  currentState: ActionState,
  data: AnnouncementSchema
): Promise<ActionState> => {
  const startedAt = Date.now();

  if (!data.id) {
    return { success: false, error: true, message: "Announcement ID is required!" };
  }

  try {
    await requireStaff();
    await prisma.announcement.update({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description,
        date: data.date,
        classId: data.classId || null,
      },
    });

    revalidatePath("/dashboard/announcements");
    await writeActionAuditLog({
      startedAt,
      action: "announcement.update",
      category: "communication",
      summary: `Updated announcement ${data.title}`,
      entity: {
        type: "announcement",
        id: data.id,
        label: data.title,
      },
      metadata: {
        classId: data.classId || null,
      },
    });
    return { success: true, error: false, message: "Announcement updated successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to update announcement!" };
  }
};

export const deleteAnnouncement = async (
  currentState: ActionState,
  data: FormData
): Promise<ActionState> => {
  const startedAt = Date.now();
  const id = data.get("id") as string;

  try {
    await requireStaff();
    await prisma.announcement.delete({
      where: { id: parseInt(id) },
    });

    revalidatePath("/dashboard/announcements");
    await writeActionAuditLog({
      startedAt,
      action: "announcement.delete",
      category: "communication",
      summary: `Deleted announcement ${id}`,
      entity: {
        type: "announcement",
        id,
      },
    });
    return { success: true, error: false, message: "Announcement deleted successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to delete announcement!" };
  }
};

export const createAssignmentQuestion = async (
  currentState: ActionState,
  formData: FormData
): Promise<ActionState> => {
  try {
    await requireStaff();
    const assignmentId = parseInt(formData.get("assignmentId") as string);
    const questionType = formData.get("questionType") as string;
    const questionText = formData.get("questionText") as string;
    const points = parseInt(formData.get("points") as string);
    const file = formData.get("file") as File | null;
    const optionsJson = formData.get("options") as string;

    //* Handle file upload (in a real app, you'd upload to cloud storage)
    let fileUrl = null;
    let fileType = null;
    if (file && file.size > 0) {
      //* For now, we'll store the filename
      //* In production, upload to cloud storage (AWS S3, Cloudinary, etc.)
      fileUrl = `/uploads/${Date.now()}-${file.name}`;
      fileType = file.type.split("/")[1];
    }

    //* Create the question
    const question = await prisma.assignmentQuestion.create({
      data: {
        assignmentId,
        questionType: questionType as any,
        questionText,
        points,
        fileUrl,
        fileType,
      },
    });

    //* Create options if multiple choice
    if (questionType === "MULTIPLE_CHOICE" && optionsJson) {
      const options = JSON.parse(optionsJson);
      await prisma.questionOption.createMany({
        data: options.map((opt: any) => ({
          questionId: question.id,
          optionText: opt.text,
          isCorrect: opt.isCorrect,
        })),
      });
    }

    revalidatePath(`/dashboard/assignments/${assignmentId}`);
    return { success: true, error: false, message: "Question added successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to add question!" };
  }
};

//! SUBMIT STUDENT ANSWERS
export const submitStudentAnswers = async (
  formData: FormData
): Promise<ActionState> => {
  try {
    const assignmentId = parseInt(formData.get("assignmentId") as string);
    const studentId = formData.get("studentId") as string;
    //* studentId arrives in the form, so it has to be checked against the
    //* caller — otherwise one student can submit answers as another.
    await requireStudentAccess(studentId);
    const answersJson = formData.get("answers") as string;
    const answers = JSON.parse(answersJson);

    //* Get all questions for this assignment
    const questions = await prisma.assignmentQuestion.findMany({
      where: { assignmentId },
      include: { options: true },
    });

    let totalScore = 0;

    //* Process each answer
    for (const question of questions) {
      const answer = answers[question.id];
      if (!answer) continue;

      let isCorrect: boolean | null = null;
      let pointsEarned = 0;
      let answerText: string | null = null;
      let selectedOptionId: number | null = null;

      if (question.questionType === "MULTIPLE_CHOICE") {
        //? Check if selected option is correct
        selectedOptionId = answer.value;
        const selectedOption = question.options.find((opt: any) => opt.id === selectedOptionId);
        isCorrect = selectedOption?.isCorrect || false;
        pointsEarned = isCorrect ? question.points : 0;
        totalScore += pointsEarned;
      } else if (question.questionType === "THEORY") {
        //* Theory questions need manual grading, so set to null
        answerText = answer.value;
        isCorrect = null;
        pointsEarned = 0;
      }

      //* Save or update the answer
      await prisma.studentAnswer.upsert({
        where: {
          studentId_questionId: {
            studentId,
            questionId: question.id,
          },
        },
        update: {
          answerText,
          selectedOptionId,
          isCorrect,
          pointsEarned,
        },
        create: {
          studentId,
          questionId: question.id,
          answerText,
          selectedOptionId,
          isCorrect,
          pointsEarned,
        },
      });
    }

    //* Create or update Result entry for the submission
    await prisma.result.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId,
        },
      },
      update: {
        score: totalScore,
      },
      create: {
        score: totalScore,
        assignmentId,
        studentId,
      },
    });

    revalidatePath(`/dashboard/assignments/${assignmentId}`);
    return { success: true, error: false, message: "Assignment submitted successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to submit assignment!" };
  }
};

export const createExamQuestion = async (
  currentState: ActionState,
  formData: FormData
): Promise<ActionState> => {
  try {
    await requireStaff();
    const examId = parseInt(formData.get("examId") as string);
    const questionType = formData.get("questionType") as string;
    const questionText = formData.get("questionText") as string;
    const points = parseInt(formData.get("points") as string);
    const file = formData.get("file") as File | null;
    const optionsJson = formData.get("options") as string;

    //* Handle file upload (in a real app, you'd upload to cloud storage)
    let fileUrl = null;
    let fileType = null;
    if (file && file.size > 0) {
      //* For now, we'll store the filename
      //* In production, upload to cloud storage (AWS S3, Cloudinary, etc.)
      fileUrl = `/uploads/${Date.now()}-${file.name}`;
      fileType = file.type.split("/")[1];
    }

    //* Create the question
    const question = await prisma.examQuestion.create({
      data: {
        examId,
        questionType: questionType as any,
        questionText,
        points,
        fileUrl,
        fileType,
      },
    });

    //* Create options if multiple choice
    if (questionType === "MULTIPLE_CHOICE" && optionsJson) {
      const options = JSON.parse(optionsJson);
      await prisma.examQuestionOption.createMany({
        data: options.map((opt: any) => ({
          questionId: question.id,
          optionText: opt.text,
          isCorrect: opt.isCorrect,
        })),
      });
    }

    revalidatePath(`/dashboard/exams/${examId}`);
    return { success: true, error: false, message: "Question added successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to add question!" };
  }
};

//! SUBMIT STUDENT EXAM ANSWERS
export const submitStudentExamAnswers = async (
  formData: FormData
): Promise<ActionState> => {
  try {
    const examId = parseInt(formData.get("examId") as string);
    const studentId = formData.get("studentId") as string;
    //* Same as assignment submission: the student ID is caller-supplied.
    await requireStudentAccess(studentId);
    const answersJson = formData.get("answers") as string;
    const answers = JSON.parse(answersJson);

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: { startTime: true, endTime: true },
    });

    if (!exam) {
      return { success: false, error: true, message: "Exam not found." };
    }

    const now = new Date();
    if (now < exam.startTime) {
      return { success: false, error: true, message: "This exam has not opened yet." };
    }
    if (now > exam.endTime) {
      return { success: false, error: true, message: "This exam has closed and can no longer be submitted." };
    }

    //* Get all questions for this exam
    const questions = await prisma.examQuestion.findMany({
      where: { examId },
      include: { options: true },
    });

    let totalScore = 0;

    //* Process each answer
    for (const question of questions) {
      const answer = answers[question.id];
      if (!answer) continue;

      let isCorrect: boolean | null = null;
      let pointsEarned = 0;
      let answerText: string | null = null;
      let selectedOptionId: number | null = null;

      if (question.questionType === "MULTIPLE_CHOICE") {
        //? Check if selected option is correct
        selectedOptionId = answer.value;
        const selectedOption = question.options.find((opt: any) => opt.id === selectedOptionId);
        isCorrect = selectedOption?.isCorrect || false;
        pointsEarned = isCorrect ? question.points : 0;
        totalScore += pointsEarned;
      } else if (question.questionType === "THEORY") {
        //* Theory questions need manual grading, so set to null
        answerText = answer.value;
        isCorrect = null;
        pointsEarned = 0;
      }

      //* Save or update the answer
      await prisma.studentExamAnswer.upsert({
        where: {
          studentId_questionId: {
            studentId,
            questionId: question.id,
          },
        },
        update: {
          answerText,
          selectedOptionId,
          isCorrect,
          pointsEarned,
        },
        create: {
          studentId,
          questionId: question.id,
          answerText,
          selectedOptionId,
          isCorrect,
          pointsEarned,
        },
      });
    }

    //* Create or update Result entry for the submission
    await prisma.result.upsert({
      where: {
        examId_studentId: {
          examId,
          studentId,
        },
      },
      update: {
        score: totalScore,
      },
      create: {
        score: totalScore,
        examId,
        studentId,
      },
    });

    revalidatePath(`/dashboard/exams/${examId}`);
    return { success: true, error: false, message: "Exam submitted successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to submit exam!" };
  }
};

//! SEND MESSAGE
export const sendMessage = async (
  formData: FormData
): Promise<ActionState> => {
  try {
    const actor = await requireSession();
    //* The sender is taken from the session, not the form. Trusting the posted
    //* values let anyone send a message that appears to come from someone else.
    const senderId = actor.id;
    const senderType = actor.role.toUpperCase();
    const receiverId = formData.get("receiverId") as string;
    const receiverType = formData.get("receiverType") as string;
    const subject = formData.get("subject") as string;
    const content = formData.get("content") as string;

    await prisma.message.create({
      data: {
        senderId,
        senderType: senderType as any,
        receiverId,
        receiverType: receiverType as any,
        subject,
        content,
      },
    });

    revalidatePath("/dashboard/messages");
    return { success: true, error: false, message: "Message sent successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to send message!" };
  }
};

//! MARK MESSAGE AS READ
export const markMessageAsRead = async (
  messageId: number
): Promise<ActionState> => {
  try {
    const actor = await requireSession();

    //* Scoped to the recipient. An unscoped update by id let any signed-in
    //* user change the read state of anyone's mail.
    const result = await prisma.message.updateMany({
      where: { id: messageId, receiverId: actor.id },
      data: { read: true },
    });

    if (result.count === 0) {
      return { success: false, error: true, message: "Message not found!" };
    }

    revalidatePath("/dashboard/messages");
    return { success: true, error: false };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to mark message as read!" };
  }
};

//! TOGGLE MESSAGE STARRED
export const toggleMessageStarred = async (
  messageId: number,
  starred: boolean
): Promise<ActionState> => {
  try {
    const actor = await requireSession();

    //* Either party to the message may star it; nobody else may.
    const result = await prisma.message.updateMany({
      where: {
        id: messageId,
        OR: [{ receiverId: actor.id }, { senderId: actor.id }],
      },
      data: { starred },
    });

    if (result.count === 0) {
      return { success: false, error: true, message: "Message not found!" };
    }

    revalidatePath("/dashboard/messages");
    return { success: true, error: false };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to update message!" };
  }
};

//! UPDATE USER PROFILE
export const updateUserProfile = async (
  formData: FormData
): Promise<ActionState> => {
  try {
    const userId = formData.get("userId") as string;
    //* Both the user ID and the type come from the form, so without this an
    //* ordinary user could edit anyone else's profile by changing them.
    await requireSelfOrAdmin(userId);
    const userType = formData.get("userType") as string;
    const name = formData.get("name") as string;
    const surname = formData.get("surname") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const profileImage = formData.get("profileImage") as File | null;

    //* Prepare update data
    const updateData: any = {
      name,
      surname,
      email: email || null,
      phone: phone || null,
    };

    //* Admin doesn't have surname in schema
    if (userType === "ADMIN") {
      delete updateData.surname;
    }

    //* Handle image upload if provided
    if (profileImage) {
      try {
        const bytes = await profileImage.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        //* Create unique filename
        const timestamp = Date.now();
        const filename = `${userId}-${timestamp}-${profileImage.name}`;
        const uploadDir = path.join(process.cwd(), "public/uploads");
        
        //* Ensure upload directory exists
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        const filepath = path.join(uploadDir, filename);
        fs.writeFileSync(filepath, buffer);
        
        //* Store relative path in database
        updateData.img = `/uploads/${filename}`;
      } catch (imageError) {
        console.error("Image upload error:", imageError);
        return { success: false, error: true, message: "Failed to upload image" };
      }
    }

    //* If password change is requested, verify current password and hash new one
    if (currentPassword && newPassword) {
      let currentUser: { password: string } | null = null;

      //* Password hashes are omitted from query results by default, so this
      //* read has to ask for the field explicitly.
      const credentialSelect = { password: true } as const;

      //* Fetch user based on type
      if (userType === "STUDENT") {
        currentUser = await prisma.student.findUnique({
          where: { id: userId },
          select: credentialSelect,
        });
      } else if (userType === "TEACHER") {
        currentUser = await prisma.teacher.findUnique({
          where: { id: userId },
          select: credentialSelect,
        });
      } else if (userType === "PARENT") {
        currentUser = await prisma.parent.findUnique({
          where: { id: userId },
          select: credentialSelect,
        });
      } else if (userType === "ADMIN") {
        currentUser = await prisma.admin.findUnique({
          where: { id: userId },
          select: credentialSelect,
        });
      }

      if (!currentUser) {
        return { success: false, error: true, message: "User not found!" };
      }

      //? Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, currentUser.password);
      if (!isPasswordValid) {
        return { success: false, error: true, message: "Current password is incorrect!" };
      }

      //* Hash new password
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    //* Update user based on type
    if (userType === "STUDENT") {
      await prisma.student.update({
        where: { id: userId },
        data: updateData,
      });
    } else if (userType === "TEACHER") {
      await prisma.$transaction(async (tx) => {
        const teacher = await tx.teacher.update({
          where: { id: userId },
          data: updateData,
          //* Staff-profile sync carries the existing hash across, so this call
          //* opts out of the default password omit.
          omit: { password: false },
        });

        await syncTeacherStaffProfile(tx, {
          id: teacher.id,
          username:
            typeof updateData.username === "string"
              ? updateData.username
              : teacher.username,
          staffId: teacher.staffId,
          staffProfileId: teacher.staffProfileId,
          password:
            typeof updateData.password === "string"
              ? updateData.password
              : teacher.password,
          name:
            typeof updateData.name === "string" ? updateData.name : teacher.name,
          surname:
            typeof updateData.surname === "string"
              ? updateData.surname
              : teacher.surname,
          email:
            updateData.email !== undefined
              ? ((updateData.email as string | null) ?? null)
              : teacher.email,
          phone:
            updateData.phone !== undefined
              ? ((updateData.phone as string | null) ?? null)
              : teacher.phone,
          address:
            typeof updateData.address === "string"
              ? updateData.address
              : teacher.address,
          img:
            updateData.img !== undefined
              ? ((updateData.img as string | null) ?? null)
              : teacher.img,
          sex:
            updateData.sex === "MALE" || updateData.sex === "FEMALE"
              ? updateData.sex
              : teacher.sex,
          birthday:
            updateData.birthday instanceof Date
              ? updateData.birthday
              : teacher.birthday,
          permissions: teacher.permissions ?? null,
        });
      });
    } else if (userType === "PARENT") {
      await prisma.parent.update({
        where: { id: userId },
        data: updateData,
      });
    } else if (userType === "ADMIN") {
      await prisma.$transaction(async (tx) => {
        const admin = await tx.admin.update({
          where: { id: userId },
          data: updateData,
          //* Staff-profile sync carries the existing hash across, so this call
          //* opts out of the default password omit.
          omit: { password: false },
        });

        await syncAdminStaffProfile(tx, {
          id: admin.id,
          username:
            typeof updateData.username === "string"
              ? updateData.username
              : admin.username,
          staffId: admin.staffId,
          staffProfileId: admin.staffProfileId,
          password:
            typeof updateData.password === "string"
              ? updateData.password
              : admin.password,
          name:
            typeof updateData.name === "string" ? updateData.name : admin.name,
          email:
            updateData.email !== undefined
              ? ((updateData.email as string | null) ?? null)
              : admin.email,
          phone: admin.phone ?? null,
          img:
            updateData.img !== undefined
              ? ((updateData.img as string | null) ?? null)
              : admin.img,
          role:
            updateData.role === "SUPER_ADMIN" || updateData.role === "ADMIN"
              ? updateData.role
              : admin.role,
          permissions: admin.permissions ?? null,
        });
      });
    }

    revalidatePath("/dashboard");
    return { success: true, error: false, message: "Profile updated successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to update profile!" };
  }
};

//! FEE ACTIONS
export const createFee = async (
  currentState: ActionState,
  data: FeeSchema
): Promise<ActionState> => {
  const startedAt = Date.now();

  try {
    await requireFeeAccess("schoolFees");
    //* Unstamped, the fee matches no term the Fees table can filter for and the
    //* student appears to have been given nothing.
    const period = await getCurrentFeePeriod();
    const fee = await prisma.fee.create({
      data: {
        title: data.title,
        amount: data.amount,
        dueDate: data.dueDate,
        status: data.status,
        description: data.description || null,
        studentId: data.studentId,
        term: period.term,
        academicYear: period.academicYear,
      },
    });

    revalidatePath("/dashboard/fees");
    await writeActionAuditLog({
      startedAt,
      action: "fee.create",
      category: "finance",
      summary: `Created fee ${data.title}`,
      entity: {
        type: "fee",
        id: fee.id,
        label: data.title,
      },
      metadata: {
        studentId: data.studentId,
        amount: data.amount,
        status: data.status,
      },
    });
    return { success: true, error: false, message: "Fee created successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to create fee!" };
  }
};

export const createGradeFee = async (
  currentState: ActionState,
  data: {
    title: string;
    amount: number;
    dueDate: Date;
    status: "PENDING" | "PAID" | "OVERDUE";
    description?: string;
    gradeId: number;
  }
): Promise<ActionState> => {
  const startedAt = Date.now();

  try {
    await requireFeeAccess("generateBill");
    const students = await prisma.student.findMany({
      where: { gradeId: data.gradeId },
      select: { id: true },
    });

    if (students.length === 0) {
      return { success: false, error: true, message: "No students found in the selected grade!" };
    }

    const period = await getCurrentFeePeriod();
    const feeData = students.map((student) => ({
      title: data.title,
      amount: data.amount,
      dueDate: data.dueDate,
      status: data.status,
      description: data.description || null,
      studentId: student.id,
      term: period.term,
      academicYear: period.academicYear,
    }));

    await prisma.fee.createMany({
      data: feeData,
    });

    revalidatePath("/dashboard/fees");
    const countMsg = students.length === 1 ? "1 student" : `${students.length} students`;
    await writeActionAuditLog({
      startedAt,
      action: "fee.bulk_create",
      category: "finance",
      summary: `Created ${data.title} for ${countMsg}`,
      entity: {
        type: "grade_fee_batch",
        id: data.gradeId,
        label: data.title,
      },
      metadata: {
        gradeId: data.gradeId,
        studentCount: students.length,
        amount: data.amount,
        status: data.status,
      },
    });
    return { success: true, error: false, message: `Fee created successfully for ${countMsg}!` };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to create fees for the grade!" };
  }
};

export const recordCashPayment = async (
  feeId: number
): Promise<ActionState> => {
  const startedAt = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "admin") {
      return { success: false, error: true, message: "Unauthorized!" };
    }

    const fee = await prisma.fee.findUnique({
      where: { id: feeId },
      include: { student: true },
    });

    if (!fee) {
      return { success: false, error: true, message: "Fee not found!" };
    }

    await prisma.fee.update({
      where: { id: feeId },
      data: {
        status: "PAID",
        paymentMethod: "CASH",
      },
    });

    let auxiliaryAttendanceMarked = false;

    //* If this is an Auxiliary Fee, also mark attendance
    if (fee.title.toLowerCase().includes("auxiliary")) {
      const attendanceDate = new Date(); //* Mark for today when paying cash
      attendanceDate.setHours(0, 0, 0, 0);

      //* 1. Find or Create a "Daily Attendance" Lesson for this class
      let lesson = await prisma.lesson.findFirst({
        where: {
          classId: fee.student.classId,
          name: "Daily Attendance",
        },
      });

      if (!lesson) {
        const classData = await prisma.class.findUnique({
          where: { id: fee.student.classId },
          include: { supervisor: true },
        });

        const subject = await prisma.subject.findFirst() || await prisma.subject.create({ data: { name: "General" } });
        const teacher = classData?.supervisor || await prisma.teacher.findFirst();

        if (teacher) {
          lesson = await prisma.lesson.create({
            data: {
              name: "Daily Attendance",
              classId: fee.student.classId,
              teacherId: teacher.id,
              subjectId: subject.id,
              day: "MONDAY",
              startTime: new Date(),
              endTime: new Date(),
            },
          });
        }
      }

      if (lesson) {
        await prisma.attendance.upsert({
          where: {
            id: (await prisma.attendance.findFirst({
              where: {
                studentId: fee.studentId,
                lessonId: lesson.id,
                date: attendanceDate,
              }
            }))?.id || -1,
          },
          update: { present: true },
          create: {
            studentId: fee.studentId,
            lessonId: lesson.id,
            date: attendanceDate,
            present: true,
          },
        });
        auxiliaryAttendanceMarked = true;
      }
    }

    revalidatePath("/dashboard/fees");
    revalidatePath("/dashboard/attendance");
    await writeActionAuditLog({
      startedAt,
      action: "fee.cash_payment.record",
      category: "finance",
      summary: `Recorded cash payment for ${fee.title}`,
      entity: {
        type: "fee",
        id: feeId,
        label: fee.title,
      },
      metadata: {
        studentId: fee.studentId,
        amount: fee.amount,
        auxiliaryAttendanceMarked,
      },
    });
    return { success: true, error: false, message: "Cash payment recorded successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to record cash payment!" };
  }
};

export const updateFee = async (
  currentState: ActionState,
  data: FeeSchema
): Promise<ActionState> => {
  const startedAt = Date.now();

  if (!data.id) {
    return { success: false, error: true, message: "Fee ID is required!" };
  }

  try {
    await requireFeeEditAccess();
    await prisma.fee.update({
      where: { id: data.id },
      data: {
        title: data.title,
        amount: data.amount,
        dueDate: data.dueDate,
        status: data.status,
        description: data.description || null,
        studentId: data.studentId,
      },
    });

    revalidatePath("/dashboard/fees");
    await writeActionAuditLog({
      startedAt,
      action: "fee.update",
      category: "finance",
      summary: `Updated fee ${data.title}`,
      entity: {
        type: "fee",
        id: data.id,
        label: data.title,
      },
      metadata: {
        studentId: data.studentId,
        amount: data.amount,
        status: data.status,
      },
    });
    return { success: true, error: false, message: "Fee updated successfully!" };
  } catch (err) {
    const authorizationFailure = toActionFailure(err);
    if (authorizationFailure) {
      return authorizationFailure;
    }
    console.error(err);
    return { success: false, error: true, message: "Failed to update fee!" };
  }
};

export const deleteFee = async (
  currentState: ActionState,
  data: FormData
): Promise<ActionState> => {
  const startedAt = Date.now();
  const id = data.get("id") as string;

  try {
    await requireFeeAccess("schoolFees");
    await prisma.fee.delete({
      where: { id: parseInt(id) },
    });

    revalidatePath("/dashboard/fees");
    await writeActionAuditLog({
      startedAt,
      action: "fee.delete",
      category: "finance",
      summary: `Deleted fee ${id}`,
      entity: {
        type: "fee",
        id,
      },
    });
    return { success: true, error: false, message: "Fee deleted successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to delete fee!" };
  }
};

//! EXCURSION ACTIONS
export const saveExcursionCampaign = async (
  currentState: ActionState,
  data: ExcursionCampaignSchema
): Promise<ActionState> => {
  const startedAt = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== "admin" && session.user.role !== "teacher")) {
      return { success: false, error: true, message: "Unauthorized!" };
    }
    const userRole = session.user.role ?? "unknown";

    const classRecord = await prisma.class.findUnique({
      where: { id: data.classId },
      select: {
        id: true,
        supervisorId: true,
        name: true,
      },
    });

    if (!classRecord) {
      return { success: false, error: true, message: "Class not found!" };
    }

    if (session.user.role === "teacher" && classRecord.supervisorId !== session.user.id) {
      return {
        success: false,
        error: true,
        message: "You can only manage the class you supervise.",
      };
    }

    const payload = {
      title: data.title.trim(),
      targetAmount: data.targetAmount,
      classId: classRecord.id,
    };

    let campaignId = data.id ?? null;
    let auditAction = "excursion_campaign.create";

    if (data.id) {
      const existingCampaign = await prisma.excursionCampaign.findUnique({
        where: { id: data.id },
        select: { id: true, classId: true },
      });

      if (!existingCampaign) {
        return { success: false, error: true, message: "Excursion campaign not found!" };
      }

      if (existingCampaign.classId !== classRecord.id) {
        return {
          success: false,
          error: true,
          message: "That excursion campaign does not belong to the selected class.",
        };
      }

      await prisma.excursionCampaign.update({
        where: { id: data.id },
        data: payload,
      });
      auditAction = "excursion_campaign.update";
    } else {
      const campaign = await prisma.excursionCampaign.create({
        data: {
          ...payload,
          createdById: session.user.id,
          createdByRole: userRole,
        },
      });
      campaignId = campaign.id;
    }

    revalidatePath("/dashboard/excursion");
    await writeActionAuditLog({
      startedAt,
      action: auditAction,
      category: "finance",
      summary: `${data.id ? "Updated" : "Created"} excursion campaign ${payload.title}`,
      entity: {
        type: "excursion_campaign",
        id: campaignId,
        label: payload.title,
      },
      metadata: {
        classId: classRecord.id,
        targetAmount: data.targetAmount,
        actorRole: userRole,
      },
    });
    return { success: true, error: false, message: "Excursion target saved successfully!" };
  } catch (err) {
    console.error("saveExcursionCampaign error:", err);
    return { success: false, error: true, message: "Failed to save excursion target!" };
  }
};

export const recordExcursionPayment = async (
  currentState: ActionState,
  data: ExcursionPaymentSchema
): Promise<ActionState> => {
  const startedAt = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== "admin" && session.user.role !== "teacher")) {
      return { success: false, error: true, message: "Unauthorized!" };
    }
    const userRole = session.user.role ?? "unknown";

    const campaign = await prisma.excursionCampaign.findUnique({
      where: { id: data.campaignId },
      include: {
        class: {
          select: {
            id: true,
            supervisorId: true,
          },
        },
      },
    });

    if (!campaign) {
      return { success: false, error: true, message: "Excursion campaign not found!" };
    }

    if (session.user.role === "teacher" && campaign.class.supervisorId !== session.user.id) {
      return {
        success: false,
        error: true,
        message: "You can only record payments for your supervised class.",
      };
    }

    const student = await prisma.student.findFirst({
      where: {
        id: data.studentId,
        classId: campaign.classId,
      },
      select: {
        id: true,
        name: true,
        surname: true,
      },
    });

    if (!student) {
      return { success: false, error: true, message: "Student not found in this class!" };
    }

    const paymentAggregate = await prisma.excursionPayment.aggregate({
      where: {
        campaignId: data.campaignId,
        studentId: data.studentId,
      },
      _sum: {
        amount: true,
      },
    });

    const amountAlreadyPaid = paymentAggregate._sum.amount ?? 0;
    const remaining = campaign.targetAmount - amountAlreadyPaid;

    if (remaining <= 0) {
      return {
        success: false,
        error: true,
        message: "This student has already met the excursion target.",
      };
    }

    if (data.amount > remaining) {
      return {
        success: false,
        error: true,
        message: `Payment exceeds the remaining balance of ${remaining.toFixed(2)}.`,
      };
    }

    const payment = await prisma.excursionPayment.create({
      data: {
        campaignId: data.campaignId,
        studentId: data.studentId,
        amount: data.amount,
        note: data.note || null,
        recordedById: session.user.id,
        recordedByRole: userRole,
      },
    });

    revalidatePath("/dashboard/excursion");
    await writeActionAuditLog({
      startedAt,
      action: "excursion_payment.record",
      category: "finance",
      summary: `Recorded excursion payment for ${student.name} ${student.surname}`,
      entity: {
        type: "excursion_payment",
        id: payment.id,
        label: campaign.title,
      },
      metadata: {
        campaignId: data.campaignId,
        studentId: data.studentId,
        amount: data.amount,
      },
    });
    return {
      success: true,
      error: false,
      message: `Recorded ${data.amount.toFixed(2)} for ${student.name} ${student.surname}.`,
    };
  } catch (err) {
    console.error("recordExcursionPayment error:", err);
    return { success: false, error: true, message: "Failed to record excursion payment!" };
  }
};

export const saveFeeCollectionCampaign = async (
  currentState: ActionState,
  data: FeeCollectionCampaignSchema
): Promise<ActionState> => {
  const startedAt = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== "admin" && session.user.role !== "teacher")) {
      return { success: false, error: true, message: "Unauthorized!" };
    }

    const userRole = session.user.role ?? "unknown";
    const classRecord = await prisma.class.findUnique({
      where: { id: data.classId },
      select: {
        id: true,
        supervisorId: true,
      },
    });

    if (!classRecord) {
      return { success: false, error: true, message: "Class not found!" };
    }

    if (session.user.role === "teacher" && classRecord.supervisorId !== session.user.id) {
      return {
        success: false,
        error: true,
        message: "You can only manage the class you supervise.",
      };
    }

    const payload = {
      title: data.title.trim(),
      collectionType: data.collectionType,
      targetAmount: data.targetAmount,
      classId: classRecord.id,
    };

    let campaignId = data.id ?? null;
    let auditAction = "fee_collection_campaign.create";

    if (data.id) {
      const existingCampaign = await prisma.feeCollectionCampaign.findUnique({
        where: { id: data.id },
        select: {
          id: true,
          classId: true,
        },
      });

      if (!existingCampaign) {
        return { success: false, error: true, message: "Collection campaign not found!" };
      }

      if (existingCampaign.classId !== classRecord.id) {
        return {
          success: false,
          error: true,
          message: "That collection campaign does not belong to the selected class.",
        };
      }

      await prisma.feeCollectionCampaign.update({
        where: { id: data.id },
        data: payload,
      });
      auditAction = "fee_collection_campaign.update";
    } else {
      const campaign = await prisma.feeCollectionCampaign.create({
        data: {
          ...payload,
          createdById: session.user.id,
          createdByRole: userRole,
        },
      });
      campaignId = campaign.id;
    }

    revalidatePath("/dashboard/collections");
    await writeActionAuditLog({
      startedAt,
      action: auditAction,
      category: "finance",
      summary: `${data.id ? "Updated" : "Created"} collection campaign ${payload.title}`,
      entity: {
        type: "fee_collection_campaign",
        id: campaignId,
        label: payload.title,
      },
      metadata: {
        classId: classRecord.id,
        collectionType: data.collectionType,
        targetAmount: data.targetAmount,
      },
    });
    return {
      success: true,
      error: false,
      message: "Collection campaign saved successfully.",
    };
  } catch (err) {
    console.error("saveFeeCollectionCampaign error:", err);
    return { success: false, error: true, message: "Failed to save collection campaign!" };
  }
};

export const setFeeCollectionCampaignStatus = async (
  campaignId: number,
  nextStatus: "ACTIVE" | "CLOSED"
): Promise<ActionState> => {
  const startedAt = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== "admin" && session.user.role !== "teacher")) {
      return { success: false, error: true, message: "Unauthorized!" };
    }

    const campaign = await prisma.feeCollectionCampaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        title: true,
        status: true,
        class: {
          select: {
            supervisorId: true,
          },
        },
      },
    });

    if (!campaign) {
      return { success: false, error: true, message: "Collection campaign not found!" };
    }

    if (session.user.role === "teacher" && campaign.class.supervisorId !== session.user.id) {
      return {
        success: false,
        error: true,
        message: "You can only manage collections for your supervised class.",
      };
    }

    if (campaign.status === nextStatus) {
      return {
        success: true,
        error: false,
        message:
          nextStatus === "ACTIVE"
            ? `${campaign.title} is already active.`
            : `${campaign.title} is already closed.`,
      };
    }

    await prisma.feeCollectionCampaign.update({
      where: { id: campaignId },
      data: {
        status: nextStatus,
      },
    });

    revalidatePath("/dashboard/collections");
    await writeActionAuditLog({
      startedAt,
      action: "fee_collection_campaign.status",
      category: "finance",
      summary:
        nextStatus === "ACTIVE"
          ? `Reopened collection campaign ${campaign.title}`
          : `Closed collection campaign ${campaign.title}`,
      entity: {
        type: "fee_collection_campaign",
        id: campaignId,
        label: campaign.title,
      },
      metadata: {
        nextStatus,
      },
    });
    return {
      success: true,
      error: false,
      message:
        nextStatus === "ACTIVE"
          ? `${campaign.title} reopened successfully.`
          : `${campaign.title} closed successfully.`,
    };
  } catch (err) {
    console.error("setFeeCollectionCampaignStatus error:", err);
    return { success: false, error: true, message: "Failed to update campaign status!" };
  }
};

export const recordFeeCollectionPayment = async (
  currentState: ActionState,
  data: FeeCollectionPaymentSchema
): Promise<ActionState> => {
  const startedAt = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== "admin" && session.user.role !== "teacher")) {
      return { success: false, error: true, message: "Unauthorized!" };
    }

    const userRole = session.user.role ?? "unknown";

    const campaign = await prisma.feeCollectionCampaign.findUnique({
      where: { id: data.campaignId },
      include: {
        class: {
          select: {
            id: true,
            supervisorId: true,
          },
        },
      },
    });

    if (!campaign) {
      return { success: false, error: true, message: "Collection campaign not found!" };
    }

    if (campaign.status !== "ACTIVE") {
      return {
        success: false,
        error: true,
        message: "This collection is closed. Reopen it before recording payments.",
      };
    }

    if (session.user.role === "teacher" && campaign.class.supervisorId !== session.user.id) {
      return {
        success: false,
        error: true,
        message: "You can only record payments for your supervised class.",
      };
    }

    const student = await prisma.student.findFirst({
      where: {
        id: data.studentId,
        classId: campaign.classId,
      },
      select: {
        id: true,
        name: true,
        surname: true,
      },
    });

    if (!student) {
      return { success: false, error: true, message: "Student not found in this class!" };
    }

    const paymentAggregate = await prisma.feeCollectionPayment.aggregate({
      where: {
        campaignId: data.campaignId,
        studentId: data.studentId,
      },
      _sum: {
        amount: true,
      },
    });

    const amountAlreadyPaid = paymentAggregate._sum.amount ?? 0;
    const remaining = campaign.targetAmount - amountAlreadyPaid;

    if (remaining <= 0) {
      return {
        success: false,
        error: true,
        message: "This student has already met the target for this collection.",
      };
    }

    if (data.amount > remaining) {
      return {
        success: false,
        error: true,
        message: `Payment exceeds the remaining balance of ${remaining.toFixed(2)}.`,
      };
    }

    const payment = await prisma.feeCollectionPayment.create({
      data: {
        campaignId: data.campaignId,
        studentId: data.studentId,
        amount: data.amount,
        note: data.note?.trim() || null,
        recordedById: session.user.id,
        recordedByRole: userRole,
      },
    });

    revalidatePath("/dashboard/collections");
    await writeActionAuditLog({
      startedAt,
      action: "fee_collection_payment.record",
      category: "finance",
      summary: `Recorded collection payment for ${student.name} ${student.surname}`,
      entity: {
        type: "fee_collection_payment",
        id: payment.id,
        label: campaign.title,
      },
      metadata: {
        campaignId: data.campaignId,
        studentId: data.studentId,
        amount: data.amount,
      },
    });
    return {
      success: true,
      error: false,
      message: `Recorded ${data.amount.toFixed(2)} for ${student.name} ${student.surname}.`,
    };
  } catch (err) {
    console.error("recordFeeCollectionPayment error:", err);
    return { success: false, error: true, message: "Failed to record collection payment!" };
  }
};

//! LESSON ACTIONS
export const createLesson = async (
  currentState: ActionState,
  data: LessonSchema
): Promise<ActionState> => {
  const startedAt = Date.now();

  try {
    await requireStaff();
    const lesson = await prisma.lesson.create({
      data: {
        name: data.name,
        day: data.day,
        startTime: data.startTime,
        endTime: data.endTime,
        subjectId: data.subjectId,
        classId: data.classId,
        teacherId: data.teacherId,
      },
    });

    revalidatePath("/dashboard/lessons");
    await writeActionAuditLog({
      startedAt,
      action: "lesson.create",
      category: "academics",
      summary: `Created lesson ${data.name}`,
      entity: {
        type: "lesson",
        id: lesson.id,
        label: data.name,
      },
      metadata: {
        classId: data.classId,
        subjectId: data.subjectId,
        teacherId: data.teacherId,
      },
    });
    return { success: true, error: false, message: "Lesson created successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to create lesson!" };
  }
};

export const updateLesson = async (
  currentState: ActionState,
  data: LessonSchema
): Promise<ActionState> => {
  const startedAt = Date.now();

  if (!data.id) {
    return { success: false, error: true, message: "Lesson ID is required!" };
  }

  try {
    await requireStaff();
    await prisma.lesson.update({
      where: { id: data.id },
      data: {
        name: data.name,
        day: data.day,
        startTime: data.startTime,
        endTime: data.endTime,
        subjectId: data.subjectId,
        classId: data.classId,
        teacherId: data.teacherId,
      },
    });

    revalidatePath("/dashboard/lessons");
    await writeActionAuditLog({
      startedAt,
      action: "lesson.update",
      category: "academics",
      summary: `Updated lesson ${data.name}`,
      entity: {
        type: "lesson",
        id: data.id,
        label: data.name,
      },
      metadata: {
        classId: data.classId,
        subjectId: data.subjectId,
        teacherId: data.teacherId,
      },
    });
    return { success: true, error: false, message: "Lesson updated successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to update lesson!" };
  }
};

export const deleteLesson = async (
  currentState: ActionState,
  data: FormData
): Promise<ActionState> => {
  const startedAt = Date.now();
  const lessonId = Number.parseInt(data.get("id") as string, 10);

  if (!Number.isInteger(lessonId) || lessonId <= 0) {
    return { success: false, error: true, message: "Invalid lesson ID!" };
  }

  try {
    await requireStaff();
    const existingLesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true },
    });

    if (!existingLesson) {
      return { success: false, error: true, message: "Lesson not found." };
    }

    await prisma.$transaction(async (tx) => {
      const exams = await tx.exam.findMany({
        where: { lessonId },
        select: { id: true },
      });

      await deleteExamsWithDependencies(
        tx,
        exams.map((exam) => exam.id)
      );

      const assignments = await tx.assignment.findMany({
        where: { lessonId },
        select: { id: true },
      });

      await deleteAssignmentsWithDependencies(
        tx,
        assignments.map((assignment) => assignment.id)
      );

      await tx.attendance.deleteMany({
        where: { lessonId },
      });

      await tx.lesson.delete({
        where: { id: lessonId },
      });
    });

    revalidatePath("/dashboard/lessons");
    await writeActionAuditLog({
      startedAt,
      action: "lesson.delete",
      category: "academics",
      summary: `Deleted lesson ${lessonId}`,
      entity: {
        type: "lesson",
        id: lessonId,
      },
    });
    return { success: true, error: false, message: "Lesson deleted successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to delete lesson!" };
  }
};

//! ASSIGNMENT ACTIONS
export const createAssignment = async (
  currentState: ActionState,
  data: AssignmentSchema
): Promise<ActionState> => {
  const startedAt = Date.now();
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { success: false, error: true, message: "Unauthorized action." };
  }

  const role = session.user.role;
  if (role === "student" || role === "parent") {
    return { success: false, error: true, message: "Only staff can create assignments." };
  }

  if (role === "teacher") {
    const lesson = await prisma.lesson.findUnique({
      where: { id: data.lessonId },
      select: { teacherId: true },
    });

    if (!lesson) {
      return { success: false, error: true, message: "Lesson not found." };
    }

    if (lesson.teacherId !== session.user.id) {
      return { success: false, error: true, message: "You can only create assignments for your lessons." };
    }
  }

  try {
    const assignment = await prisma.assignment.create({
      data: {
        title: data.title,
        startDate: data.startDate,
        dueDate: data.dueDate,
        lessonId: data.lessonId,
      },
    });

    revalidatePath("/dashboard/assignments");
    await writeActionAuditLog({
      startedAt,
      action: "assignment.create",
      category: "assessments",
      summary: `Created assignment ${data.title}`,
      entity: {
        type: "assignment",
        id: assignment.id,
        label: data.title,
      },
      metadata: {
        lessonId: data.lessonId,
        ownerRole: role,
      },
    });
    return { success: true, error: false, message: "Assignment created successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to create assignment!" };
  }
};

export const updateAssignment = async (
  currentState: ActionState,
  data: AssignmentSchema
): Promise<ActionState> => {
  const startedAt = Date.now();

  if (!data.id) {
    return { success: false, error: true, message: "Assignment ID is required!" };
  }

  try {
    await requireStaff();
    await prisma.assignment.update({
      where: { id: data.id },
      data: {
        title: data.title,
        startDate: data.startDate,
        dueDate: data.dueDate,
        lessonId: data.lessonId,
      },
    });

    revalidatePath("/dashboard/assignments");
    await writeActionAuditLog({
      startedAt,
      action: "assignment.update",
      category: "assessments",
      summary: `Updated assignment ${data.title}`,
      entity: {
        type: "assignment",
        id: data.id,
        label: data.title,
      },
      metadata: {
        lessonId: data.lessonId,
      },
    });
    return { success: true, error: false, message: "Assignment updated successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to update assignment!" };
  }
};

export const deleteAssignment = async (
  currentState: ActionState,
  data: FormData
): Promise<ActionState> => {
  const startedAt = Date.now();
  const assignmentId = Number.parseInt(data.get("id") as string, 10);

  if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
    return { success: false, error: true, message: "Invalid assignment ID!" };
  }

  try {
    await requireStaff();
    const existingAssignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { id: true },
    });

    if (!existingAssignment) {
      return { success: false, error: true, message: "Assignment not found." };
    }

    await prisma.$transaction(async (tx) => {
      await deleteAssignmentsWithDependencies(tx, [assignmentId]);
    });

    revalidatePath("/dashboard/assignments");
    await writeActionAuditLog({
      startedAt,
      action: "assignment.delete",
      category: "assessments",
      summary: `Deleted assignment ${assignmentId}`,
      entity: {
        type: "assignment",
        id: assignmentId,
      },
    });
    return { success: true, error: false, message: "Assignment deleted successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to delete assignment!" };
  }
};

//! EVENT ACTIONS
export const createEvent = async (
  currentState: ActionState,
  data: EventSchema
): Promise<ActionState> => {
  const startedAt = Date.now();

  try {
    await requireStaff();
    const event = await prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        classId: data.classId || null,
      },
    });

    //* SMS broadcast, deferred past the response but kept alive by after().
    if (data.sendSms) {
      runAfterResponse("SMS", () =>
        sendEventSMS(data.title, data.startTime, data.classId)
      );
    }

    revalidatePath("/dashboard/events");
    await writeActionAuditLog({
      startedAt,
      action: "event.create",
      category: "communication",
      summary: `Created event ${data.title}`,
      entity: {
        type: "event",
        id: event.id,
        label: data.title,
      },
      metadata: {
        classId: data.classId || null,
        sendSms: Boolean(data.sendSms),
      },
    });
    return { success: true, error: false, message: "Event created successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to create event!" };
  }
};


export const updateEvent = async (
  currentState: ActionState,
  data: EventSchema
): Promise<ActionState> => {
  const startedAt = Date.now();

  if (!data.id) {
    return { success: false, error: true, message: "Event ID is required!" };
  }

  try {
    await requireStaff();
    await prisma.event.update({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        classId: data.classId || null,
      },
    });

    revalidatePath("/dashboard/events");
    await writeActionAuditLog({
      startedAt,
      action: "event.update",
      category: "communication",
      summary: `Updated event ${data.title}`,
      entity: {
        type: "event",
        id: data.id,
        label: data.title,
      },
      metadata: {
        classId: data.classId || null,
      },
    });
    return { success: true, error: false, message: "Event updated successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to update event!" };
  }
};

export const deleteEvent = async (
  currentState: ActionState,
  data: FormData
): Promise<ActionState> => {
  const startedAt = Date.now();
  const id = data.get("id") as string;
  try {
    await requireStaff();
    await prisma.event.delete({
      where: { id: parseInt(id) },
    });

    revalidatePath("/dashboard/events");
    await writeActionAuditLog({
      startedAt,
      action: "event.delete",
      category: "communication",
      summary: `Deleted event ${id}`,
      entity: {
        type: "event",
        id,
      },
    });
    return { success: true, error: false, message: "Event deleted successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to delete event!" };
  }
};

//! ADMIN ACTIONS
export const createAdmin = async (
  currentState: ActionState,
  data: AdminSchema
): Promise<ActionState> => {
  const startedAt = Date.now();

  try {
    await requireAdmin();
    const plaintextPassword = data.password || generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(plaintextPassword, 10);
    const staffId = await generateAdminStaffId();
    const adminPhone = data.phone?.trim() || null;

    let imagePath = data.img || null;

    //* Handle base64 image upload if provided
    if (data.img && data.img.startsWith("data:image/")) {
      try {
        const base64Data = data.img.split(",")[1];
        const buffer = Buffer.from(base64Data, "base64");
        
        //* Extract extension from data URL
        const mimeType = data.img.split(";")[0].split(":")[1];
        const extension = mimeType.split("/")[1];
        
        //* Create unique filename using username
        const filename = `admin-${data.username}-${Date.now()}.${extension}`;
        const uploadDir = path.join(process.cwd(), "public/uploads");
        
        //* Ensure upload directory exists
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        const filepath = path.join(uploadDir, filename);
        fs.writeFileSync(filepath, buffer);
        
        //* Store relative path in database
        imagePath = `/uploads/${filename}`;
      } catch (imageError) {
        console.error("Admin image upload error:", imageError);
        //* We can continue without the image rather than failing the whole creation
      }
    }

    const admin = await prisma.$transaction(async (tx) => {
      const staffProfile = await upsertStaffProfile(tx, {
        staffId,
        username: data.username,
        password: hashedPassword,
        name: data.name,
        surname: null,
        email: data.email || null,
        phone: adminPhone,
        address: null,
        img: imagePath,
        sex: null,
        birthday: null,
        permissions: null,
        staffType: "ADMIN",
        adminRole: data.role,
      });

      return tx.admin.create({
        data: {
          username: data.username,
          staffId,
          ...(staffProfile ? { staffProfileId: staffProfile.id } : {}),
          password: hashedPassword,
          name: data.name,
          email: data.email || null,
          phone: adminPhone,
          img: imagePath,
          role: data.role,
        },
      });
    });

    revalidatePath("/dashboard/admins");
    await writeActionAuditLog({
      startedAt,
      action: "admin.create",
      category: "user_management",
      summary: `Created admin ${data.name}`,
      entity: {
        type: "admin",
        id: admin.id,
        label: data.name,
      },
      metadata: {
        staffId,
        username: data.username,
        role: data.role,
      },
    });

    if (adminPhone) {
      notifyStaffCredentials({
        phone: adminPhone,
        name: data.name,
        staffId,
        password: plaintextPassword,
        role: "admin",
      });
    }

    return { success: true, error: false, message: "Admin created successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to create admin!" };
  }
};

export const updateAdmin = async (
  currentState: ActionState,
  data: AdminSchema
): Promise<ActionState> => {
  const startedAt = Date.now();

  if (!data.id) {
    return { success: false, error: true, message: "Admin ID is required!" };
  }

  try {
    await requireAdmin();
    let imagePath = data.img || null;

    //* Handle base64 image upload if provided
    if (data.img && data.img.startsWith("data:image/")) {
      try {
        const base64Data = data.img.split(",")[1];
        const buffer = Buffer.from(base64Data, "base64");
        
        //* Extract extension from data URL
        const mimeType = data.img.split(";")[0].split(":")[1];
        const extension = mimeType.split("/")[1];
        
        //* Create unique filename
        const filename = `admin-${data.id}-${Date.now()}.${extension}`;
        const uploadDir = path.join(process.cwd(), "public/uploads");
        
        //* Ensure upload directory exists
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        const filepath = path.join(uploadDir, filename);
        fs.writeFileSync(filepath, buffer);
        
        //* Store relative path in database
        imagePath = `/uploads/${filename}`;
      } catch (imageError) {
        console.error("Admin image upload error:", imageError);
        return { success: false, error: true, message: "Failed to upload image" };
      }
    }

    await prisma.$transaction(async (tx) => {
      const existingAdmin = await tx.admin.findUnique({
        where: { id: data.id },
        select: {
          id: true,
          username: true,
          staffId: true,
          staffProfileId: true,
          password: true,
          phone: true,
          permissions: true,
        },
      });

      if (!existingAdmin) {
        throw new Error("Admin not found!");
      }

      const passwordHash =
        data.password && data.password !== ""
          ? await bcrypt.hash(data.password, 10)
          : existingAdmin.password;

      const staffProfile = await upsertStaffProfile(tx, {
        staffId: existingAdmin.staffId,
        username: data.username,
        password: passwordHash,
        name: data.name,
        surname: null,
        email: data.email || null,
        phone: existingAdmin.phone ?? null,
        address: null,
        img: imagePath,
        sex: null,
        birthday: null,
        permissions: existingAdmin.permissions ?? null,
        staffType: "ADMIN",
        adminRole: data.role,
      });

      const updateData: Prisma.AdminUpdateInput = {
        username: data.username,
        ...(staffProfile ? { staffProfile: { connect: { id: staffProfile.id } } } : {}),
        password: passwordHash,
        name: data.name,
        email: data.email || null,
        img: imagePath,
        role: data.role,
      };

      await tx.admin.update({
        where: { id: data.id },
        data: updateData,
      });
    });

    revalidatePath("/dashboard/admins");
    await writeActionAuditLog({
      startedAt,
      action: "admin.update",
      category: "user_management",
      summary: `Updated admin ${data.name}`,
      entity: {
        type: "admin",
        id: data.id,
        label: data.name,
      },
      metadata: {
        username: data.username,
        role: data.role,
        passwordChanged: Boolean(data.password),
      },
    });
    return { success: true, error: false, message: "Admin updated successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to update admin!" };
  }
};

export const deleteAdmin = async (
  currentState: ActionState,
  data: FormData
): Promise<ActionState> => {
  const startedAt = Date.now();
  const id = data.get("id") as string;

  try {
    await requireAdmin();
    await prisma.$transaction(async (tx) => {
      const existingAdmin = await tx.admin.findUnique({
        where: { id },
        select: {
          staffId: true,
          staffProfileId: true,
        },
      });

      await tx.admin.delete({
        where: { id },
      });

      await deleteStaffProfile(tx, {
        staffId: existingAdmin?.staffId,
        staffProfileId: existingAdmin?.staffProfileId,
      });
    });

    revalidatePath("/dashboard/admins");
    await writeActionAuditLog({
      startedAt,
      action: "admin.delete",
      category: "user_management",
      summary: `Deleted admin ${id}`,
      entity: {
        type: "admin",
        id,
      },
    });
    return { success: true, error: false, message: "Admin deleted successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to delete admin!" };
  }
};

//! BEHAVIOR ACTIONS
export const createBehavior = async (
  currentState: ActionState,
  data: any
): Promise<ActionState> => {
  const startedAt = Date.now();

  try {
    await requireAdmin();
    const behavior = await prisma.behavior.create({
      data: {
        studentId: data.studentId,
        title: data.title,
        description: data.description,
        type: data.type,
        severity: data.severity,
        date: new Date(data.date),
        reportedBy: data.reportedBy,
        actionTaken: data.actionTaken || null,
      },
    });

    revalidatePath("/dashboard/behavior");
    await writeActionAuditLog({
      startedAt,
      action: "behavior.create",
      category: "behavior",
      summary: `Created behavior record ${data.title}`,
      entity: {
        type: "behavior",
        id: behavior.id,
        label: data.title,
      },
      metadata: {
        studentId: data.studentId,
        severity: data.severity,
        type: data.type,
      },
    });
    return { success: true, error: false, message: "Behavior record created successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to create behavior record!" };
  }
};

export const updateBehavior = async (
  currentState: ActionState,
  data: any
): Promise<ActionState> => {
  const startedAt = Date.now();

  if (!data.id) {
    return { success: false, error: true, message: "Behavior ID is required!" };
  }

  try {
    await requireAdmin();
    await prisma.behavior.update({
      where: { id: data.id },
      data: {
        studentId: data.studentId,
        title: data.title,
        description: data.description,
        type: data.type,
        severity: data.severity,
        date: new Date(data.date),
        reportedBy: data.reportedBy,
        actionTaken: data.actionTaken || null,
      },
    });

    revalidatePath("/dashboard/behavior");
    await writeActionAuditLog({
      startedAt,
      action: "behavior.update",
      category: "behavior",
      summary: `Updated behavior record ${data.title}`,
      entity: {
        type: "behavior",
        id: data.id,
        label: data.title,
      },
      metadata: {
        studentId: data.studentId,
        severity: data.severity,
        type: data.type,
      },
    });
    return { success: true, error: false, message: "Behavior record updated successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to update behavior record!" };
  }
};

export const deleteBehavior = async (
  currentState: ActionState,
  data: FormData
): Promise<ActionState> => {
  const startedAt = Date.now();
  const id = data.get("id") as string;

  try {
    await requireAdmin();
    await prisma.behavior.delete({
      where: { id: parseInt(id) },
    });

    revalidatePath("/dashboard/behavior");
    await writeActionAuditLog({
      startedAt,
      action: "behavior.delete",
      category: "behavior",
      summary: `Archived behavior record ${id}`,
      entity: {
        type: "behavior",
        id,
      },
    });
    return { success: true, error: false, message: "Behavior record archived successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to archive behavior record!" };
  }
};

//! SYSTEM SETTINGS ACTIONS
export const updateSystemSettings = async (
  data: FormData
): Promise<ActionState> => {
  const startedAt = Date.now();
  const id = data.get("id") as string;

  try {
    await requireSuperAdmin();
    const updateData: any = {};

    const fields = [
      "schoolName", "schoolShortName", "schoolLogo", "schoolStamp", "schoolEmail", "schoolPhone",
      "schoolAddress", "schoolWebsite", "primaryColor", "secondaryColor", "accentColor",
      "emailHost", "emailUser", "smsProvider", "smsApiKey", "smsSenderId", "whatsappPhoneNumberId",
      "whatsappReceiptTemplateName", "whatsappReceiptTemplateLanguage", "academicYear",
      "currency", "timezone", "dateFormat", "currentTerm", "studentIdInitials", "publicAppUrl"
    ];

    fields.forEach(field => {
      const value = data.get(field);
      if (value !== null) {
        updateData[field] = value as string || null;
      }
    });

    if (!updateData.whatsappReceiptTemplateLanguage) {
      updateData.whatsappReceiptTemplateLanguage = "en_US";
    }

    if (data.get("emailPort")) {
      updateData.emailPort = parseInt(data.get("emailPort") as string);
    }

    if (data.get("totalAttendanceDays")) {
      updateData.totalAttendanceDays = parseInt(data.get("totalAttendanceDays") as string);
    }

    if (data.get("vacationDate")) {
      updateData.vacationDate = new Date(data.get("vacationDate") as string);
    }

    if (data.get("reopeningDate")) {
      updateData.reopeningDate = new Date(data.get("reopeningDate") as string);
    }

    //* Only update sensitive fields if provided
    const emailPassword = data.get("emailPassword") as string;
    if (emailPassword && emailPassword !== "") {
      updateData.emailPassword = emailPassword;
    }

    const smsApiSecret = data.get("smsApiSecret") as string;
    if (smsApiSecret && smsApiSecret !== "") {
      updateData.smsApiSecret = smsApiSecret;
    }

    const whatsappAccessToken = data.get("whatsappAccessToken") as string;
    if (whatsappAccessToken && whatsappAccessToken !== "") {
      updateData.whatsappAccessToken = whatsappAccessToken;
    }

    const visibleChangedFields = Object.keys(updateData).filter(
      (field) =>
        !["emailPassword", "smsApiSecret", "whatsappAccessToken"].includes(field)
    );
    const sensitiveFieldsUpdated = [
      emailPassword ? "emailPassword" : null,
      smsApiSecret ? "smsApiSecret" : null,
      whatsappAccessToken ? "whatsappAccessToken" : null,
    ].filter((field): field is string => Boolean(field));

    await prisma.systemSettings.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    //* Clear settings cache
    const { clearSettingsCache } = await import("./settings");
    clearSettingsCache();

    //* Revalidate all pages that use system settings
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");
    revalidatePath("/login");
    revalidatePath("/");
    //* Revalidate all dashboard subpages
    revalidatePath("/dashboard/students");
    revalidatePath("/dashboard/teachers");
    revalidatePath("/dashboard/parents");
    revalidatePath("/dashboard/classes");
    revalidatePath("/dashboard/attendance");
    revalidatePath("/dashboard/fees");

    await writeActionAuditLog({
      startedAt,
      action: "system_settings.update",
      category: "system",
      summary: "Updated system settings",
      entity: {
        type: "system_settings",
        id,
        label: "System Settings",
      },
      metadata: {
        visibleChangedFields,
        sensitiveFieldsUpdated,
      },
    });
    return { success: true, error: false, message: "Settings updated successfully!" };
  } catch (err) {
    await writeActionAuditLog({
      startedAt,
      action: "system_settings.update",
      category: "system",
      status: "FAILURE",
      summary: "Failed to update system settings",
      entity: {
        type: "system_settings",
        id,
        label: "System Settings",
      },
      metadata: {
        error: getErrorMessage(err),
      },
    });
    console.error(err);
    return { success: false, error: true, message: "Failed to update settings!" };
  }
};
export const generateDailyAuxiliaryFees = async (
  classId: number,
  amount: number,
  feeDate: Date | string = new Date()
): Promise<ActionState> => {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user?.role !== "admin" && session.user?.role !== "teacher")) {
      return { success: false, error: true, message: "Unauthorized!" };
    }

    const students = await prisma.student.findMany({
      where: { classId },
    });

    const targetDate = new Date(feeDate);
    targetDate.setHours(0, 0, 0, 0);
    const endOfTargetDate = new Date(targetDate);
    endOfTargetDate.setHours(23, 59, 59, 999);

    //* Check which students already have a fee for the selected day (idempotent guard)
    const existingFees = await prisma.fee.findMany({
      where: {
        studentId: { in: students.map((s) => s.id) },
        title: { contains: "auxiliary", mode: "insensitive" },
        dueDate: { gte: targetDate, lte: endOfTargetDate },
      },
      select: { studentId: true },
    });
    const alreadyHasFeeOnTargetDate = new Set(existingFees.map((f) => f.studentId));

    const studentsToCharge = students.filter((s) => !alreadyHasFeeOnTargetDate.has(s.id));

    if (studentsToCharge.length === 0) {
      return {
        success: true,
        error: false,
        message: "Auxiliary fees for the selected date have already been generated!",
      };
    }

    const period = await getCurrentFeePeriod();
    const feePromises = studentsToCharge.map((student) => {
      return prisma.fee.create({
        data: {
          title: "Daily Auxiliary Fee",
          amount,
          dueDate: targetDate,
          status: "PENDING",
          studentId: student.id,
          term: period.term,
          academicYear: period.academicYear,
        },
      });
    });

    await Promise.all(feePromises);

    revalidatePath("/dashboard/attendance");
    revalidatePath("/dashboard/fees");
    return {
      success: true,
      error: false,
      message: `Generated auxiliary fees for ${studentsToCharge.length} student(s) successfully!`,
    };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Failed to generate auxiliary fees!" };
  }
};

