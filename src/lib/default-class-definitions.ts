import {
  buildGradeClassDefinitions,
  DEFAULT_STREAM_COUNT,
} from "@/lib/class-management";

export interface DefaultClassDefinition {
  name: string;
  gradeLevel: number;
}

export const DEFAULT_CLASS_CAPACITY = 40;

export const DEFAULT_CLASS_DEFINITIONS: DefaultClassDefinition[] = Array.from(
  { length: 14 },
  (_, index) => index + 1
).flatMap((gradeLevel) =>
  buildGradeClassDefinitions(gradeLevel, gradeLevel, DEFAULT_STREAM_COUNT).map(
    ({ name }) => ({
      name,
      gradeLevel,
    })
  )
);

const normalizeClassName = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

export function getDefaultClassDefinition(name: string) {
  const normalizedName = normalizeClassName(name);
  return DEFAULT_CLASS_DEFINITIONS.find(
    (definition) => normalizeClassName(definition.name) === normalizedName
  );
}

export function getDefaultClassNamesForGradeLevel(gradeLevel?: number) {
  if (!gradeLevel) {
    return DEFAULT_CLASS_DEFINITIONS.map((definition) => definition.name);
  }

  return DEFAULT_CLASS_DEFINITIONS.filter(
    (definition) => definition.gradeLevel === gradeLevel
  ).map((definition) => definition.name);
}
