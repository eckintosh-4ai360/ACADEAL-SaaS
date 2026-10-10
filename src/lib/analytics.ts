import prisma from "@/lib/prisma";
import { subDays } from "date-fns";

export type PerformanceStatus = "Excellent" | "Stable" | "Watch" | "Critical";
export type TrendDirection = "up" | "down" | "flat";
export type InsightPriority = "high" | "medium" | "low";

export interface TrendSummary {
  direction: TrendDirection;
  delta: number;
}

export interface ClassPerformanceMetric {
  classId: number;
  className: string;
  gradeLevel: number;
  studentsCount: number;
  assessmentsCount: number;
  averageScore: number;
  passRate: number;
  excellenceRate: number;
  attendanceRate: number;
  negativeIncidents: number;
  healthScore: number;
  consistencyScore: number;
  coverageScore: number;
  status: PerformanceStatus;
  trend: TrendSummary;
  focusAreas: string[];
  recommendation: string;
}

export interface TeacherPerformanceMetric {
  teacherId: string;
  teacherName: string;
  classesHandled: number;
  subjectsHandled: string[];
  studentsReached: number;
  assessmentsCount: number;
  averageScore: number;
  passRate: number;
  attendanceRateAcrossClasses: number;
  classHealthAverage: number;
  effectivenessScore: number;
  consistencyScore: number;
  status: PerformanceStatus;
  trend: TrendSummary;
  strengths: string[];
  developmentAreas: string[];
  recommendation: string;
}

export interface SubjectPerformanceMetric {
  subjectId: number;
  subjectName: string;
  classesCovered: number;
  teachersCount: number;
  assessmentsCount: number;
  averageScore: number;
  passRate: number;
  excellenceRate: number;
  attendanceAlignment: number;
  consistencyScore: number;
  performanceIndex: number;
  status: PerformanceStatus;
  trend: TrendSummary;
  riskFactors: string[];
  recommendation: string;
}

export interface StrategicInsight {
  id: string;
  priority: InsightPriority;
  title: string;
  detail: string;
  recommendedAction: string;
}

export interface SchoolAnalyticsSummary {
  generatedAt: Date;
  periodDays: number;
  kpis: {
    overallAverageScore: number;
    overallPassRate: number;
    overallAttendanceRate: number;
    totalAssessments: number;
    classesAtRisk: number;
    teachersNeedingSupport: number;
    subjectsNeedingSupport: number;
    improvingClasses: number;
  };
  classMetrics: ClassPerformanceMetric[];
  teacherMetrics: TeacherPerformanceMetric[];
  subjectMetrics: SubjectPerformanceMetric[];
  insights: StrategicInsight[];
}

