import prisma from "./prisma";
import { GRADE_NAMES } from "./utils";

export type VideoLessonSubjectOption = {
  id: number;
  name: string;
};

export type VideoLessonGradeOption = {
  id: number;
  level: number;
  label: string;
};

export type VideoLessonComposerScope = {
  subjects: VideoLessonSubjectOption[];
  grades: VideoLessonGradeOption[];
  defaultSubjectId: number | null;
  defaultGradeId: number | null;
};

function uniqueById<T extends { id: number }>(items: T[]): T[] {
  const seen = new Set<number>();

  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

export async function getVideoLessonComposerScopeForTeacher(
  teacherId: string
): Promise<VideoLessonComposerScope> {
  const [teacherSubjects, taughtSubjects, supervisedClasses, taughtClasses] = await Promise.all([
    prisma.teacher.findUnique({
      where: { id: teacherId },
      select: {
        subjects: {
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        },
      },
    }),
    prisma.lesson.findMany({
      where: { teacherId },
      select: {
        subject: {
          select: { id: true, name: true },
        },
      },
      distinct: ["subjectId"],
      orderBy: { subjectId: "asc" },
    }),
    prisma.class.findMany({
      where: { supervisorId: teacherId },
      select: {
        id: true,
        name: true,
        grade: {
          select: {
            id: true,
            level: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.lesson.findMany({
      where: { teacherId },
      select: {
        class: {
          select: {
            id: true,
            name: true,
            grade: {
              select: {
                id: true,
                level: true,
              },
            },
          },
        },
      },
      distinct: ["classId"],
      orderBy: { classId: "asc" },
    }),
  ]);

  const subjects = uniqueById(
    [
      ...(teacherSubjects?.subjects || []),
      ...taughtSubjects.map((lesson) => lesson.subject),
    ].sort((left, right) => left.name.localeCompare(right.name))
  );

  const gradeCandidates = [
    ...supervisedClasses.map((classItem) => classItem.grade),
    ...taughtClasses.map((lesson) => lesson.class.grade),
  ];

  const grades = uniqueById(gradeCandidates)
    .sort((left, right) => left.level - right.level)
    .map((grade) => ({
      id: grade.id,
      level: grade.level,
      label: GRADE_NAMES[grade.level] || `Grade ${grade.level}`,
    }));

  const defaultGradeId =
    supervisedClasses[0]?.grade.id ??
    taughtClasses[0]?.class.grade.id ??
    grades[0]?.id ??
    null;

  return {
    subjects,
    grades,
    defaultSubjectId: subjects[0]?.id ?? null,
    defaultGradeId,
  };
}

export async function getVideoLessonComposerScopeForAdmin(): Promise<VideoLessonComposerScope> {
  const [subjects, grades] = await Promise.all([
    prisma.subject.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.grade.findMany({
      select: { id: true, level: true },
      orderBy: { level: "asc" },
    }),
  ]);

  return {
    subjects,
    grades: grades.map((grade) => ({
      id: grade.id,
      level: grade.level,
      label: GRADE_NAMES[grade.level] || `Grade ${grade.level}`,
    })),
    defaultSubjectId: subjects[0]?.id ?? null,
    defaultGradeId: grades[0]?.id ?? null,
  };
}
