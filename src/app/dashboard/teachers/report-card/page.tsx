import prisma from "@/lib/prisma";
import ReportCardDesigner from "@/components/ReportCardDesigner";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSystemSettings } from "@/lib/settings";

export const metadata = {
  title: "Eckintosh Report Card Designer | Teachers",
  description: "Design and print student report cards with automatic grade calculation.",
};

export type StudentEntry = {
  id: string;
  name: string;
  studentId: string;
  className: string;
  serialNo: number;
};

export type ClassGroup = {
  label: string;       // e.g. "My Class (JHS 2A)" or "JHS 2B — Maths & Science"
  className: string;   // underlying class name for display
  students: StudentEntry[];
  /** Subject names this teacher is assigned to for this class (undefined = all subjects editable) */
  assignedSubjectNames?: string[];
};

export default async function ReportCardPage() {
  const session = await getServerSession(authOptions);
  const isTeacher = session?.user?.role === "teacher";
  const teacherId = session?.user?.id;

  // Resolve teacher display name for per-subject save attribution
  let teacherName = session?.user?.name || "";
  if (isTeacher && teacherId && !teacherName) {
    const tProfile = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { name: true, surname: true },
    });
    if (tProfile) teacherName = `${tProfile.name} ${tProfile.surname}`.trim();
  }

  const settings = await getSystemSettings();

  const defaultAttendanceOut = settings?.totalAttendanceDays?.toString() || "";
  const defaultNextTerm = settings?.reopeningDate
    ? new Date(settings.reopeningDate).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  // Helper: map raw student records → StudentEntry[] with serial numbers (alphabetical by surname, name)
  const toEntries = (
    recs: { id: string; name: string; surname: string; studentId: string; class: { name: string } }[]
  ): StudentEntry[] =>
    recs
      .sort((a, b) =>
        `${a.surname} ${a.name}`.localeCompare(`${b.surname} ${b.name}`)
      )
      .map((s, i) => ({
        id: s.id,
        name: `${s.name} ${s.surname}`,
        studentId: s.studentId,
        className: s.class.name,
        serialNo: i + 1,
      }));

  if (isTeacher && teacherId) {
    // ── 1. Supervised class (teacher is class supervisor) ──
    const supervisedClass = await prisma.class.findFirst({
      where: { supervisorId: teacherId },
      select: { id: true, name: true },
    });

    // ── 2. ClassSubjectTeacher assignments — which subjects this teacher teaches per class ──
    const subjectAssignments = await prisma.classSubjectTeacher.findMany({
      where: { teacherId },
      select: {
        classId: true,
        class: { select: { id: true, name: true } },
        subject: { select: { name: true } },
      },
    });

    // ── 2.5 Teacher overall subjects from _SubjectToTeacher (implicit relation) ──
    const teacherProfile = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: {
        subjects: {
          select: { name: true },
        },
      },
    });
    const teacherOverallSubjects = teacherProfile?.subjects.map(s => s.name) ?? [];

    // Also include classes from Lessons (legacy fallback for teachers not yet in ClassSubjectTeacher)
    const lessonClasses = await prisma.lesson.findMany({
      where: { teacherId },
      select: { classId: true, class: { select: { id: true, name: true } } },
      distinct: ["classId"],
    });

    // Build a map: classId -> { className, assignedSubjectNames[] }
    const classMap = new Map<number, { className: string; subjectNames: Set<string> }>();

    // From ClassSubjectTeacher (authoritative)
    for (const a of subjectAssignments) {
      if (!classMap.has(a.classId)) {
        classMap.set(a.classId, { className: a.class.name, subjectNames: new Set() });
      }
      classMap.get(a.classId)!.subjectNames.add(a.subject.name);
    }

    // From Lessons (legacy) — only add class without specific subject restriction if not already in classMap
    for (const l of lessonClasses) {
      if (!classMap.has(l.classId)) {
        classMap.set(l.classId, { className: l.class.name, subjectNames: new Set() });
      }
    }

    const supervisedClassId = supervisedClass?.id ?? null;

    // ── 3. Fetch student records per class ──
    const allClassIds = Array.from(classMap.keys());
    const studentsRaw = allClassIds.length > 0
      ? await prisma.student.findMany({
          where: { classId: { in: allClassIds } },
          select: {
            id: true, name: true, surname: true, studentId: true,
            classId: true,
            class: { select: { name: true } },
          },
        })
      : [];

    // Group students by classId
    const studentsByClass = new Map<number, typeof studentsRaw>();
    for (const s of studentsRaw) {
      if (!studentsByClass.has(s.classId)) studentsByClass.set(s.classId, []);
      studentsByClass.get(s.classId)!.push(s);
    }

    // ── 4. Build class groups ──
    const groups: ClassGroup[] = [];

    // Supervised class first (if any)
    if (supervisedClassId && classMap.has(supervisedClassId)) {
      const classInfo = classMap.get(supervisedClassId)!;
      const rawStudents = studentsByClass.get(supervisedClassId) ?? [];
      const classSubjects = Array.from(classInfo.subjectNames);
      const combinedSubjects = Array.from(new Set([...classSubjects, ...teacherOverallSubjects]));
      
      groups.push({
        label: `My Class (${classInfo.className})`,
        className: classInfo.className,
        students: toEntries(rawStudents),
        assignedSubjectNames: combinedSubjects.length > 0 ? combinedSubjects : undefined,
      });
      classMap.delete(supervisedClassId);
    } else if (supervisedClassId) {
      // Supervisor of a class they have no CST assignment for — full access to that class
      const rawStudents = await prisma.student.findMany({
        where: { classId: supervisedClassId },
        select: { id: true, name: true, surname: true, studentId: true, class: { select: { name: true } } },
      });
      groups.push({
        label: `My Class (${supervisedClass!.name})`,
        className: supervisedClass!.name,
        students: toEntries(rawStudents),
        assignedSubjectNames: teacherOverallSubjects.length > 0 ? teacherOverallSubjects : undefined,
      });
    }

    // Remaining classes from subject assignments / lessons
    for (const [classId, { className, subjectNames }] of classMap.entries()) {
      const rawStudents = studentsByClass.get(classId) ?? [];
      if (rawStudents.length === 0) continue;
      const classSubjects = Array.from(subjectNames);
      const combinedSubjects = Array.from(new Set([...classSubjects, ...teacherOverallSubjects]));
      const subjectLabel = combinedSubjects.length > 0 ? combinedSubjects.join(" & ") : "All Subjects";
      
      groups.push({
        label: `${className} — ${subjectLabel}`,
        className,
        students: toEntries(rawStudents),
        assignedSubjectNames: combinedSubjects.length > 0 ? combinedSubjects : undefined,
      });
    }

    return (
      <ReportCardDesigner
        defaultAttendanceOut={defaultAttendanceOut}
        defaultNextTerm={defaultNextTerm}
        schoolStamp={settings.schoolStamp}
        studentGroups={groups}
        teacherId={teacherId}
        teacherName={teacherName}
      />
    );
  }

  // ── ADMIN fallback: all students, no serial numbers, no group switch ──
  const allStudents = await prisma.student.findMany({
    select: {
      id: true, name: true, surname: true, studentId: true,
      class: { select: { name: true } },
    },
    orderBy: { surname: "asc" },
  });

  return (
    <ReportCardDesigner
      defaultAttendanceOut={defaultAttendanceOut}
      defaultNextTerm={defaultNextTerm}
      schoolStamp={settings.schoolStamp}
      students={allStudents.map((s) => ({
        id: s.id,
        name: `${s.name} ${s.surname}`,
        studentId: s.studentId,
        className: s.class.name,
      }))}
      teacherId={teacherId}
      teacherName={teacherName}
    />
  );
}

