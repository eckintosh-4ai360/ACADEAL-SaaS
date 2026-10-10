export type TermBillTargetType = "GRADE" | "CLASS" | "STUDENT_GROUP";

// Maps a STUDENT_GROUP key to a human-readable label and the grade level range it covers.
export const STUDENT_GROUP_OPTIONS = [
  { id: "PRE_SCHOOL",    label: "Pre-School (Creche – Nursery 2)",      levels: [1, 2, 3] },
  { id: "LOWER_PRIMARY", label: "Lower Primary (KG 1 – KG 2)",          levels: [4, 5] },
  { id: "UPPER_PRIMARY", label: "Upper Primary (Basic 1 – Basic 6)",     levels: [6, 7, 8, 9, 10, 11] },
  { id: "JUNIOR_HIGH",   label: "Junior High (Basic 7 – Basic 9)",      levels: [12, 13, 14] },
] as const;

export type StudentGroupId = typeof STUDENT_GROUP_OPTIONS[number]["id"];

export type TermBillScope = {
  targetType: TermBillTargetType;
  targetId: number;
};

const CLASS_PREFIX = "class:";
const GRADE_PREFIX = "grade:";
const GROUP_PREFIX = "group:";

export function encodeTermBillScope(scope: TermBillScope): string {
  if (scope.targetType === "CLASS") {
    return `${CLASS_PREFIX}${scope.targetId}`;
  }

  if (scope.targetType === "STUDENT_GROUP") {
    // targetId is the index into STUDENT_GROUP_OPTIONS (0-based).
    // We persist by the string key, e.g. "group:PRE_SCHOOL".
    const group = STUDENT_GROUP_OPTIONS[scope.targetId];
    if (!group) throw new Error(`Unknown student group index: ${scope.targetId}`);
    return `${GROUP_PREFIX}${group.id}`;
  }

  // Keep grade-backed templates compatible with existing records and uniqueness checks.
  return String(scope.targetId);
}

export function parseTermBillScope(value: string): TermBillScope | null {
  const normalizedValue = value.trim().toLowerCase();

  if (!normalizedValue) {
    return null;
  }

  if (normalizedValue.startsWith(CLASS_PREFIX)) {
    const targetId = Number.parseInt(normalizedValue.slice(CLASS_PREFIX.length), 10);
    if (!Number.isFinite(targetId) || targetId <= 0) {
      return null;
    }

    return {
      targetType: "CLASS",
      targetId,
    };
  }

  if (normalizedValue.startsWith(GROUP_PREFIX)) {
    const groupKey = normalizedValue.slice(GROUP_PREFIX.length).toUpperCase();
    const index = STUDENT_GROUP_OPTIONS.findIndex((g) => g.id === groupKey);
    if (index === -1) return null;
    return { targetType: "STUDENT_GROUP", targetId: index };
  }

  const gradeValue = normalizedValue.startsWith(GRADE_PREFIX)
    ? normalizedValue.slice(GRADE_PREFIX.length)
    : normalizedValue;
  const targetId = Number.parseInt(gradeValue, 10);

  if (!Number.isFinite(targetId) || targetId <= 0) {
    return null;
  }

  return {
    targetType: "GRADE",
    targetId,
  };
}

export function getTermBillTargetTypeLabel(targetType: TermBillTargetType): string {
  if (targetType === "CLASS") return "Class";
  if (targetType === "STUDENT_GROUP") return "Group";
  return "Level";
}
