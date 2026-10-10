export const ACADEAL_MIN_QUESTION_COUNT = 1;
export const ACADEAL_DEFAULT_STUDENT_QUIZ_COUNT = 6;
export const ACADEAL_DEFAULT_TEACHER_PACK_COUNT = 8;

export function normalizeAcadealQuestionCount(
  value: number | string | null | undefined,
  fallback = ACADEAL_DEFAULT_STUDENT_QUIZ_COUNT
) {
  const parsed =
    typeof value === "number"
      ? value
      : Number.parseInt(String(value ?? "").trim(), 10);
  const normalized = Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;

  return Math.max(ACADEAL_MIN_QUESTION_COUNT, normalized);
}
