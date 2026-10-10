import prisma from "@/lib/prisma";
import {
  DEFAULT_CLASS_CAPACITY,
  DEFAULT_CLASS_DEFINITIONS,
} from "@/lib/default-class-definitions";

type ClassRecord = { id: number; name: string; gradeId: number };
type GradeRecord = { id: number; level: number };

const normalizeClassName = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

const definitionOrder = new Map(
  DEFAULT_CLASS_DEFINITIONS.map((definition, index) => [
    normalizeClassName(definition.name),
    index,
  ])
);

function sortClasses(classes: ClassRecord[], grades: GradeRecord[]) {
  const gradeLevelById = new Map(grades.map((grade) => [grade.id, grade.level]));

  return [...classes].sort((left, right) => {
    const leftLevel = gradeLevelById.get(left.gradeId) ?? Number.MAX_SAFE_INTEGER;
    const rightLevel = gradeLevelById.get(right.gradeId) ?? Number.MAX_SAFE_INTEGER;

    if (leftLevel !== rightLevel) {
      return leftLevel - rightLevel;
    }

    const leftOrder =
      definitionOrder.get(normalizeClassName(left.name)) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder =
      definitionOrder.get(normalizeClassName(right.name)) ?? Number.MAX_SAFE_INTEGER;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.name.localeCompare(right.name);
  });
}

export async function ensureDefaultClassesExist() {
  const grades = await prisma.grade.findMany({
    select: { id: true, level: true },
    orderBy: { level: "asc" },
  });

  const gradeIdByLevel = new Map(grades.map((grade) => [grade.level, grade.id]));

  if (gradeIdByLevel.size === 0) {
    return {
      classes: [] as ClassRecord[],
      grades,
    };
  }

  const existingClasses = await prisma.class.findMany({
    select: { id: true, name: true, gradeId: true },
  });

  const existingNames = new Set(
    existingClasses.map((classItem) => normalizeClassName(classItem.name))
  );

  const missingClasses = DEFAULT_CLASS_DEFINITIONS.filter((definition) => {
    return (
      gradeIdByLevel.has(definition.gradeLevel) &&
      !existingNames.has(normalizeClassName(definition.name))
    );
  }).map((definition) => ({
    name: definition.name,
    gradeId: gradeIdByLevel.get(definition.gradeLevel)!,
    capacity: DEFAULT_CLASS_CAPACITY,
  }));

  if (missingClasses.length > 0) {
    await prisma.class.createMany({
      data: missingClasses,
      skipDuplicates: true,
    });
  }

  const classes = await prisma.class.findMany({
    select: { id: true, name: true, gradeId: true },
  });

  return {
    classes: sortClasses(classes, grades),
    grades,
  };
}
