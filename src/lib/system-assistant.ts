import prisma from "@/lib/prisma";
import { getActiveStudentWhere } from "@/lib/active-students";
import { getSystemSettings } from "@/lib/settings";
import { format, startOfDay, endOfDay, subDays } from "date-fns";
import { GRADE_NAMES } from "@/lib/utils";
import { getGroqClient, DEFAULT_GROQ_MODEL } from "@/lib/groq";
import { normalizeAssistantText } from "@/lib/assistant-text";
import {
  buildAssistantActionPlan,
  type AssistantActionPlan,
} from "@/lib/system-assistant-actions";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "groq-sdk/resources/chat/completions";

// Types

export type SystemAssistantResponse = {
  action?: AssistantActionPlan | null;
  reply: string;
  intent: string;
  generatedAt: string;
};

type AssistantSessionUser = {
  email?: string | null;
  id?: string;
  loginId?: string;
  name?: string | null;
  role?: string;
  username?: string;
};

// ─── Existing Database Tools ───

async function getGeneralStats() {
  const activeStudentWhere = await getActiveStudentWhere();

  const [students, teachers, classes, parents] = await Promise.all([
    prisma.student.count({ where: activeStudentWhere }),
    prisma.teacher.count(),
    prisma.class.count(),
    prisma.parent.count(),
  ]);
  return { students, teachers, classes, parents };
}

async function getAttendanceStats(args: { dateStr?: string }) {
  const date = args.dateStr ? new Date(args.dateStr) : new Date();
  const start = startOfDay(date);
  const end = endOfDay(date);

  const [total, present] = await Promise.all([
    prisma.attendance.count({
      where: { date: { gte: start, lte: end } },
    }),
    prisma.attendance.count({
      where: { date: { gte: start, lte: end }, present: true },
    }),
  ]);

  return {
    date: format(date, "yyyy-MM-dd"),
    totalRecords: total,
    presentRecords: present,
    attendanceRate: total > 0 ? (present / total) * 100 : 0,
  };
}

