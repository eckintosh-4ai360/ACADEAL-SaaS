export const ADMIN_STAFF_ID_PREFIX = "STAFF-ADM-";
export const TEACHER_STAFF_ID_PREFIX = "STAFF-TCH-";
export const PARENT_USER_ID_PREFIX = "PAR-";
export const DEFAULT_ID_SEQUENCE_WIDTH = 3;

export function buildSequentialId(
  prefix: string,
  sequence: number,
  width = DEFAULT_ID_SEQUENCE_WIDTH
) {
  return `${prefix}${String(sequence).padStart(width, "0")}`;
}

export function buildSequentialIdPreview(
  prefix: string,
  width = DEFAULT_ID_SEQUENCE_WIDTH
) {
  return `${prefix}${"X".repeat(width)}`;
}

export function parseSequentialIdValue(
  value: string | null | undefined,
  prefix: string
) {
  if (!value || !value.startsWith(prefix)) {
    return 1;
  }

  const suffix = value.slice(prefix.length);
  const parsed = Number.parseInt(suffix, 10);

  return Number.isNaN(parsed) ? 1 : parsed + 1;
}
