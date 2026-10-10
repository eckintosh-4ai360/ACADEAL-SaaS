import { GRADE_NAMES } from "@/lib/utils";

type GradeLike = {
  id: number;
  level: number;
};

type ClassLike = {
  gradeId: number;
  name: string;
};

export type SchoolClassDefinition = {
  name: string;
  gradeId: number;
  gradeLevel: number;
  streamLabel: string | null;
};

export const DEFAULT_STREAM_COUNT = 2;
const STREAM_GRADE_LEVEL_START = 4;
const STREAM_GRADE_LEVEL_END = 14;
const STREAM_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const classNameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function getSectionMeta(className: string, gradeLabel: string) {
  const normalizedClassName = normalizeWhitespace(className);
  const normalizedGradeLabel = normalizeWhitespace(gradeLabel);

  if (!normalizedGradeLabel) {
    return {
      matchesGradePrefix: false,
      section: normalizedClassName,
    };
  }

  if (
    normalizedClassName.localeCompare(normalizedGradeLabel, undefined, {
      sensitivity: "base",
    }) === 0
  ) {
    return {
      matchesGradePrefix: true,
      section: "",
    };
  }

  const gradePrefix = `${normalizedGradeLabel} `;

  if (
    normalizedClassName.toLowerCase().startsWith(gradePrefix.toLowerCase())
  ) {
    return {
      matchesGradePrefix: true,
      section: normalizedClassName.slice(gradePrefix.length).trim(),
    };
  }

  return {
    matchesGradePrefix: false,
    section: normalizedClassName,
  };
}

export function isStreamedGradeLevel(level: number) {
  return level >= STREAM_GRADE_LEVEL_START && level <= STREAM_GRADE_LEVEL_END;
}

export function getGradeLabel(level: number) {
  return GRADE_NAMES[level] || `Grade ${level}`;
}

export function buildClassName(gradeLabel: string, section?: string) {
  const normalizedGradeLabel = normalizeWhitespace(gradeLabel);
  const normalizedSection = normalizeWhitespace(section || "");

  if (!normalizedSection) {
    return normalizedGradeLabel;
  }

  return `${normalizedGradeLabel} ${normalizedSection}`;
}

export function buildClassNameFromGradeLevel(level: number, section?: string) {
  return buildClassName(getGradeLabel(level), section);
}

export function getStreamLabels(streamCount: number) {
  const safeStreamCount = Math.min(
    Math.max(Math.trunc(streamCount), 1),
    STREAM_LABELS.length
  );

  return STREAM_LABELS.slice(0, safeStreamCount);
}

export function getClassStreamSection(className: string, gradeLevel: number) {
  const gradeLabel = getGradeLabel(gradeLevel);
  const { section } = getSectionMeta(className, gradeLabel);
  const normalizedSection = normalizeWhitespace(section);

  return normalizedSection === "" ? null : normalizedSection.toUpperCase();
}

export function buildGradeClassDefinitions(
  level: number,
  gradeId: number,
  streamCount: number
): SchoolClassDefinition[] {
  const gradeLabel = getGradeLabel(level);

  if (!isStreamedGradeLevel(level)) {
    return [
      {
        name: gradeLabel,
        gradeId,
        gradeLevel: level,
        streamLabel: null,
      },
    ];
  }

  return getStreamLabels(streamCount).map<SchoolClassDefinition>((streamLabel) => ({
    name: buildClassName(gradeLabel, streamLabel),
    gradeId,
    gradeLevel: level,
    streamLabel,
  }));
}

export function buildSchoolClassDefinitions(
  grades: GradeLike[],
  streamCount: number
): SchoolClassDefinition[] {
  return grades
    .slice()
    .sort((left, right) => left.level - right.level)
    .flatMap((grade) => buildGradeClassDefinitions(grade.level, grade.id, streamCount));
}

export function detectConfiguredStreamCount<T extends ClassLike>(
  classes: T[],
  grades: GradeLike[]
) {
  const counts = grades
    .filter((grade) => isStreamedGradeLevel(grade.level))
    .map((grade) => classes.filter((classItem) => classItem.gradeId === grade.id).length)
    .filter((count) => count > 0);

  if (counts.length === 0) {
    return {
      configuredStreamCount: DEFAULT_STREAM_COUNT,
      isConsistent: true,
      detectedCounts: [] as number[],
    };
  }

  const frequencies = new Map<number, number>();
  for (const count of counts) {
    frequencies.set(count, (frequencies.get(count) ?? 0) + 1);
  }

  const [configuredStreamCount] = [...frequencies.entries()].sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }

    return left[0] - right[0];
  })[0];

  return {
    configuredStreamCount,
    isConsistent: counts.every((count) => count === configuredStreamCount),
    detectedCounts: counts,
  };
}

export function sortClassesByGrade<T extends ClassLike>(
  classes: T[],
  grades: GradeLike[]
) {
  const gradeLevelById = new Map(grades.map((grade) => [grade.id, grade.level]));

  return [...classes].sort((left, right) => {
    const leftLevel = gradeLevelById.get(left.gradeId) ?? Number.MAX_SAFE_INTEGER;
    const rightLevel =
      gradeLevelById.get(right.gradeId) ?? Number.MAX_SAFE_INTEGER;

    if (leftLevel !== rightLevel) {
      return leftLevel - rightLevel;
    }

    const gradeLabel = getGradeLabel(leftLevel);
    const leftMeta = getSectionMeta(left.name, gradeLabel);
    const rightMeta = getSectionMeta(right.name, gradeLabel);

    if (leftMeta.matchesGradePrefix !== rightMeta.matchesGradePrefix) {
      return leftMeta.matchesGradePrefix ? -1 : 1;
    }

    if (leftMeta.section === "" && rightMeta.section !== "") {
      return -1;
    }

    if (rightMeta.section === "" && leftMeta.section !== "") {
      return 1;
    }

    const sectionComparison = classNameCollator.compare(
      leftMeta.section,
      rightMeta.section
    );

    if (sectionComparison !== 0) {
      return sectionComparison;
    }

    return classNameCollator.compare(left.name, right.name);
  });
}
