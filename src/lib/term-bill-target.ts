import prisma from "@/lib/prisma";
import {
  encodeTermBillScope,
  STUDENT_GROUP_OPTIONS,
  type TermBillTargetType,
} from "@/lib/termBillScope";

//* Which students a Prepare Bill template covers. Shared by fee preparation
//* and student bill generation. Callers must authorize first.

const GRADE_NAMES: Record<number, string> = {
  1: "CRECHE",
  2: "NURSERY 1",
  3: "NURSERY 2",
  4: "KG 1",
  5: "KG 2",
  6: "BASIC 1",
  7: "BASIC 2",
  8: "BASIC 3",
  9: "BASIC 4",
  10: "BASIC 5",
  11: "BASIC 6",
  12: "JHS 1",
  13: "JHS 2",
  14: "JHS 3",
};

export type ResolvedTermBillTarget = {
  encodedScope: string;
  targetLabel: string;
  targetTypeLabel: string;
  studentWhere: { classId: number } | { gradeId: number } | { gradeId: { in: number[] } };
  metadata: Record<string, unknown>;
};

export async function resolveTermBillTarget(
  targetType: TermBillTargetType,
  targetId: number
): Promise<{ success: true; value: ResolvedTermBillTarget } | { success: false; message: string }> {
  if (targetType === "STUDENT_GROUP") {
    const group = STUDENT_GROUP_OPTIONS[targetId];
    if (!group) {
      return { success: false, message: "Unknown student group." };
    }

    // Resolve the actual database grade IDs for this group's level range.
    const grades = await prisma.grade.findMany({
      where: { level: { in: [...group.levels] } },
      select: { id: true },
    });

    const gradeIds = grades.map((g) => g.id);

    return {
      success: true,
      value: {
        encodedScope: encodeTermBillScope({ targetType, targetId }),
        targetLabel: group.label,
        targetTypeLabel: "group",
        studentWhere: { gradeId: { in: gradeIds } },
        metadata: {
          targetType,
          groupId: group.id,
          groupLabel: group.label,
          gradeLevels: group.levels,
          resolvedGradeIds: gradeIds,
        },
      },
    };
  }

  if (targetType === "CLASS") {
    const classRecord = await prisma.class.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        name: true,
        grade: {
          select: {
            level: true,
          },
        },
      },
    });

    if (!classRecord) {
      return { success: false, message: "Class not found." };
    }

    return {
      success: true,
      value: {
        encodedScope: encodeTermBillScope({ targetType, targetId }),
        targetLabel: classRecord.name,
        targetTypeLabel: "class",
        studentWhere: { classId: classRecord.id },
        metadata: {
          targetType,
          classId: classRecord.id,
          className: classRecord.name,
          gradeLevel: classRecord.grade.level,
        },
      },
    };
  }

  const grade = await prisma.grade.findUnique({
    where: { level: targetId },
    select: {
      id: true,
      level: true,
    },
  });

  if (!grade) {
    return { success: false, message: "Grade level not found." };
  }

  return {
    success: true,
    value: {
      encodedScope: encodeTermBillScope({ targetType, targetId }),
      targetLabel: GRADE_NAMES[grade.level] ?? `Grade ${grade.level}`,
      targetTypeLabel: "level",
      studentWhere: { gradeId: grade.id },
      metadata: {
        targetType,
        gradeId: grade.id,
        gradeLevel: grade.level,
      },
    },
  };
}

//* A template's audience for pickers, e.g. "Class 5A", "BASIC 4" or a group
//* label, without the per-template queries resolveTermBillTarget makes.
export function termBillTargetLabel(
  scope: { targetType: TermBillTargetType; targetId: number },
  classNameById: Map<number, string>
) {
  if (scope.targetType === "CLASS") {
    return classNameById.get(scope.targetId) ?? "Unknown class";
  }
  if (scope.targetType === "STUDENT_GROUP") {
    return STUDENT_GROUP_OPTIONS[scope.targetId]?.label ?? "Unknown group";
  }
  return GRADE_NAMES[scope.targetId] ?? `Grade ${scope.targetId}`;
}