interface ScoreEntry {
  score: number;
  date: Date;
  studentId: string;
  classId: number;
  teacherId: string;
  subjectId: number;
  subjectName: string;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const round1 = (value: number) => Number(value.toFixed(1));

const average = (values: number[]) =>
  values.length > 0 ? values.reduce((acc, val) => acc + val, 0) / values.length : 0;

const percentage = (part: number, total: number) => (total > 0 ? (part / total) * 100 : 0);

const standardDeviation = (values: number[]) => {
  if (values.length <= 1) return 0;

  const mean = average(values);
  const variance =
    values.reduce((acc, value) => acc + (value - mean) ** 2, 0) / values.length;

  return Math.sqrt(variance);
};

const getConsistencyScore = (values: number[]) => {
  if (values.length <= 1) return 100;
  return clamp(100 - standardDeviation(values) * 2.8, 0, 100);
};

const getStatus = (score: number): PerformanceStatus => {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Stable";
  if (score >= 50) return "Watch";
  return "Critical";
};

const getTrend = (entries: ScoreEntry[], now: Date): TrendSummary => {
  const currentStart = subDays(now, 30);
  const previousStart = subDays(now, 60);

  const currentScores = entries
    .filter((entry) => entry.date >= currentStart)
    .map((entry) => entry.score);
  const previousScores = entries
    .filter((entry) => entry.date < currentStart && entry.date >= previousStart)
    .map((entry) => entry.score);

  const currentAvg = average(currentScores);
  const previousAvg = average(previousScores);
  const delta = currentAvg - previousAvg;

  if (Math.abs(delta) < 2) {
    return { direction: "flat", delta: round1(delta) };
  }

  return {
    direction: delta > 0 ? "up" : "down",
    delta: round1(delta),
  };
};

const getTrendAdjustment = (trend: TrendSummary) => {
  if (trend.direction === "up") return clamp(trend.delta, 0, 6);
  if (trend.direction === "down") return -clamp(Math.abs(trend.delta), 0, 8);
  return 0;
};

const classRecommendation = (metric: {
  averageScore: number;
  attendanceRate: number;
  negativeRatePerStudent: number;
  coverageScore: number;
  consistencyScore: number;
  trend: TrendSummary;
  healthScore: number;
}) => {
  if (metric.healthScore < 50) {
    return "Start a 4-week intervention plan with remediation, family outreach, and weekly academic review.";
  }
  if (metric.trend.direction === "down" && metric.trend.delta <= -5) {
    return "Investigate the recent drop in results and re-sequence weak topics before the next assessment cycle.";
  }
  if (metric.averageScore < 60) {
    return "Run targeted support groups for struggling learners and tighten lesson pacing.";
  }
  if (metric.coverageScore < 85) {
    return "Increase assessment reach so every learner is represented in the performance picture.";
  }
  if (metric.consistencyScore < 60) {
    return "Stabilize performance with revision clinics and closer follow-up on fluctuating learners.";
  }
  if (metric.attendanceRate < 85) {
    return "Strengthen attendance follow-up and involve parents for recurring absences.";
  }
  if (metric.negativeRatePerStudent > 0.6) {
    return "Introduce classroom behaviour coaching and monitor conduct incidents weekly.";
  }
  return "Maintain the current strategy and share this class's strongest routines across other classrooms.";
};

const teacherRecommendation = (metric: {
  effectivenessScore: number;
  averageScore: number;
  passRate: number;
  attendanceRateAcrossClasses: number;
  assessmentsCount: number;
  consistencyScore: number;
  trend: TrendSummary;
}) => {
  if (metric.effectivenessScore < 50) {
    return "Assign coaching support, increase lesson observation, and review progress every two weeks.";
  }
  if (metric.trend.direction === "down" && metric.trend.delta <= -5) {
    return "Review recent schemes of work and support re-teaching in the lowest-performing topics.";
  }
  if (metric.averageScore < 60 || metric.passRate < 60) {
    return "Provide subject-specific planning support and tighter assessment follow-up.";
  }
  if (metric.consistencyScore < 60) {
    return "Focus on stabilizing learner outcomes across classes before the next reporting cycle.";
  }
  if (metric.attendanceRateAcrossClasses < 85) {
    return "Coordinate with class heads on engagement and attendance improvement actions.";
  }
  if (metric.assessmentsCount < 10) {
    return "Increase continuous assessment frequency to spot learning gaps earlier.";
  }
  return "Recognize performance and involve this teacher in peer mentoring initiatives.";
};

const subjectRecommendation = (metric: {
  averageScore: number;
  passRate: number;
  attendanceAlignment: number;
  consistencyScore: number;
  trend: TrendSummary;
  assessmentsCount: number;
}) => {
  if (metric.trend.direction === "down" && metric.trend.delta <= -5) {
    return "Audit recent lesson delivery and reteach the weakest concepts before the next assessment window.";
  }
  if (metric.averageScore < 60 || metric.passRate < 60) {
    return "Prioritize curriculum support, item analysis, and targeted revision for this subject.";
  }
  if (metric.consistencyScore < 60) {
    return "Reduce performance volatility through common pacing guides and cross-class moderation.";
  }
  if (metric.attendanceAlignment < 85) {
    return "Pair subject intervention with attendance recovery in the most affected classes.";
  }
  if (metric.assessmentsCount < 8) {
    return "Increase assessment frequency so subject performance can be tracked more reliably.";
  }
  return "Keep the current instructional approach and share successful methods with other departments.";
};

const buildClassInsights = (metrics: ClassPerformanceMetric[]) => {
  const insights: StrategicInsight[] = [];
  const atRisk = metrics
    .filter((metric) => metric.status === "Critical" || metric.status === "Watch")
    .slice(0, 4);

  for (const metric of atRisk) {
    insights.push({
      id: `class-risk-${metric.classId}`,
      priority: metric.status === "Critical" ? "high" : "medium",
      title: `${metric.className} requires attention`,
      detail: `Health ${metric.healthScore}% | Avg ${metric.averageScore}% | Consistency ${metric.consistencyScore}%`,
      recommendedAction: metric.recommendation,
    });
  }

  const topClass = [...metrics].sort((a, b) => b.healthScore - a.healthScore)[0];
  if (topClass) {
    insights.push({
      id: `class-top-${topClass.classId}`,
      priority: "low",
      title: `${topClass.className} is a high-performing class`,
      detail: `Health ${topClass.healthScore}% with ${topClass.excellenceRate}% excellence rate.`,
      recommendedAction: "Document and replicate this class's teaching and classroom management practices.",
    });
  }

  return insights;
};

const buildTeacherInsights = (metrics: TeacherPerformanceMetric[]) => {
  const insights: StrategicInsight[] = [];
  const support = metrics
    .filter((metric) => metric.status === "Critical" || metric.status === "Watch")
    .slice(0, 4);

  for (const metric of support) {
    insights.push({
      id: `teacher-support-${metric.teacherId}`,
      priority: metric.status === "Critical" ? "high" : "medium",
      title: `${metric.teacherName} needs instructional support`,
      detail: `Effectiveness ${metric.effectivenessScore}% | Avg ${metric.averageScore}% | Consistency ${metric.consistencyScore}%`,
      recommendedAction: metric.recommendation,
    });
  }

  const topTeacher = [...metrics].sort((a, b) => b.effectivenessScore - a.effectivenessScore)[0];
  if (topTeacher) {
    insights.push({
      id: `teacher-top-${topTeacher.teacherId}`,
      priority: "low",
      title: `${topTeacher.teacherName} is leading performance`,
      detail: `Effectiveness ${topTeacher.effectivenessScore}% across ${topTeacher.classesHandled} classes.`,
      recommendedAction: "Use this teacher for peer coaching and internal best-practice sessions.",
    });
  }

  return insights;
};

const buildSubjectInsights = (metrics: SubjectPerformanceMetric[]) => {
  const insights: StrategicInsight[] = [];
  const support = metrics
    .filter((metric) => metric.status === "Critical" || metric.status === "Watch")
    .slice(0, 3);

  for (const metric of support) {
    insights.push({
      id: `subject-support-${metric.subjectId}`,
      priority: metric.status === "Critical" ? "high" : "medium",
      title: `${metric.subjectName} is a curriculum hotspot`,
      detail: `Index ${metric.performanceIndex}% | Avg ${metric.averageScore}% | Pass ${metric.passRate}%`,
      recommendedAction: metric.recommendation,
    });
  }

  const bestSubject = [...metrics].sort((a, b) => b.performanceIndex - a.performanceIndex)[0];
  if (bestSubject) {
    insights.push({
      id: `subject-top-${bestSubject.subjectId}`,
      priority: "low",
      title: `${bestSubject.subjectName} is leading subject performance`,
      detail: `Index ${bestSubject.performanceIndex}% with ${bestSubject.excellenceRate}% excellence rate.`,
      recommendedAction: "Capture the teaching sequence and assessment design used in this subject for wider reuse.",
    });
  }

  return insights;
};

const sortInsights = (insights: StrategicInsight[]) => {
  const priorityOrder: Record<InsightPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  return [...insights].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
};

export async function getSchoolAnalyticsSummary(): Promise<SchoolAnalyticsSummary> {
  const now = new Date();
  const periodDays = 60;
  const startDate = subDays(now, periodDays);

  const [classes, teachers, results, attendances, behaviors] = await Promise.all([
    prisma.class.findMany({
      select: {
        id: true,
        name: true,
        grade: { select: { level: true } },
        students: { select: { id: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.teacher.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        surname: true,
        lessons: {
          select: {
            classId: true,
            subject: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.result.findMany({
      select: {
        score: true,
        studentId: true,
        exam: {
          select: {
            startTime: true,
            lesson: {
              select: {
                classId: true,
                teacherId: true,
                subjectId: true,
                subject: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        assignment: {
          select: {
            dueDate: true,
            lesson: {
              select: {
                classId: true,
                teacherId: true,
                subjectId: true,
                subject: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.attendance.findMany({
      where: { date: { gte: startDate } },
      select: {
        present: true,
        lesson: { select: { classId: true } },
      },
    }),
    prisma.behavior.findMany({
      where: { date: { gte: startDate } },
      select: {
        type: true,
        student: { select: { classId: true } },
      },
    }),
  ]);

  const classScores = new Map<number, ScoreEntry[]>();
  const teacherScores = new Map<string, ScoreEntry[]>();
  const subjectScores = new Map<number, ScoreEntry[]>();
  const subjectMeta = new Map<
    number,
    { subjectName: string; classIds: Set<number>; teacherIds: Set<string> }
  >();
  const periodScores: number[] = [];

  for (const result of results) {
    const lesson = result.exam?.lesson ?? result.assignment?.lesson;
    if (!lesson) continue;

    const assessmentDate = result.exam?.startTime ?? result.assignment?.dueDate ?? now;
    if (assessmentDate < startDate) continue;

    const entry: ScoreEntry = {
      score: result.score,
      date: assessmentDate,
      studentId: result.studentId,
      classId: lesson.classId,
      teacherId: lesson.teacherId,
      subjectId: lesson.subjectId,
      subjectName: lesson.subject.name,
    };

    periodScores.push(result.score);

    const currentClassScores = classScores.get(lesson.classId) || [];
    currentClassScores.push(entry);
    classScores.set(lesson.classId, currentClassScores);

    const currentTeacherScores = teacherScores.get(lesson.teacherId) || [];
    currentTeacherScores.push(entry);
    teacherScores.set(lesson.teacherId, currentTeacherScores);

    const currentSubjectScores = subjectScores.get(lesson.subjectId) || [];
    currentSubjectScores.push(entry);
    subjectScores.set(lesson.subjectId, currentSubjectScores);

    const currentSubjectMeta = subjectMeta.get(lesson.subjectId) || {
      subjectName: lesson.subject.name,
      classIds: new Set<number>(),
      teacherIds: new Set<string>(),
    };
    currentSubjectMeta.classIds.add(lesson.classId);
    currentSubjectMeta.teacherIds.add(lesson.teacherId);
    subjectMeta.set(lesson.subjectId, currentSubjectMeta);
  }

  const classAttendanceMap = new Map<number, { present: number; total: number }>();
  for (const attendance of attendances) {
    const current = classAttendanceMap.get(attendance.lesson.classId) || {
      present: 0,
      total: 0,
    };
    current.total += 1;
    if (attendance.present) current.present += 1;
    classAttendanceMap.set(attendance.lesson.classId, current);
  }

  const classBehaviorMap = new Map<
    number,
    { negative: number; positive: number; neutral: number; total: number }
  >();
  for (const behavior of behaviors) {
    const classId = behavior.student.classId;
    const current = classBehaviorMap.get(classId) || {
      negative: 0,
      positive: 0,
      neutral: 0,
      total: 0,
    };

    current.total += 1;
    if (behavior.type === "NEGATIVE") current.negative += 1;
    if (behavior.type === "POSITIVE") current.positive += 1;
    if (behavior.type === "NEUTRAL") current.neutral += 1;

    classBehaviorMap.set(classId, current);
  }

  const classMetrics: ClassPerformanceMetric[] = classes.map((classItem) => {
    const scoreEntries = classScores.get(classItem.id) || [];
    const scores = scoreEntries.map((entry) => entry.score);
    const avgScore = average(scores);
    const passRate = percentage(scores.filter((score) => score >= 50).length, scores.length);
    const excellenceRate = percentage(
      scores.filter((score) => score >= 80).length,
      scores.length
    );

    const attendance = classAttendanceMap.get(classItem.id) || { present: 0, total: 0 };
    const attendanceRate = percentage(attendance.present, attendance.total);

    const behavior = classBehaviorMap.get(classItem.id) || {
      negative: 0,
      positive: 0,
      neutral: 0,
      total: 0,
    };

    const studentsCount = classItem.students.length;
    if (studentsCount === 0) {
      return {
        classId: classItem.id,
        className: classItem.name,
        gradeLevel: classItem.grade.level,
        studentsCount: 0,
        assessmentsCount: 0,
        averageScore: 0,
        passRate: 0,
        excellenceRate: 0,
        attendanceRate: 0,
        negativeIncidents: 0,
        healthScore: 70,
        consistencyScore: 100,
        coverageScore: 0,
        status: "Stable",
        trend: { direction: "flat", delta: 0 },
        focusAreas: ["Enrollment planning"],
        recommendation: "No students are currently assigned. Use this class for placement planning.",
      };
    }

    const assessedStudents = new Set(scoreEntries.map((entry) => entry.studentId)).size;
    const coverageScore = percentage(assessedStudents, studentsCount);
    const consistencyScore = getConsistencyScore(scores);
    const trend = getTrend(scoreEntries, now);
    const negativeRatePerStudent = behavior.negative / studentsCount;
    const behaviorIndex = clamp(100 - negativeRatePerStudent * 35, 0, 100);

    const healthScore = clamp(
      avgScore * 0.34 +
        passRate * 0.22 +
        attendanceRate * 0.18 +
        behaviorIndex * 0.1 +
        consistencyScore * 0.08 +
        coverageScore * 0.08 +
        getTrendAdjustment(trend),
      0,
      100
    );

    const focusAreas: string[] = [];
    if (avgScore < 60) focusAreas.push("Academic outcomes");
    if (passRate < 60) focusAreas.push("Pass rate");
    if (attendanceRate < 85) focusAreas.push("Attendance");
    if (consistencyScore < 60) focusAreas.push("Consistency");
    if (coverageScore < 85) focusAreas.push("Assessment reach");
    if (negativeRatePerStudent > 0.6) focusAreas.push("Behaviour");
    if (trend.direction === "down" && trend.delta <= -5) focusAreas.push("Momentum");
    if (focusAreas.length === 0) focusAreas.push("Sustain momentum");

    return {
      classId: classItem.id,
      className: classItem.name,
      gradeLevel: classItem.grade.level,
      studentsCount,
      assessmentsCount: scores.length,
      averageScore: round1(avgScore),
      passRate: round1(passRate),
      excellenceRate: round1(excellenceRate),
      attendanceRate: round1(attendanceRate),
      negativeIncidents: behavior.negative,
      healthScore: round1(healthScore),
      consistencyScore: round1(consistencyScore),
      coverageScore: round1(coverageScore),
      status: getStatus(healthScore),
      trend,
      focusAreas,
      recommendation: classRecommendation({
        averageScore: avgScore,
        attendanceRate,
        negativeRatePerStudent,
        coverageScore,
        consistencyScore,
        trend,
        healthScore,
      }),
    };
  });

  const classHealthById = new Map<number, number>(
    classMetrics.map((metric) => [metric.classId, metric.healthScore])
  );
  const classAttendanceById = new Map<number, number>(
    classMetrics.map((metric) => [metric.classId, metric.attendanceRate])
  );

  const subjectMetrics: SubjectPerformanceMetric[] = Array.from(subjectScores.entries()).map(
    ([subjectId, entries]) => {
      const scores = entries.map((entry) => entry.score);
      const meta = subjectMeta.get(subjectId) || {
        subjectName: entries[0]?.subjectName || "Subject",
        classIds: new Set<number>(),
        teacherIds: new Set<string>(),
      };

      const avgScore = average(scores);
      const passRate = percentage(scores.filter((score) => score >= 50).length, scores.length);
      const excellenceRate = percentage(
        scores.filter((score) => score >= 80).length,
        scores.length
      );
      const consistencyScore = getConsistencyScore(scores);
      const trend = getTrend(entries, now);
      const attendanceAlignment = average(
        Array.from(meta.classIds)
          .map((classId) => classAttendanceById.get(classId))
          .filter((value): value is number => typeof value === "number")
      );

      const performanceIndex = clamp(
        avgScore * 0.45 +
          passRate * 0.25 +
          attendanceAlignment * 0.15 +
          consistencyScore * 0.15 +
          getTrendAdjustment(trend),
        0,
        100
      );

      const riskFactors: string[] = [];
      if (avgScore < 60) riskFactors.push("Low average score");
      if (passRate < 60) riskFactors.push("Weak pass rate");
      if (consistencyScore < 60) riskFactors.push("Unstable results");
      if (attendanceAlignment < 85) riskFactors.push("Attendance drag");
      if (trend.direction === "down" && trend.delta <= -4) riskFactors.push("Declining trend");
      if (riskFactors.length === 0) riskFactors.push("Healthy performance");

      return {
        subjectId,
        subjectName: meta.subjectName,
        classesCovered: meta.classIds.size,
        teachersCount: meta.teacherIds.size,
        assessmentsCount: scores.length,
        averageScore: round1(avgScore),
        passRate: round1(passRate),
        excellenceRate: round1(excellenceRate),
        attendanceAlignment: round1(attendanceAlignment),
        consistencyScore: round1(consistencyScore),
        performanceIndex: round1(performanceIndex),
        status: getStatus(performanceIndex),
        trend,
        riskFactors,
        recommendation: subjectRecommendation({
          averageScore: avgScore,
          passRate,
          attendanceAlignment,
          consistencyScore,
          trend,
          assessmentsCount: scores.length,
        }),
      };
    }
  );

  const teacherMetrics: TeacherPerformanceMetric[] = teachers.map((teacher) => {
    const entries = teacherScores.get(teacher.id) || [];
    const scores = entries.map((entry) => entry.score);
    const classIds = Array.from(new Set(teacher.lessons.map((lesson) => lesson.classId)));
    const subjectsHandled = Array.from(
      new Set(teacher.lessons.map((lesson) => lesson.subject.name))
    );
    const studentsReached = new Set(entries.map((entry) => entry.studentId)).size;

    const avgScore = average(scores);
    const passRate = percentage(scores.filter((score) => score >= 50).length, scores.length);
    const attendanceAcrossClasses = average(
      classIds
        .map((classId) => classAttendanceById.get(classId))
        .filter((value): value is number => typeof value === "number")
    );
    const classHealthAverage = average(
      classIds
        .map((classId) => classHealthById.get(classId))
        .filter((value): value is number => typeof value === "number")
    );
    const consistencyScore = getConsistencyScore(scores);
    const trend = getTrend(entries, now);

    const baseEffectiveness = clamp(
      avgScore * 0.38 +
        passRate * 0.22 +
        attendanceAcrossClasses * 0.16 +
        classHealthAverage * 0.12 +
        consistencyScore * 0.08 +
        getTrendAdjustment(trend),
      0,
      100
    );
    const effectivenessScore =
      entries.length === 0 && classIds.length === 0 ? 70 : baseEffectiveness;

    const strengths: string[] = [];
    if (avgScore >= 75) strengths.push("Strong learner outcomes");
    if (passRate >= 70) strengths.push("High pass consistency");
    if (attendanceAcrossClasses >= 90) strengths.push("Strong class engagement");
    if (consistencyScore >= 75) strengths.push("Stable results");
    if (trend.direction === "up" && trend.delta >= 4) strengths.push("Positive momentum");
    if (strengths.length === 0) strengths.push("Opportunity to build strengths");

    const developmentAreas: string[] = [];
    if (entries.length === 0 && classIds.length === 0) {
      developmentAreas.push("No assigned classes");
    } else {
      if (avgScore < 60) developmentAreas.push("Assessment outcomes");
      if (passRate < 60) developmentAreas.push("Pass-rate support");
      if (attendanceAcrossClasses < 85) developmentAreas.push("Attendance engagement");
      if (consistencyScore < 60) developmentAreas.push("Result consistency");
      if (trend.direction === "down" && trend.delta <= -5) developmentAreas.push("Momentum recovery");
      if (entries.length < 10) developmentAreas.push("Assessment frequency");
    }
    if (developmentAreas.length === 0) developmentAreas.push("Maintain current trajectory");

    return {
      teacherId: teacher.id,
      teacherName: `${teacher.name} ${teacher.surname}`,
      classesHandled: classIds.length,
      subjectsHandled,
      studentsReached,
      assessmentsCount: entries.length,
      averageScore: round1(avgScore),
      passRate: round1(passRate),
      attendanceRateAcrossClasses: round1(attendanceAcrossClasses),
      classHealthAverage: round1(classHealthAverage),
      effectivenessScore: round1(effectivenessScore),
      consistencyScore: round1(consistencyScore),
      status: getStatus(effectivenessScore),
      trend,
      strengths,
      developmentAreas,
      recommendation:
        entries.length === 0 && classIds.length === 0
          ? "No active lessons assigned in this period. Assign classes before performance evaluation."
          : teacherRecommendation({
              effectivenessScore,
              averageScore: avgScore,
              passRate,
              attendanceRateAcrossClasses: attendanceAcrossClasses,
              assessmentsCount: entries.length,
              consistencyScore,
              trend,
            }),
    };
  });

  const orderedClassMetrics = [...classMetrics].sort((a, b) => a.healthScore - b.healthScore);
  const orderedTeacherMetrics = [...teacherMetrics].sort(
    (a, b) => a.effectivenessScore - b.effectivenessScore
  );
  const orderedSubjectMetrics = [...subjectMetrics].sort(
    (a, b) => a.performanceIndex - b.performanceIndex
  );

  const totalAssessments = periodScores.length;
  const overallAverageScore = average(periodScores);
  const overallPassRate = percentage(
    periodScores.filter((score) => score >= 50).length,
    periodScores.length
  );
  const overallAttendanceRate = percentage(
    attendances.filter((attendance) => attendance.present).length,
    attendances.length
  );
  const classesAtRisk = orderedClassMetrics.filter(
    (metric) => metric.status === "Critical" || metric.status === "Watch"
  ).length;
  const teachersNeedingSupport = orderedTeacherMetrics.filter(
    (metric) => metric.status === "Critical" || metric.status === "Watch"
  ).length;
  const subjectsNeedingSupport = orderedSubjectMetrics.filter(
    (metric) => metric.status === "Critical" || metric.status === "Watch"
  ).length;
  const improvingClasses = orderedClassMetrics.filter(
    (metric) => metric.trend.direction === "up" && metric.healthScore >= 65
  ).length;

  const systemInsights: StrategicInsight[] = [];
  const weakestSubject = orderedSubjectMetrics[0];
  if (weakestSubject && weakestSubject.status !== "Excellent") {
    systemInsights.push({
      id: `system-subject-${weakestSubject.subjectId}`,
      priority:
        weakestSubject.status === "Critical" || weakestSubject.status === "Watch"
          ? "high"
          : "medium",
      title: `${weakestSubject.subjectName} is the weakest-performing subject`,
      detail: `Index ${weakestSubject.performanceIndex}% | Avg ${weakestSubject.averageScore}% | Consistency ${weakestSubject.consistencyScore}%`,
      recommendedAction: weakestSubject.recommendation,
    });
  }

  const decliningClasses = orderedClassMetrics.filter(
    (metric) => metric.trend.direction === "down" && metric.trend.delta <= -5
  );
  if (decliningClasses.length >= Math.max(2, Math.ceil(orderedClassMetrics.length * 0.25))) {
    systemInsights.push({
      id: "system-declining-classes",
      priority: "high",
      title: "A significant share of classes are trending downward",
      detail: `${decliningClasses.length} classes recorded a notable drop in the last 30 days.`,
      recommendedAction: "Run a short-cycle review across class heads to isolate the topics and attendance issues driving the decline.",
    });
  }

  if (overallAttendanceRate < 85) {
    systemInsights.push({
      id: "system-attendance",
      priority: "high",
      title: "Attendance is suppressing academic performance",
      detail: `Overall attendance is ${round1(overallAttendanceRate)}% across the last ${periodDays} days.`,
      recommendedAction: "Tighten daily follow-up, escalate repeat absence cases, and link attendance interventions to class performance plans.",
    });
  }

  if (improvingClasses > 0) {
    systemInsights.push({
      id: "system-improving-classes",
      priority: "low",
      title: "Several classes are building positive momentum",
      detail: `${improvingClasses} classes are trending upward with stable or better health.`,
      recommendedAction: "Review what is working in these classes and scale those practices into weaker cohorts.",
    });
  }

  const insights = sortInsights([
    ...systemInsights,
    ...buildClassInsights(orderedClassMetrics),
    ...buildTeacherInsights(orderedTeacherMetrics),
    ...buildSubjectInsights(orderedSubjectMetrics),
  ]).slice(0, 12);

  return {
    generatedAt: now,
    periodDays,
    kpis: {
      overallAverageScore: round1(overallAverageScore),
      overallPassRate: round1(overallPassRate),
      overallAttendanceRate: round1(overallAttendanceRate),
      totalAssessments,
      classesAtRisk,
      teachersNeedingSupport,
      subjectsNeedingSupport,
      improvingClasses,
    },
    classMetrics: orderedClassMetrics,
    teacherMetrics: orderedTeacherMetrics,
    subjectMetrics: orderedSubjectMetrics,
    insights,
  };
}