async function getFinancialSummary() {
  const [totalFees, paidFees, pendingFees, overdueFees] = await Promise.all([
    prisma.fee.aggregate({ _sum: { amount: true }, _count: { _all: true } }),
    prisma.fee.aggregate({ where: { status: "PAID" }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.fee.aggregate({ where: { status: "PENDING" }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.fee.aggregate({ where: { status: "OVERDUE" }, _sum: { amount: true }, _count: { _all: true } }),
  ]);

  return {
    total: { amount: totalFees._sum.amount || 0, count: totalFees._count._all },
    paid: { amount: paidFees._sum.amount || 0, count: paidFees._count._all },
    pending: { amount: pendingFees._sum.amount || 0, count: pendingFees._count._all },
    overdue: { amount: overdueFees._sum.amount || 0, count: overdueFees._count._all },
  };
}

async function getClassData(args: { className?: string }) {
  const activeStudentWhere = await getActiveStudentWhere();

  if (args.className) {
    return await prisma.class.findFirst({
      where: { name: { contains: args.className, mode: 'insensitive' } },
      include: {
        supervisor: { select: { name: true, surname: true } },
        _count: { select: { students: { where: activeStudentWhere } } },
      },
    });
  }
  return await prisma.class.findMany({
    include: {
      supervisor: { select: { name: true, surname: true } },
      _count: { select: { students: { where: activeStudentWhere } } },
    },
  });
}

const COMMON_SEARCH_STOP_WORDS = new Set([
  "which", "class", "classes", "is", "are", "in", "the", "a", "an", "what", "who", "where", "how",
  "find", "show", "get", "student", "students", "pupil", "pupils", "teacher", "teachers", "tacher", "tachers",
  "teach", "teaches", "teaching", "supervisor", "supervises", "supervising", "instructor", "instructors",
  "does", "do", "of", "tell", "me", "about", "for", "named", "called", "person", "grade",
  "please", "can", "you", "details", "info", "information", "performance", "record", "records",
  "owe", "owing", "fee", "fees", "defaulter", "defaulters", "arrears", "unpaid", "paid",
  "more", "than", "less", "gh", "ghc", "cedi", "cedis", "amount", "money", "balance", "total",
  "have", "been", "absent", "absentees", "attendance", "present", "days", "day", "this", "term", "semester"
]);

function normalizeClassName(str: string): string {
  return (str || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

function extractClassName(str: string): string {
  const match = (str || "").match(/\b((?:JHS|SHS|BASIC|PRIMARY|KG|NURSERY|GRADE)\s*\d*\s*[A-Z]?)\b/i);
  return match ? match[1].trim() : "";
}

function cleanSearchName(raw: string): string {
  if (!raw) return "";
  const parts = raw
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0 && !COMMON_SEARCH_STOP_WORDS.has(w.toLowerCase()));
  return parts.join(" ");
}

async function getStudentData(args: { searchName?: string; className?: string }) {
  const rawSearch = typeof args.searchName === "string" ? args.searchName.trim() : "";
  const search = cleanSearchName(rawSearch);
  const className = typeof args.className === "string" ? args.className.trim() : "";
  const whereClauses: Record<string, unknown>[] = [];

  if (search) {
    const queryParts = search.split(/\s+/).filter(Boolean);
    whereClauses.push({
      AND: queryParts.map((part) => ({
        OR: [
          { name: { contains: part, mode: "insensitive" as const } },
          { surname: { contains: part, mode: "insensitive" as const } },
        ],
      })),
    });
  }

  if (className) {
    whereClauses.push({
      class: { name: { contains: className, mode: "insensitive" as const } },
    });
  }

  const where = whereClauses.length > 0 ? { AND: whereClauses } : {};

  const students = await prisma.student.findMany({
    where,
    include: {
      class: { select: { name: true } },
      grade: { select: { level: true } },
      parent: { select: { name: true, surname: true, phone: true, email: true } },
    },
    orderBy: { name: "asc" },
    take: search ? 15 : 50,
  });

  return students.map((s) => ({
    id: s.id,
    studentId: s.studentId,
    name: `${s.name} ${s.surname}`,
    class: s.class ? s.class.name : "Unassigned",
    grade: s.grade ? (GRADE_NAMES[s.grade.level] || `Grade ${s.grade.level}`) : "Unassigned",
    parentName: s.parent ? `${s.parent.name} ${s.parent.surname}` : "None",
    parentContact: s.parent ? { phone: s.parent.phone, email: s.parent.email } : null,
  }));
}

async function getTeacherData(args: { searchName?: string; subjectName?: string }) {
  const rawSearch = typeof args.searchName === "string" ? args.searchName.trim() : "";
  const search = cleanSearchName(rawSearch);
  const subjectSearch = typeof args.subjectName === "string" ? args.subjectName.trim() : "";

  const teachers = await prisma.teacher.findMany({
    include: {
      subjects: { select: { name: true } },
      classes: { select: { name: true } },
      lessons: {
        select: {
          class: { select: { name: true } },
          subject: { select: { name: true } },
        },
      },
      subjectAssignments: {
        select: {
          class: { select: { name: true } },
          subject: { select: { name: true } },
        },
      },
    },
    orderBy: { name: "asc" },
    take: 50,
  });

  const formatted = teachers.map((t) => {
    const subjectNames = new Set<string>();
    (t.subjects || []).forEach((s) => s?.name && subjectNames.add(s.name));
    (t.lessons || []).forEach((l) => l.subject?.name && subjectNames.add(l.subject.name));
    (t.subjectAssignments || []).forEach((sa) => sa.subject?.name && subjectNames.add(sa.subject.name));

    const classNames = new Set<string>();
    (t.classes || []).forEach((c) => c?.name && classNames.add(c.name));
    (t.lessons || []).forEach((l) => l.class?.name && classNames.add(l.class.name));
    (t.subjectAssignments || []).forEach((sa) => sa.class?.name && classNames.add(sa.class.name));

    return {
      id: t.id,
      name: `${t.name} ${t.surname}`,
      email: t.email,
      phone: t.phone,
      address: t.address,
      subjects: Array.from(subjectNames),
      classesTaught: Array.from(classNames),
    };
  });

  let results = formatted;

  if (search) {
    const searchLower = search.toLowerCase();
    results = results.filter(
      (t) =>
        t.name.toLowerCase().includes(searchLower) ||
        t.subjects.some((s) => s.toLowerCase().includes(searchLower)) ||
        t.classesTaught.some((c) => c.toLowerCase().includes(searchLower))
    );
  }

  if (subjectSearch) {
    const subLower = subjectSearch.toLowerCase();
    results = results.filter((t) =>
      t.subjects.some((s) => s.toLowerCase().includes(subLower))
    );
  }

  return results;
}

async function getTeacherAssignments(args: { className?: string; teacherName?: string; subjectName?: string }) {
  const [assignments, lessons, classes] = await Promise.all([
    prisma.classSubjectTeacher.findMany({
      include: {
        class: { select: { name: true } },
        subject: { select: { name: true } },
        teacher: { select: { name: true, surname: true } },
      },
      take: 200,
    }),
    prisma.lesson.findMany({
      include: {
        class: { select: { name: true } },
        subject: { select: { name: true } },
        teacher: { select: { name: true, surname: true } },
      },
      take: 200,
    }),
    prisma.class.findMany({
      include: {
        supervisor: { select: { name: true, surname: true } },
      },
      take: 100,
    }),
  ]);

  const map = new Map<string, { class: string; subject: string; teacher: string; role?: string }>();

  // Include Class Supervisors
  for (const c of classes) {
    if (c.supervisor) {
      const teacherName = `${c.supervisor.name} ${c.supervisor.surname}`;
      const key = `${teacherName}-Class Supervisor-${c.name}`;
      map.set(key, {
        teacher: teacherName,
        subject: "Class Supervisor",
        class: c.name,
        role: "Class Supervisor",
      });
    }
  }

  for (const a of assignments) {
    if (a.teacher && a.subject && a.class) {
      const teacherName = `${a.teacher.name} ${a.teacher.surname}`;
      const key = `${teacherName}-${a.subject.name}-${a.class.name}`;
      map.set(key, {
        teacher: teacherName,
        subject: a.subject.name,
        class: a.class.name,
      });
    }
  }

  for (const l of lessons) {
    if (l.teacher && l.subject && l.class) {
      const teacherName = `${l.teacher.name} ${l.teacher.surname}`;
      const key = `${teacherName}-${l.subject.name}-${l.class.name}`;
      if (!map.has(key)) {
        map.set(key, {
          teacher: teacherName,
          subject: l.subject.name,
          class: l.class.name,
        });
      }
    }
  }

  let list = Array.from(map.values());

  if (args.className) {
    const targetNorm = normalizeClassName(args.className);
    list = list.filter((item) => {
      const itemNorm = normalizeClassName(item.class);
      return itemNorm.includes(targetNorm) || targetNorm.includes(itemNorm);
    });
  }

  if (args.teacherName) {
    const tLower = args.teacherName.toLowerCase();
    list = list.filter((item) => item.teacher.toLowerCase().includes(tLower));
  }

  if (args.subjectName) {
    const sLower = args.subjectName.toLowerCase();
    list = list.filter((item) => item.subject.toLowerCase().includes(sLower));
  }

  return list;
}

// ─── NEW Copilot Data Tools ───

async function getStudentsAbsentMoreThan(args: { days: number; className?: string }) {
  const threshold = Math.max(1, args.days);
  const cutoff = subDays(new Date(), 90); // look back ~1 term

  const classFilter: Record<string, unknown> = {};
  if (args.className) {
    classFilter.class = { name: { contains: args.className, mode: 'insensitive' } };
  }

  const students = await prisma.student.findMany({
    where: classFilter,
    select: {
      id: true,
      name: true,
      surname: true,
      class: { select: { name: true } },
      attendances: {
        where: {
          present: false,
          date: { gte: cutoff },
        },
        select: { id: true },
      },
    },
  });

  const absentees = students
    .map(s => ({
      name: `${s.name} ${s.surname}`,
      class: s.class?.name || "Unassigned",
      absentDays: s.attendances.length,
    }))
    .filter(s => s.absentDays >= threshold)
    .sort((a, b) => b.absentDays - a.absentDays)
    .slice(0, 30);

  return {
    threshold,
    totalFound: absentees.length,
    students: absentees,
  };
}

async function getStudentsOwingMoreThan(args: { amount: number; className?: string }) {
  const minAmount = Math.max(0, Number.isNaN(args.amount) ? 0 : args.amount);

  const classFilter: Record<string, unknown> = {};
  if (args.className) {
    classFilter.class = { name: { contains: args.className, mode: 'insensitive' } };
  }

  const students = await prisma.student.findMany({
    where: classFilter,
    select: {
      id: true,
      name: true,
      surname: true,
      class: { select: { name: true } },
      fees: {
        where: { status: { in: ["PENDING", "OVERDUE"] } },
        select: { amount: true, paidAmount: true, title: true },
      },
    },
  });

  const debtors = students
    .map(s => {
      const totalOwed = s.fees.reduce((sum, f) => sum + (f.amount - f.paidAmount), 0);
      return {
        name: `${s.name} ${s.surname}`,
        class: s.class?.name || "Unassigned",
        totalOwed: Math.round(totalOwed * 100) / 100,
        unpaidItems: s.fees.length,
      };
    })
    .filter(s => s.totalOwed >= minAmount)
    .sort((a, b) => b.totalOwed - a.totalOwed)
    .slice(0, 30);

  return {
    minimumAmount: minAmount,
    totalFound: debtors.length,
    students: debtors,
  };
}

async function getTeacherWorkload() {
  const teachers = await prisma.teacher.findMany({
    select: {
      id: true,
      name: true,
      surname: true,
      lessons: {
        select: {
          id: true,
          classId: true,
          subjectId: true,
          subject: { select: { name: true } },
        },
      },
      classes: { select: { name: true } },
      subjectAssignments: {
        select: {
          class: { select: { name: true } },
          subject: { select: { name: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const workloads = teachers.map(t => {
    const uniqueClasses = new Set(t.lessons.map(l => l.classId));
    const uniqueSubjects = new Set(t.lessons.map(l => l.subjectId));
    const subjectNames = [...new Set(t.lessons.map(l => l.subject.name))];

    return {
      name: `${t.name} ${t.surname}`,
      totalLessons: t.lessons.length,
      uniqueClasses: uniqueClasses.size,
      uniqueSubjects: uniqueSubjects.size,
      supervisedClasses: t.classes.map(c => c.name),
      subjects: subjectNames,
      workloadScore: t.lessons.length + uniqueClasses.size * 2 + (t.classes.length * 3),
    };
  })
  .sort((a, b) => b.workloadScore - a.workloadScore)
  .slice(0, 15);

  return {
    totalTeachers: teachers.length,
    rankings: workloads,
  };
}

async function getClassPerformanceSummary(args: { className?: string }) {
  const now = new Date();
  const startDate = subDays(now, 90);
  const activeStudentWhere = await getActiveStudentWhere();

  const classFilter: Record<string, unknown> = {};
  if (args.className) {
    classFilter.name = { contains: args.className, mode: 'insensitive' };
  }

  const classes = await prisma.class.findMany({
    where: classFilter,
    select: {
      id: true,
      name: true,
      grade: { select: { level: true } },
      supervisor: { select: { name: true, surname: true } },
      _count: { select: { students: { where: activeStudentWhere } } },
      students: {
        where: activeStudentWhere,
        select: {
          id: true,
          results: {
            select: {
              score: true,
              exam: { select: { startTime: true } },
              assignment: { select: { dueDate: true } },
            },
          },
          attendances: {
            where: { date: { gte: startDate } },
            select: { present: true },
          },
          behaviors: {
            where: { date: { gte: startDate } },
            select: { type: true },
          },
        },
      },
    },
    take: 20,
  });

  return classes.map(cls => {
    const allScores: number[] = [];
    let totalAttendance = 0;
    let totalPresent = 0;
    let negativeIncidents = 0;

    for (const student of cls.students) {
      for (const result of student.results) {
        const resultDate = result.exam?.startTime ?? result.assignment?.dueDate;
        if (resultDate && resultDate >= startDate) {
          allScores.push(result.score);
        }
      }
      totalAttendance += student.attendances.length;
      totalPresent += student.attendances.filter(a => a.present).length;
      negativeIncidents += student.behaviors.filter(b => b.type === "NEGATIVE").length;
    }

    const avgScore = allScores.length > 0
      ? Math.round((allScores.reduce((s, v) => s + v, 0) / allScores.length) * 10) / 10
      : 0;
    const passRate = allScores.length > 0
      ? Math.round((allScores.filter(s => s >= 50).length / allScores.length) * 1000) / 10
      : 0;
    const excellenceRate = allScores.length > 0
      ? Math.round((allScores.filter(s => s >= 80).length / allScores.length) * 1000) / 10
      : 0;
    const attendanceRate = totalAttendance > 0
      ? Math.round((totalPresent / totalAttendance) * 1000) / 10
      : 0;

    return {
      className: cls.name,
      gradeLevel: GRADE_NAMES[cls.grade.level] || `Grade ${cls.grade.level}`,
      supervisor: cls.supervisor ? `${cls.supervisor.name} ${cls.supervisor.surname}` : "Unassigned",
      studentCount: cls._count.students,
      assessmentsCount: allScores.length,
      averageScore: avgScore,
      passRate,
      excellenceRate,
      attendanceRate,
      negativeIncidents,
    };
  });
}

async function getStudentPerformanceDetail(args: { searchName?: string }) {
  const rawSearch = typeof args.searchName === "string" ? args.searchName.trim() : "";
  const search = cleanSearchName(rawSearch);
  const whereClauses: Record<string, unknown>[] = [];

  if (search) {
    const queryParts = search.split(/\s+/).filter(Boolean);
    whereClauses.push({
      AND: queryParts.map((part) => ({
        OR: [
          { name: { contains: part, mode: "insensitive" as const } },
          { surname: { contains: part, mode: "insensitive" as const } },
        ],
      })),
    });
  }

  const where = whereClauses.length > 0 ? { AND: whereClauses } : {};
  const cutoff = subDays(new Date(), 90);

  const students = await prisma.student.findMany({
    where,
    select: {
      id: true,
      name: true,
      surname: true,
      studentId: true,
      class: { select: { name: true } },
      grade: { select: { level: true } },
      parent: { select: { name: true, surname: true, phone: true } },
      results: {
        select: {
          score: true,
          exam: { select: { title: true, startTime: true, lesson: { select: { subject: { select: { name: true } } } } } },
          assignment: { select: { title: true, dueDate: true, lesson: { select: { subject: { select: { name: true } } } } } },
        },
        orderBy: { id: "desc" },
        take: 20,
      },
      attendances: {
        where: { date: { gte: cutoff } },
        select: { present: true },
      },
      fees: {
        where: { status: { in: ["PENDING", "OVERDUE"] } },
        select: { amount: true, paidAmount: true, title: true },
      },
      behaviors: {
        where: { date: { gte: cutoff } },
        select: { type: true, title: true, severity: true, date: true },
        orderBy: { date: "desc" },
        take: 5,
      },
    },
    take: 5,
  });

  return students.map(s => {
    const scores = s.results.map(r => r.score);
    const avgScore = scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : 0;
    const totalAttendance = s.attendances.length;
    const presentCount = s.attendances.filter(a => a.present).length;
    const attendanceRate = totalAttendance > 0
      ? Math.round((presentCount / totalAttendance) * 1000) / 10
      : 0;
    const totalOwed = s.fees.reduce((sum, f) => sum + (f.amount - f.paidAmount), 0);

    const recentResults = s.results.slice(0, 10).map(r => ({
      subject: r.exam?.lesson?.subject?.name ?? r.assignment?.lesson?.subject?.name ?? "Unknown",
      title: r.exam?.title ?? r.assignment?.title ?? "Assessment",
      score: r.score,
    }));

    return {
      name: `${s.name} ${s.surname}`,
      studentId: s.studentId,
      class: s.class?.name || "Unassigned",
      grade: s.grade ? (GRADE_NAMES[s.grade.level] || `Grade ${s.grade.level}`) : "Unassigned",
      parent: s.parent ? `${s.parent.name} ${s.parent.surname} (${s.parent.phone || "no phone"})` : "None",
      averageScore: avgScore,
      totalAssessments: scores.length,
      attendanceRate,
      totalAbsent: totalAttendance - presentCount,
      outstandingFees: Math.round(totalOwed * 100) / 100,
      unpaidFeeItems: s.fees.length,
      recentResults,
      recentBehaviors: s.behaviors.map(b => ({
        type: b.type,
        title: b.title,
        severity: b.severity,
        date: format(b.date, "yyyy-MM-dd"),
      })),
    };
  });
}

async function predictAtRiskStudents(args: { className?: string; gradeLevel?: number }) {
  const cutoff = subDays(new Date(), 90);

  const classFilter: Record<string, unknown> = {};
  if (args.className) {
    classFilter.class = { name: { contains: args.className, mode: 'insensitive' } };
  }
  if (args.gradeLevel) {
    classFilter.grade = { level: args.gradeLevel };
  }

  const students = await prisma.student.findMany({
    where: classFilter,
    select: {
      id: true,
      name: true,
      surname: true,
      class: { select: { name: true } },
      grade: { select: { level: true } },
      results: {
        select: { score: true },
      },
      attendances: {
        where: { date: { gte: cutoff } },
        select: { present: true },
      },
      behaviors: {
        where: { date: { gte: cutoff }, type: "NEGATIVE" },
        select: { id: true },
      },
    },
  });

  const atRisk = students
    .map(s => {
      const scores = s.results.map(r => r.score);
      const avgScore = scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;
      const totalAttendance = s.attendances.length;
      const absentCount = s.attendances.filter(a => !a.present).length;
      const attendanceRate = totalAttendance > 0
        ? (s.attendances.filter(a => a.present).length / totalAttendance) * 100
        : 100;
      const negativeIncidents = s.behaviors.length;

      // Risk scoring: low average + poor attendance + bad behavior = high risk
      let riskScore = 0;
      if (avgScore < 40) riskScore += 40;
      else if (avgScore < 50) riskScore += 30;
      else if (avgScore < 60) riskScore += 15;

      if (attendanceRate < 70) riskScore += 30;
      else if (attendanceRate < 80) riskScore += 20;
      else if (attendanceRate < 90) riskScore += 10;

      if (negativeIncidents >= 5) riskScore += 20;
      else if (negativeIncidents >= 3) riskScore += 15;
      else if (negativeIncidents >= 1) riskScore += 5;

      // Penalize students with very few assessments (can't gauge performance)
      if (scores.length < 3 && scores.length > 0) riskScore += 10;

      const riskLevel = riskScore >= 50 ? "HIGH" : riskScore >= 30 ? "MEDIUM" : "LOW";

      return {
        name: `${s.name} ${s.surname}`,
        class: s.class?.name || "Unassigned",
        grade: s.grade ? (GRADE_NAMES[s.grade.level] || `Grade ${s.grade.level}`) : "Unassigned",
        averageScore: Math.round(avgScore * 10) / 10,
        attendanceRate: Math.round(attendanceRate * 10) / 10,
        absentDays: absentCount,
        negativeIncidents,
        riskScore,
        riskLevel,
        factors: [
          ...(avgScore < 50 ? [`Low avg score (${Math.round(avgScore)}%)`] : []),
          ...(attendanceRate < 80 ? [`Poor attendance (${Math.round(attendanceRate)}%)`] : []),
          ...(negativeIncidents >= 3 ? [`${negativeIncidents} behavior incidents`] : []),
          ...(scores.length < 3 ? ["Very few assessments"] : []),
        ],
      };
    })
    .filter(s => s.riskLevel === "HIGH" || s.riskLevel === "MEDIUM")
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 25);

  return {
    totalStudentsAnalyzed: students.length,
    atRiskCount: atRisk.length,
    highRisk: atRisk.filter(s => s.riskLevel === "HIGH").length,
    mediumRisk: atRisk.filter(s => s.riskLevel === "MEDIUM").length,
    students: atRisk,
  };
}

async function generateReportComments(args: { className: string; limit?: number }) {
  if (!args.className) return { error: "className is required" };

  const cutoff = subDays(new Date(), 90);
  const limit = Math.min(args.limit || 15, 20);
  const activeStudentWhere = await getActiveStudentWhere();

  const classData = await prisma.class.findFirst({
    where: { name: { contains: args.className, mode: 'insensitive' } },
    select: {
      name: true,
      students: {
        where: activeStudentWhere,
        select: {
          name: true,
          surname: true,
          results: {
            select: {
              score: true,
              exam: { select: { lesson: { select: { subject: { select: { name: true } } } } } },
              assignment: { select: { lesson: { select: { subject: { select: { name: true } } } } } },
            },
          },
          attendances: {
            where: { date: { gte: cutoff } },
            select: { present: true },
          },
          behaviors: {
            where: { date: { gte: cutoff } },
            select: { type: true },
          },
        },
        take: limit,
      },
    },
  });

  if (!classData) {
    return { error: `Class "${args.className}" not found` };
  }

  const studentSummaries = classData.students.map(s => {
    const scores = s.results.map(r => r.score);
    const avgScore = scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : 0;
    const totalAttendance = s.attendances.length;
    const presentCount = s.attendances.filter(a => a.present).length;
    const attendanceRate = totalAttendance > 0
      ? Math.round((presentCount / totalAttendance) * 1000) / 10
      : 0;
    const negativeCount = s.behaviors.filter(b => b.type === "NEGATIVE").length;
    const positiveCount = s.behaviors.filter(b => b.type === "POSITIVE").length;

    // Collect subject-level performance
    const subjectScores = new Map<string, number[]>();
    for (const r of s.results) {
      const subName = r.exam?.lesson?.subject?.name ?? r.assignment?.lesson?.subject?.name ?? "Unknown";
      const existing = subjectScores.get(subName) || [];
      existing.push(r.score);
      subjectScores.set(subName, existing);
    }

    const strongSubjects: string[] = [];
    const weakSubjects: string[] = [];
    for (const [subName, sScores] of subjectScores) {
      const subAvg = sScores.reduce((a, b) => a + b, 0) / sScores.length;
      if (subAvg >= 75) strongSubjects.push(subName);
      if (subAvg < 50) weakSubjects.push(subName);
    }

    // Generate comment based on data
    let comment = "";
    const name = s.name;

    if (avgScore >= 80) {
      comment = `${name} is an outstanding student who consistently excels in academics`;
      if (strongSubjects.length > 0) comment += `, particularly in ${strongSubjects.slice(0, 2).join(" and ")}`;
      comment += `.`;
      if (attendanceRate >= 90) comment += ` Excellent attendance record.`;
      if (positiveCount > 0) comment += ` Shows commendable conduct in class.`;
      comment += ` Keep up the exceptional work!`;
    } else if (avgScore >= 65) {
      comment = `${name} shows good academic performance with an average of ${avgScore}%`;
      if (strongSubjects.length > 0) comment += ` and excels in ${strongSubjects.slice(0, 2).join(" and ")}`;
      comment += `.`;
      if (weakSubjects.length > 0) comment += ` Needs more effort in ${weakSubjects.slice(0, 2).join(" and ")}.`;
      if (attendanceRate < 85) comment += ` Attendance needs improvement.`;
      comment += ` With more dedication, ${name} can achieve even greater results.`;
    } else if (avgScore >= 50) {
      comment = `${name} demonstrates average performance with an overall score of ${avgScore}%`;
      comment += `.`;
      if (weakSubjects.length > 0) comment += ` Requires additional support in ${weakSubjects.slice(0, 2).join(" and ")}.`;
      if (attendanceRate < 80) comment += ` Irregular attendance is affecting progress.`;
      if (negativeCount >= 2) comment += ` Conduct needs attention.`;
      comment += ` ${name} is encouraged to seek extra help and dedicate more time to studies.`;
    } else {
      comment = `${name} is struggling academically with an average of ${avgScore}%`;
      if (weakSubjects.length > 0) comment += ` and needs urgent intervention in ${weakSubjects.slice(0, 2).join(" and ")}`;
      comment += `.`;
      if (attendanceRate < 75) comment += ` Poor attendance is a contributing factor.`;
      if (negativeCount >= 2) comment += ` Behavior issues need to be addressed.`;
      comment += ` Parental involvement and extra tutoring are strongly recommended.`;
    }

    return {
      name: `${s.name} ${s.surname}`,
      averageScore: avgScore,
      attendanceRate,
      comment,
    };
  });

  return {
    class: classData.name,
    totalStudents: studentSummaries.length,
    comments: studentSummaries,
  };
}

async function getFeeDefaultersSummary(args: { className?: string }) {
  const activeStudentWhere = await getActiveStudentWhere();
  const classFilter: Record<string, unknown> = {};
  if (args.className) {
    classFilter.name = { contains: args.className, mode: 'insensitive' };
  }

  const classes = await prisma.class.findMany({
    where: classFilter,
    select: {
      name: true,
      students: {
        where: activeStudentWhere,
        select: {
          name: true,
          surname: true,
          fees: {
            where: { status: { in: ["PENDING", "OVERDUE"] } },
            select: { amount: true, paidAmount: true },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const summary = classes.map(cls => {
    const defaulters = cls.students
      .map(s => {
        const owed = s.fees.reduce((sum, f) => sum + (f.amount - f.paidAmount), 0);
        return {
          name: `${s.name} ${s.surname}`,
          amountOwed: Math.round(owed * 100) / 100,
        };
      })
      .filter(s => s.amountOwed > 0)
      .sort((a, b) => b.amountOwed - a.amountOwed);

    const totalClassArrears = defaulters.reduce((sum, d) => sum + d.amountOwed, 0);

    return {
      className: cls.name,
      totalDefaulters: defaulters.length,
      totalStudents: cls.students.length,
      totalArrears: Math.round(totalClassArrears * 100) / 100,
      topDefaulters: defaulters.slice(0, 5),
    };
  }).filter(c => c.totalDefaulters > 0);

  const grandTotal = summary.reduce((sum, c) => sum + c.totalArrears, 0);

  return {
    totalClassesWithDefaulters: summary.length,
    grandTotalArrears: Math.round(grandTotal * 100) / 100,
    byClass: summary,
  };
}

// ─── Tool Definitions for AI ───

const toolDefinitions: ChatCompletionTool[] = [
  // --- Existing tools ---
  {
    type: "function",
    function: {
      name: "getGeneralStats",
      description: "Get basic counts of students, teachers, classes, and parents in the school.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "getAttendanceStats",
      description: "Get attendance rate and records for a specific date or today.",
      parameters: {
        type: "object",
        properties: {
          dateStr: { type: "string", description: "The date in YYYY-MM-DD format. Defaults to today." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getFinancialSummary",
      description: "Get a summary of school fees including total amount, paid, pending, and overdue amounts.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "getClassData",
      description: "Get stats for a specific class (by name) or all classes if no name is provided.",
      parameters: {
        type: "object",
        properties: {
          className: { type: "string", description: "The name of the class (e.g., '1A', 'JHS 1')." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getStudentData",
      description: "Search for a student by name, or get a list of students in a class or all students in the school.",
      parameters: {
        type: "object",
        properties: {
          searchName: { type: "string", description: "Optional: student name to search for." },
          className: { type: "string", description: "Optional: filter by class name (e.g., 'JHS 1', 'Primary 5')." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getTeacherData",
      description: "Get a list of all teachers in the school with their subjects and supervised classes, or search for a specific teacher by name or subject taught.",
      parameters: {
        type: "object",
        properties: {
          searchName: { type: "string", description: "Optional: teacher name to search for. If omitted, lists all teachers in the school." },
          subjectName: { type: "string", description: "Optional: filter by subject taught (e.g., 'Mathematics', 'Science')." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getTeacherAssignments",
      description: "Retrieve which teachers are assigned to which classes and subjects. You can filter by class name, teacher name, or subject name.",
      parameters: {
        type: "object",
        properties: {
          className: { type: "string", description: "Optional: filter by class name (e.g., 'JHS 2A')." },
          teacherName: { type: "string", description: "Optional: filter by teacher name." },
          subjectName: { type: "string", description: "Optional: filter by subject name (e.g., 'Mathematics', 'English')." },
        },
      },
    },
  },
  // --- NEW Copilot tools ---
  {
    type: "function",
    function: {
      name: "getStudentsAbsentMoreThan",
      description: "Find students who have been absent more than a specified number of days this term. Optionally filter by class name.",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "The minimum number of absent days (e.g., 10)." },
          className: { type: "string", description: "Optional: filter by class name (e.g., 'JHS 2')." },
        },
        required: ["days"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getStudentsOwingMoreThan",
      description: "Find students whose outstanding (unpaid or overdue) fees exceed a certain amount in GH₵. Optionally filter by class.",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number", description: "The minimum outstanding fee amount in GH₵ (e.g., 500)." },
          className: { type: "string", description: "Optional: filter by class name." },
        },
        required: ["amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getTeacherWorkload",
      description: "Rank all teachers by workload — total lessons, unique classes, unique subjects, and supervised classes. Identifies the most and least loaded teachers.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "getClassPerformanceSummary",
      description: "Get a detailed academic performance breakdown for a specific class or all classes — average score, pass rate, excellence rate, attendance rate, and behavior incidents.",
      parameters: {
        type: "object",
        properties: {
          className: { type: "string", description: "Optional: class name to get performance for. If omitted, returns all classes." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getStudentPerformanceDetail",
      description: "Get a comprehensive deep-dive for a student (or top students if no name provided): their scores, attendance, outstanding fees, recent behaviors, and subject-level breakdown.",
      parameters: {
        type: "object",
        properties: {
          searchName: { type: "string", description: "Optional: student name to search for." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "predictAtRiskStudents",
      description: "Predict which students are at risk of failing based on low scores, poor attendance, and behavior issues. Returns students with HIGH or MEDIUM risk levels along with their risk factors. Optionally filter by class or grade level.",
      parameters: {
        type: "object",
        properties: {
          className: { type: "string", description: "Optional: filter by class name." },
          gradeLevel: { type: "number", description: "Optional: filter by grade level number (e.g., 7 for JHS 1)." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generateReportComments",
      description: "Generate AI-powered report card comments for all students in a specific class. Comments are personalized based on each student's scores, attendance, behavior, and subject strengths/weaknesses.",
      parameters: {
        type: "object",
        properties: {
          className: { type: "string", description: "The class name to generate report comments for (e.g., 'JHS 2A')." },
          limit: { type: "number", description: "Maximum number of students to generate comments for. Defaults to 15, max 20." },
        },
        required: ["className"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getFeeDefaultersSummary",
      description: "Get a summary of fee defaulters organized by class — total defaulters per class, total arrears, and the top defaulters in each class. Optionally filter by class name.",
      parameters: {
        type: "object",
        properties: {
          className: { type: "string", description: "Optional: filter by class name." },
        },
      },
    },
  },
];

function parseToolArguments(value: string) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

async function callTool(name: string, args: Record<string, unknown> = {}) {
  switch (name) {
    // Existing tools
    case "getGeneralStats": return await getGeneralStats();
    case "getAttendanceStats":
      return await getAttendanceStats({
        dateStr: typeof args.dateStr === "string" ? args.dateStr : undefined,
      });
    case "getFinancialSummary": return await getFinancialSummary();
    case "getClassData":
      return await getClassData({
        className: typeof args.className === "string" ? args.className : undefined,
      });
    case "getStudentData":
      return await getStudentData({
        searchName: typeof args.searchName === "string" ? args.searchName : undefined,
        className: typeof args.className === "string" ? args.className : undefined,
      });
    case "getTeacherData":
      return await getTeacherData({
        searchName: typeof args.searchName === "string" ? args.searchName : undefined,
        subjectName: typeof args.subjectName === "string" ? args.subjectName : undefined,
      });
    case "getTeacherAssignments":
      return await getTeacherAssignments({
        className: typeof args.className === "string" ? args.className : undefined,
        teacherName: typeof args.teacherName === "string" ? args.teacherName : undefined,
        subjectName: typeof args.subjectName === "string" ? args.subjectName : undefined,
      });

    // NEW Copilot tools
    case "getStudentsAbsentMoreThan":
      return await getStudentsAbsentMoreThan({
        days: typeof args.days === "number" ? args.days : 10,
        className: typeof args.className === "string" ? args.className : undefined,
      });
    case "getStudentsOwingMoreThan":
      return await getStudentsOwingMoreThan({
        amount: typeof args.amount === "number" ? args.amount : 0,
        className: typeof args.className === "string" ? args.className : undefined,
      });
    case "getTeacherWorkload":
      return await getTeacherWorkload();
    case "getClassPerformanceSummary":
      return await getClassPerformanceSummary({
        className: typeof args.className === "string" ? args.className : undefined,
      });
    case "getStudentPerformanceDetail":
      return await getStudentPerformanceDetail({
        searchName: String(args.searchName || ""),
      });
    case "predictAtRiskStudents":
      return await predictAtRiskStudents({
        className: typeof args.className === "string" ? args.className : undefined,
        gradeLevel: typeof args.gradeLevel === "number" ? args.gradeLevel : undefined,
      });
    case "generateReportComments":
      return await generateReportComments({
        className: String(args.className || ""),
        limit: typeof args.limit === "number" ? args.limit : undefined,
      });
    case "getFeeDefaultersSummary":
      return await getFeeDefaultersSummary({
        className: typeof args.className === "string" ? args.className : undefined,
      });
    default: throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── Reasoning Loop ───

export type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

type SchoolSettings = Awaited<ReturnType<typeof getSystemSettings>>;

type GroqErrorLike = {
  error?: {
    error?: {
      failed_generation?: unknown;
    };
    failed_generation?: unknown;
  };
  failed_generation?: unknown;
  message?: unknown;
  status?: unknown;
};

function getGroqErrorStatus(error: unknown) {
  const status = (error as GroqErrorLike | null)?.status;
  return typeof status === "number" ? status : null;
}

function getGroqErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  const message = (error as GroqErrorLike | null)?.message;
  return typeof message === "string" ? message : String(error || "");
}

function getFailedGeneration(error: unknown) {
  const groqError = error as GroqErrorLike | null;

  return (
    groqError?.error?.error?.failed_generation ??
    groqError?.error?.failed_generation ??
    groqError?.failed_generation
  );
}

function hasAssistantToolCalls(message: ChatCompletionMessageParam) {
  if (message.role !== "assistant") return false;

  return Array.isArray(
    (message as ChatCompletionMessageParam & { tool_calls?: unknown[] }).tool_calls
  );
}

// Helper: given pre-fetched DB data, ask Groq to answer the question directly (no tools)
async function buildDirectReply(
  rawQuestion: string,
  history: ChatHistoryMessage[],
  settings: SchoolSettings,
  prefetchedData: string
): Promise<string | null> {
  try {
    const sysPrompt = `You are the School Copilot for ${settings.schoolName}.
Answer the user's question using ONLY the provided database data.
Do NOT use markdown. Do NOT use asterisks or hash symbols.
Be concise and factual. Use numbered lists when presenting multiple items.
IMPORTANT: When listing people (teachers or students), list ALL of them from the data. 
If a teacher has no subjects assigned, still list them by name.
If the data doesn't contain the answer, say so clearly.`;

    const msgs: ChatCompletionMessageParam[] = [
      { role: "system", content: sysPrompt },
    ];

    // Include recent history for context
    for (const msg of history.slice(-4)) {
      if ((msg.role === "user" || msg.role === "assistant") && msg.content.trim()) {
        msgs.push({ role: msg.role, content: msg.content.trim() });
      }
    }

    msgs.push({
      role: "user",
      content: `DATABASE DATA:\n${prefetchedData}\n\nQUESTION: ${rawQuestion}`,
    });

    let res;
    try {
      res = await getGroqClient().chat.completions.create({
        messages: msgs,
        model: DEFAULT_GROQ_MODEL,
        temperature: 0.3,
        max_tokens: 1024,
        // NO tools — force plain text answer
      });
    } catch (modelErr: unknown) {
      if (getGroqErrorStatus(modelErr) === 429 || getGroqErrorMessage(modelErr).includes("rate_limit")) {
        console.warn("[Groq Fallback] Primary model rate limited, retrying with openai/gpt-oss-120b");
        res = await getGroqClient().chat.completions.create({
          messages: msgs,
          model: "openai/gpt-oss-120b",
          temperature: 0.3,
          max_tokens: 1024,
        });
      } else {
        throw modelErr;
      }
    }

    let reply = res.choices[0]?.message?.content || "";
    reply = reply.replace(/[\*#]/g, "");
    reply = normalizeAssistantText(reply);
    return reply.trim() || null;
  } catch (err) {
    console.error("[buildDirectReply] Error:", err);
    return null;
  }
}

// Failsafe: if Groq is offline or erroring, query Prisma directly so user always gets factual data
async function buildEmergencyFallbackReply(
  rawQuestion: string,
  history: ChatHistoryMessage[] = []
): Promise<string> {
  try {
    const qLower = rawQuestion.toLowerCase();
    const historyText = history.slice(-4).map((m) => m.content).join(" ").toLowerCase();
    const combined = `${qLower} ${historyText}`;

    // Emergency attendance lookup
    const isAttendanceReq = /\b(absent|absentees|absenteeism|attendance)\b/i.test(combined);
    if (isAttendanceReq) {
      const daysMatch = rawQuestion.match(/(\d+)/);
      const days = daysMatch ? parseInt(daysMatch[1], 10) : 10;
      const data = await getStudentsAbsentMoreThan({ days });
      if (data.students.length === 0) {
        return `No students found absent more than ${days} days this term.`;
      }
      const list = data.students
        .map((s, i) => `${i + 1}. ${s.name} (${s.class}) — Absent ${s.absentDays} days`)
        .join("\n");
      return `Students absent more than ${days} days this term:\n${list}`;
    }

    // Emergency teacher/class lookup
    const targetClass = extractClassName(rawQuestion);
    const isTeacherReq = /\b(teachers?|tachers?|teaches?|teaching|staff|instructor|instructors|supervisor)\b/i.test(combined);

    if (isTeacherReq && targetClass) {
      const assignments = await getTeacherAssignments({ className: targetClass });
      if (assignments.length > 0) {
        const list = assignments
          .map((a, i) => `${i + 1}. ${a.teacher} — ${a.subject} (${a.class})`)
          .join("\n");
        return `Teachers assigned to ${targetClass}:\n${list}`;
      }
    }

    const searchName = cleanSearchName(rawQuestion);
    if (searchName) {
      const students = await getStudentData({ searchName });
      if (students.length > 0) {
        const list = students
          .map((s, i) => `${i + 1}. ${s.name} — Class: ${s.class} (${s.grade})`)
          .join("\n");
        return `Student records:\n${list}`;
      }
      const teachers = await getTeacherData({ searchName });
      if (teachers.length > 0) {
        const list = teachers
          .map((t, i) => `${i + 1}. ${t.name}${t.subjects.length ? ` — Subjects: ${t.subjects.join(", ")}` : ""}${t.classesTaught.length ? ` | Classes: ${t.classesTaught.join(", ")}` : ""}`)
          .join("\n");
        return `Teacher records:\n${list}`;
      }
    }

    if (/\b(owe|owing|fees?|defaulters?|arrears|unpaid)\b/i.test(combined)) {
      const amountMatch = rawQuestion.match(/(\d+)/);
      const amount = amountMatch ? parseInt(amountMatch[1], 10) : 0;
      const data = await getStudentsOwingMoreThan({ amount });
      if (data.students.length === 0) {
        return `No students found owing ${amount > 0 ? `more than GH₵${amount}` : "fees"}.`;
      }
      const list = data.students
        .map((s, i) => `${i + 1}. ${s.name} (${s.class}) — Owes GH₵${s.totalOwed}`)
        .join("\n");
      return `Students owing ${amount > 0 ? `more than GH₵${amount}` : "fees"}:\n${list}`;
    }

    if (/\b(teachers?|teaches|teaching|staff|instructor|instructors)\b/i.test(combined)) {
      const teachers = await getTeacherData({});
      if (teachers.length === 0) return "There are currently no teachers registered in the database.";
      const list = teachers
        .map((t, i) => `${i + 1}. ${t.name}${t.subjects.length ? ` — ${t.subjects.join(", ")}` : ""}`)
        .join("\n");
      return `There ${teachers.length === 1 ? "is 1 teacher" : `are ${teachers.length} teachers`} in the school:\n${list}`;
    }

    if (/\b(students?|pupils?|classes?)\b/i.test(combined)) {
      const stats = await getGeneralStats();
      return `The school currently has ${stats.students} students, ${stats.teachers} teachers, ${stats.classes} classes, and ${stats.parents} parents registered.`;
    }

    const stats = await getGeneralStats();
    return `School Overview:\n1. Teachers: ${stats.teachers}\n2. Students: ${stats.students}\n3. Classes: ${stats.classes}\n4. Parents: ${stats.parents}`;
  } catch (err) {
    console.error("Emergency fallback DB error:", err);
    return "I could not retrieve school data right now. Please try again in a moment.";
  }
}

export async function generateSystemAssistantReply(
  rawQuestion: string,
  sessionUser: AssistantSessionUser,
  history: ChatHistoryMessage[] = []
): Promise<SystemAssistantResponse> {
  const settings = await getSystemSettings();

  // Try to build an action plan first (SMS broadcast etc.). Wrapped in try-catch
  // so a database/network error here doesn't crash the whole response.
  try {
    const actionPlan = await buildAssistantActionPlan(rawQuestion, sessionUser);
    if (actionPlan) {
      return {
        action: actionPlan,
        reply: actionPlan.summary,
        intent: "action-plan",
        generatedAt: new Date().toISOString(),
      };
    }
  } catch (planError) {
    console.error("Assistant action-plan build error:", planError);
    // Fall through to the Groq AI reasoning path below
  }

  // ─── Proactive Pre-fetch Strategy ───
  // For questions about teachers + subjects/classes, pre-fetch all data and
  // inject as context. This avoids relying on provider-specific tool-call formatting.
  // which intermittently emits <function=...> syntax instead of proper JSON tool calls.
  const qLower = rawQuestion.toLowerCase();
  const historyText = history.slice(-4).map(m => m.content).join(" ").toLowerCase();
  const combinedContext = `${qLower} ${historyText}`;

  const isTeacherQuery = /\b(teachers?|tachers?|teaches?|teaching|instructor|instructors|staff|faculty|supervisor|supervises?)\b/i.test(combinedContext);
  const isSubjectQuery = /\b(math|mathematics|english|science|social|ict|computing|french|history|geography|subject|subjects|class|classes|jhs|shs|basic|primary|kg|nursery|grade)\b/i.test(qLower) || Boolean(extractClassName(rawQuestion));
  const isStudentQuery = /\b(students?|pupils?|class|classes|grade|grades|enrolled|which class|which grade)\b/i.test(combinedContext);
  const isFollowUp = /\b(them|they|their|he|she|which one|who|the one|amongst|among|name them|list them)\b/i.test(qLower) && history.length > 0;
  const isListQuery = /\b(list|name|show|all|how many|count|who are|which)\b/i.test(qLower);

  // Pre-fetch for teacher/subject/class follow-up (e.g. "which tacher teaches JHS2A", "who teaches Math")
  const detectedClass = extractClassName(rawQuestion);
  const isTeacherListQuery = isTeacherQuery && (isListQuery || isFollowUp || Boolean(detectedClass));
  if (isTeacherListQuery || (isTeacherQuery && isSubjectQuery)) {
    try {
      const [allTeachers, allAssignments] = await Promise.all([
        callTool("getTeacherData", {}),
        callTool("getTeacherAssignments", detectedClass ? { className: detectedClass } : {}),
      ]);

      const teacherCount = Array.isArray(allTeachers) ? allTeachers.length : 0;
      const prefetchData = `[allTeachers (${teacherCount} total)]: ${JSON.stringify(allTeachers)}\n[teacherAssignments ${detectedClass ? `for ${detectedClass}` : ""}]: ${JSON.stringify(allAssignments)}`;
      const prefetchResult = await buildDirectReply(rawQuestion, history, settings, prefetchData);
      if (prefetchResult) {
        return {
          reply: prefetchResult,
          intent: "prefetch-teacher",
          generatedAt: new Date().toISOString(),
        };
      }
    } catch (prefetchErr) {
      console.error("[Prefetch] Teacher prefetch failed:", prefetchErr);
      // Fall through to main reasoning loop
    }
  }


  // Pre-fetch for fee queries (e.g. "Show students who owe more than GH₵500 in fees", "fee defaulters")
  const isFeeQuery = /\b(owe|owing|fees?|defaulters?|arrears|unpaid)\b/i.test(qLower);
  if (isFeeQuery) {
    try {
      const amountMatch = rawQuestion.match(/(\d+)/);
      const amount = amountMatch ? parseInt(amountMatch[1], 10) : 0;
      const debtors = await callTool("getStudentsOwingMoreThan", { amount });
      const prefetchData = `[studentsOwingMoreThan (${amount} GH₵ threshold)]: ${JSON.stringify(debtors)}`;
      const prefetchResult = await buildDirectReply(rawQuestion, history, settings, prefetchData);
      if (prefetchResult) {
        return {
          reply: prefetchResult,
          intent: "prefetch-fee",
          generatedAt: new Date().toISOString(),
        };
      }
    } catch (prefetchErr) {
      console.error("[Prefetch] Fee prefetch failed:", prefetchErr);
      // Fall through to main reasoning loop
    }
  }

  // Pre-fetch for attendance queries (e.g. "Which students have been absent more than 10 days this term?")
  const isAttendanceQuery = /\b(absent|absentees|absenteeism|attendance)\b/i.test(qLower);
  if (isAttendanceQuery) {
    try {
      const daysMatch = rawQuestion.match(/(\d+)/);
      const days = daysMatch ? parseInt(daysMatch[1], 10) : 10;
      const absentees = await callTool("getStudentsAbsentMoreThan", { days });
      const prefetchData = `[studentsAbsentMoreThan (${days} days threshold)]: ${JSON.stringify(absentees)}`;
      const prefetchResult = await buildDirectReply(rawQuestion, history, settings, prefetchData);
      if (prefetchResult) {
        return {
          reply: prefetchResult,
          intent: "prefetch-attendance",
          generatedAt: new Date().toISOString(),
        };
      }
    } catch (prefetchErr) {
      console.error("[Prefetch] Attendance prefetch failed:", prefetchErr);
      // Fall through to main reasoning loop
    }
  }

  // Pre-fetch for student/person lookups (e.g. "which class is Mark Aggrey?", "find student Kojo")
  const searchName = cleanSearchName(rawQuestion);
  const isPersonQuery = !isFeeQuery && !isAttendanceQuery && (isStudentQuery || isTeacherQuery || /\b(who|where|find|lookup|info|about)\b/i.test(qLower)) && (Boolean(searchName) || isListQuery);

  if (isPersonQuery) {
    try {
      const [students, teachers] = await Promise.all([
        callTool("getStudentData", searchName ? { searchName } : {}),
        searchName ? callTool("getTeacherData", { searchName }) : Promise.resolve([]),
      ]);
      const prefetchData = `[studentData]: ${JSON.stringify(students)}\n[teacherData]: ${JSON.stringify(teachers)}`;
      const prefetchResult = await buildDirectReply(rawQuestion, history, settings, prefetchData);
      if (prefetchResult) {
        return {
          reply: prefetchResult,
          intent: "prefetch-person",
          generatedAt: new Date().toISOString(),
        };
      }
    } catch (prefetchErr) {
      console.error("[Prefetch] Person prefetch failed:", prefetchErr);
      // Fall through to main reasoning loop
    }
  }

  const systemPrompt = `
You are the School Copilot — an advanced AI assistant for the ${settings.schoolName} school management system.
You have access to live school data via powerful analysis tools and can provide deep insights, predictions, and recommendations.

CURRENT CONTEXT:
- School: ${settings.schoolName}
- Academic Year: ${settings.academicYear}
- Term: ${settings.currentTerm}
- Today: ${format(new Date(), "EEEE, MMMM do, yyyy")}

YOUR CAPABILITIES:
1. ATTENDANCE: Find absent students, check attendance rates by date, identify chronic absentees.
2. FEES: Show students owing fees above a threshold, list fee defaulters by class, financial summaries.
3. ACADEMICS: Class performance breakdowns (avg score, pass rate, excellence rate), individual student deep-dives.
4. TEACHERS: List all teachers in the school, teacher workload rankings, subject/class assignments, teacher search.
5. PREDICTIONS: Identify at-risk students likely to fail using scores + attendance + behavior data.
6. REPORT COMMENTS: Generate personalized report card comments based on student data.
7. ACTIONS: Draft parent SMS broadcasts and personal notes (these require user confirmation).

INSTRUCTIONS:
1. Always use tools to get factual data — never invent numbers, teacher names, or student names.
2. When asked to list or name teachers (e.g. "name them", "list the teachers", "who are the teachers"), ALWAYS call the getTeacherData tool (with empty searchName if asking for all teachers) to retrieve the real list of teachers from the database.
3. When presenting lists of students, teachers, or data, format them as numbered lists for readability.
4. For predictions, explain the risk factors clearly (low scores, poor attendance, behavior incidents).
5. When generating report comments, include the student's name, average score, and the generated comment.
6. If a requested write action is not supported yet, say which system tool needs to be added.
7. Provide actionable recommendations when you find problems (e.g., "Consider contacting the parents of these students").
8. DO NOT USE MARKDOWN. Do not use asterisks (*) for bold or hash symbols (#) for headers. Use plain text only. If you want to emphasize something, use CAPITAL LETTERS.
9. Use the school's currency (GH₵) when discussing fees.
10. You can call multiple tools in sequence to answer complex questions.
`;

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
  ];

  // Include recent conversation history for multi-turn context (e.g., "name them", "what about JHS 2")
  if (Array.isArray(history)) {
    for (const msg of history.slice(-6)) {
      if (msg.role === "user" || msg.role === "assistant") {
        if (typeof msg.content === "string" && msg.content.trim()) {
          messages.push({
            role: msg.role,
            content: msg.content.trim(),
          });
        }
      }
    }
  }

  messages.push({ role: "user", content: rawQuestion });

  try {
    // Increased loop to 5 for complex multi-tool queries
    for (let i = 0; i < 5; i++) {
      const response = await getGroqClient().chat.completions.create({
        messages,
        model: DEFAULT_GROQ_MODEL,
        temperature: 0.5,
        max_tokens: 2048,
        tools: toolDefinitions,
        tool_choice: "auto",
      });

      const message = response.choices[0]?.message;
      if (!message) break;

      if (message.tool_calls && message.tool_calls.length > 0) {
        messages.push({
          role: "assistant",
          content: message.content || "",
          tool_calls: message.tool_calls,
        });
        
        for (const toolCall of message.tool_calls) {
          try {
            const toolResult = await callTool(
              toolCall.function.name,
              parseToolArguments(toolCall.function.arguments)
            );
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(toolResult),
            });
          } catch (toolError) {
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify({
                error: toolError instanceof Error ? toolError.message : "Tool execution failed.",
              }),
            });
          }
        }
        continue; // Run the loop again with tool results
      }

      // Final cleanup to ensure no stray markdown characters
      let reply = message.content || "I couldn't generate a response.";
      reply = reply.replace(/[\*#]/g, ''); // Remove all * and # characters
      reply = normalizeAssistantText(reply);

      return {
        reply: reply.trim(),
        intent: "groq-tool-reasoning",
        generatedAt: new Date().toISOString(),
      };
    }

    return {
      reply: "The reasoning process took too many steps. Please try a simpler question.",
      intent: "timeout",
      generatedAt: new Date().toISOString(),
    };

  } catch (error: unknown) {
    console.error("Groq AI Error:", error);

    // Groq model sometimes emits raw XML <function=toolName{json}</function>
    // which Groq API rejects as tool_use_failed. Recover gracefully by parsing the calls.
    const failedGen = getFailedGeneration(error);

    if (typeof failedGen === "string" && failedGen.includes("<function=")) {
      // Parse ALL function calls in the failed_generation string
      const fnCallRegex = /<function=(\w+)(\{[\s\S]*?\})/g;
      const toolResults: { name: string; result: unknown }[] = [];
      let fnMatch: RegExpExecArray | null;

      while ((fnMatch = fnCallRegex.exec(failedGen)) !== null) {
        const fnName = fnMatch[1];
        const rawArgs = fnMatch[2];
        try {
          const parsedArgs = parseToolArguments(rawArgs);
          const result = await callTool(fnName, parsedArgs);
          toolResults.push({ name: fnName, result });
          console.log(`[Recovery] Executed tool "${fnName}" successfully`);
        } catch (toolErr) {
          console.error(`[Recovery] Tool "${fnName}" failed:`, toolErr);
        }
      }

      if (toolResults.length > 0) {
        try {
          // Supplement with broader context: if a teacher-related tool returned empty/partial
          // data, fetch all teachers + assignments to give the LLM the full picture needed
          // to answer subject/class follow-up questions (e.g. "which teaches math?")
          const fetchedTools = toolResults.map(r => r.name);
          const hasEmptyTeacherResult = toolResults.some(
            r => r.name === "getTeacherData" && Array.isArray(r.result) && r.result.length === 0
          );

          if (hasEmptyTeacherResult || fetchedTools.includes("getTeacherData") || fetchedTools.includes("getTeacherAssignments")) {
            try {
              // Fetch all teachers with their subjects for full context
              const allTeachers = await callTool("getTeacherData", {});
              toolResults.push({ name: "allTeachers", result: allTeachers });
              // Also fetch all class-subject-teacher assignments
              const allAssignments = await callTool("getTeacherAssignments", {});
              toolResults.push({ name: "allAssignments", result: allAssignments });
              console.log(`[Recovery] Supplemented with full teacher and assignment data`);
            } catch (suppErr) {
              console.error(`[Recovery] Supplemental teacher fetch failed:`, suppErr);
            }
          }

          // Build a clean message array: strip any assistant messages that contain
          // orphaned tool_calls (Groq rejects tool_calls without matching tool responses).
          const safeMessages: ChatCompletionMessageParam[] = messages.filter(
            (m) => !hasAssistantToolCalls(m)
          );

          const dataSummary = toolResults
            .map(({ name, result }) => `[${name}]: ${JSON.stringify(result)}`)
            .join("\n\n");

          const recoveryMessages: ChatCompletionMessageParam[] = [
            ...safeMessages,
            {
              role: "user" as const,
              content: `Here is the requested database data you need to answer my question:\n\n${dataSummary}\n\nPlease answer my question clearly and concisely based on the data above. Do NOT use markdown. Do NOT use asterisks or hash symbols.`,
            },
          ];

          const recoveryResponse = await getGroqClient().chat.completions.create({
            messages: recoveryMessages,
            model: DEFAULT_GROQ_MODEL,
            temperature: 0.3,
            max_tokens: 1024,
            // NO tools parameter — force plain text response
          });

          let reply = recoveryResponse.choices[0]?.message?.content
            || "Here is the information from the database.";
          reply = reply.replace(/[\*#]/g, "");
          reply = normalizeAssistantText(reply);

          return {
            reply: reply.trim(),
            intent: "groq-tool-recovery",
            generatedAt: new Date().toISOString(),
          };
        } catch (recoveryErr) {
          console.error("Tool recovery completion failed:", recoveryErr);
        }
      }
    }

    console.error("Groq AI Error, triggering emergency DB fallback:", error);
    const emergencyReply = await buildEmergencyFallbackReply(rawQuestion, history);
    return {
      reply: emergencyReply,
      intent: "emergency-fallback",
      generatedAt: new Date().toISOString(),
    };
  }
}
