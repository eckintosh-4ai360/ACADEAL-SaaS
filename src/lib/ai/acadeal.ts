import {
  AiConversationKind,
  AiMessageActor,
  AiQuestionPackSource,
  AiQuizStatus,
  AiWorkspaceRole,
} from "@prisma/client";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sanitizeHtml from "sanitize-html";

import { normalizeAssistantText } from "@/lib/assistant-text";
import prisma from "@/lib/prisma";
import { DEFAULT_GROQ_MODEL, getGroqClient } from "@/lib/groq";
import {
  normalizeAcadealQuestionCount,
  ACADEAL_DEFAULT_STUDENT_QUIZ_COUNT,
  ACADEAL_DEFAULT_TEACHER_PACK_COUNT,
} from "@/lib/acadeal-limits";
import { getSystemSettings } from "@/lib/settings";
import { GRADE_NAMES } from "@/lib/utils";
import type {
  ConversationAttachment,
  ConversationVisual,
  GeneratedQuestionPack,
  GeneratedQuiz,
  QuestionPackQuestion,
  QuestionPackView,
  QuizAnswerInput,
  QuizAttemptPayload,
  QuizAttemptView,
  QuizDifficulty,
  QuizQuestion,
  QuizQuestionResult,
  AcadealPageData,
  StudentWorkspaceData,
  TeacherWorkspaceData,
  WorkspaceConversation,
} from "@/types/acadeal";

type WorkspaceRole = "student" | "teacher";

type PdfParseModule = {
  PDFParse: new (options: { data: Buffer }) => {
    getText: () => Promise<{ text?: string }>;
    destroy: () => Promise<void>;
  };
};

const JSON_PROMPT_RULES = [
  "Return valid JSON only.",
  "Do not wrap the JSON in markdown fences.",
  "Do not add commentary before or after the JSON.",
].join(" ");

const GROQ_COMPLETION_MAX_ATTEMPTS = 3;

type GeneratedConceptVisual = {
  shouldGenerate?: boolean;
  title?: string;
  alt?: string;
  caption?: string;
  svg?: string;
};

const SVG_ALLOWED_TAGS = [
  "svg",
  "g",
  "defs",
  "linearGradient",
  "stop",
  "marker",
  "path",
  "line",
  "polyline",
  "polygon",
  "rect",
  "circle",
  "ellipse",
  "text",
  "tspan",
  "title",
  "desc",
];

const SVG_ALLOWED_ATTRIBUTES = {
  "*": [
    "fill",
    "stroke",
    "stroke-width",
    "stroke-linecap",
    "stroke-linejoin",
    "stroke-dasharray",
    "opacity",
    "transform",
    "id",
  ],
  svg: ["xmlns", "viewBox", "width", "height", "role", "aria-labelledby"],
  linearGradient: ["x1", "x2", "y1", "y2", "gradientUnits"],
  stop: ["offset", "stop-color", "stop-opacity"],
  marker: ["id", "viewBox", "refX", "refY", "markerWidth", "markerHeight", "orient"],
  path: ["d", "marker-start", "marker-mid", "marker-end"],
  line: ["x1", "y1", "x2", "y2", "marker-start", "marker-mid", "marker-end"],
  polyline: ["points", "marker-start", "marker-mid", "marker-end"],
  polygon: ["points"],
  rect: ["x", "y", "width", "height", "rx", "ry"],
  circle: ["cx", "cy", "r"],
  ellipse: ["cx", "cy", "rx", "ry"],
  text: ["x", "y", "font-size", "font-weight", "font-family", "text-anchor", "dominant-baseline"],
  tspan: ["x", "y", "dx", "dy", "font-size", "font-weight", "text-anchor"],
} satisfies Record<string, string[]>;

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeModelText(value: unknown) {
  return normalizeWhitespace(normalizeAssistantText(String(value || "")));
}

function stripCodeFence(value: string) {
  return value.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorStatus(error: unknown) {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error || "");
}

function getRetryAfterMs(error: unknown) {
  const headers = (error as { headers?: { get?: (name: string) => string | null | undefined } } | null)?.headers;
  const retryAfterValue = headers?.get?.("retry-after");

  if (!retryAfterValue) {
    return null;
  }

  const seconds = Number.parseFloat(retryAfterValue);

  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.round(seconds * 1000);
  }

  return null;
}

function isRetryableGroqError(error: unknown) {
  const status = getErrorStatus(error);
  const message = getErrorMessage(error).toLowerCase();

  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    message.includes("over capacity") ||
    message.includes("rate limit") ||
    message.includes("temporarily unavailable")
  );
}

function createUserFacingGroqError(error: unknown) {
  const status = getErrorStatus(error);
  const retryAfterMs = getRetryAfterMs(error);
  const retryAfterSeconds = retryAfterMs ? Math.max(1, Math.round(retryAfterMs / 1000)) : null;
  const message = getErrorMessage(error).toLowerCase();

  if (status === 503 || message.includes("over capacity")) {
    return Object.assign(
      new Error(
        retryAfterSeconds
          ? `Acadeal AI is temporarily over capacity. Please wait about ${retryAfterSeconds} seconds and try again.`
          : "Acadeal AI is temporarily over capacity. Please try again in a moment."
      ),
      { status: 503, cause: error }
    );
  }

  if (status === 429) {
    return Object.assign(
      new Error(
        retryAfterSeconds
          ? `Acadeal AI is rate-limited right now. Please wait about ${retryAfterSeconds} seconds and try again.`
          : "Acadeal AI is rate-limited right now. Please try again in a moment."
      ),
      { status: 429, cause: error }
    );
  }

  if (status === 500 || status === 502 || status === 504) {
    return Object.assign(
      new Error("Acadeal AI is temporarily unavailable. Please try again shortly."),
      { status: status || 503, cause: error }
    );
  }

  return error instanceof Error ? error : new Error(String(error || "AI request failed."));
}

function extractJson<T>(value: string): T {
  const cleaned = stripCodeFence(value);

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const objectStart = cleaned.indexOf("{");
    const objectEnd = cleaned.lastIndexOf("}");

    if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
      return JSON.parse(cleaned.slice(objectStart, objectEnd + 1)) as T;
    }

    throw new Error("Model did not return valid JSON.");
  }
}

async function runTextPrompt(systemPrompt: string, userPrompt: string, temperature = 0.5, maxTokens = 1600) {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < GROQ_COMPLETION_MAX_ATTEMPTS; attempt += 1) {
    try {
      const completion = await getGroqClient().chat.completions.create({
        model: DEFAULT_GROQ_MODEL,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      return completion.choices[0]?.message?.content?.trim() || "I could not generate a reply.";
    } catch (error) {
      lastError = error;

      if (!isRetryableGroqError(error) || attempt === GROQ_COMPLETION_MAX_ATTEMPTS - 1) {
        throw createUserFacingGroqError(error);
      }

      const retryAfterMs = getRetryAfterMs(error);
      const backoffMs = Math.min(12000, 1500 * 2 ** attempt);
      await wait(retryAfterMs ?? backoffMs);
    }
  }

  throw createUserFacingGroqError(lastError);
}

async function runJsonPrompt<T>(
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.3,
  maxTokens = 3200
) {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < GROQ_COMPLETION_MAX_ATTEMPTS; attempt += 1) {
    try {
      const completion = await getGroqClient().chat.completions.create({
        model: DEFAULT_GROQ_MODEL,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: `${systemPrompt}\n\n${JSON_PROMPT_RULES}` },
          { role: "user", content: userPrompt },
        ],
      });

      const content = completion.choices[0]?.message?.content?.trim();

      if (!content) {
        throw new Error("The model returned an empty response.");
      }

      return extractJson<T>(content);
    } catch (error) {
      lastError = error;

      if (!isRetryableGroqError(error) || attempt === GROQ_COMPLETION_MAX_ATTEMPTS - 1) {
        throw createUserFacingGroqError(error);
      }

      const retryAfterMs = getRetryAfterMs(error);
      const backoffMs = Math.min(12000, 1500 * 2 ** attempt);
      await wait(retryAfterMs ?? backoffMs);
    }
  }

  throw createUserFacingGroqError(lastError);
}

function toWorkspaceRole(role: WorkspaceRole) {
  return role === "student" ? AiWorkspaceRole.STUDENT : AiWorkspaceRole.TEACHER;
}

function toConversationKind(role: WorkspaceRole) {
  return role === "student"
    ? AiConversationKind.STUDY_SUPPORT
    : AiConversationKind.TEACHING_SUPPORT;
}

function buildConversationTitle(prompt: string, fallback: string) {
  const compact = normalizeWhitespace(prompt);
  if (!compact) return fallback;

  const title = compact.split(" ").slice(0, 8).join(" ");
  return title.length > 72 ? `${title.slice(0, 69)}...` : title;
}

function normalizeDifficulty(value?: string | null): QuizDifficulty {
  const normalized = String(value || "medium").trim().toLowerCase();

  if (normalized === "easy" || normalized === "medium" || normalized === "hard" || normalized === "mixed") {
    return normalized;
  }

  return "medium";
}

function buildQuestionId(prefix: string, index: number) {
  return `${prefix}-${index + 1}`;
}

const QUESTION_GENERATION_BATCH_SIZE = 10;

function buildQuestionBatches(total: number, batchSize = QUESTION_GENERATION_BATCH_SIZE) {
  const batches: Array<{ count: number; startIndex: number }> = [];

  for (let startIndex = 0; startIndex < total; startIndex += batchSize) {
    batches.push({
      count: Math.min(batchSize, total - startIndex),
      startIndex,
    });
  }

  return batches;
}

function sanitizeQuiz(raw: Partial<GeneratedQuiz>, topic: string, requestedCount: number): GeneratedQuiz {
  const difficulty = normalizeDifficulty(raw.difficulty);
  const rawQuestions = Array.isArray(raw.questions) ? raw.questions : [];
  const questions: QuizQuestion[] = rawQuestions
    .map((question, index) => {
      const options = Array.isArray(question.options)
        ? question.options
            .map((option) => normalizeModelText(option))
            .filter(Boolean)
        : [];
      const questionType =
        String(question.type || "").toUpperCase() === "TRUE_FALSE"
          ? "TRUE_FALSE"
          : "MULTIPLE_CHOICE";

      const fallbackOptions =
        questionType === "TRUE_FALSE" ? ["True", "False"] : options.slice(0, 4);
      const finalOptions = fallbackOptions.length >= 2 ? fallbackOptions : ["Option A", "Option B"];
      const correctOption = finalOptions.includes(String(question.correctOption))
        ? String(question.correctOption)
        : finalOptions[0];

      return {
        id: buildQuestionId("quiz", index),
        type: questionType,
        question: normalizeModelText(question.question || `Question ${index + 1}`),
        options: finalOptions,
        correctOption: normalizeModelText(correctOption) || finalOptions[0],
        explanation: normalizeModelText(
          question.explanation || "Review the topic and try to identify the key concept."
        ),
        skill: normalizeModelText(question.skill || "Topic understanding"),
      } satisfies QuizQuestion;
    })
    .filter((question) => question.question);

  const limitedQuestions = questions.slice(0, Math.max(1, requestedCount));

  return {
    title: normalizeModelText(raw.title || `${topic} Practice Quiz`),
    topic: normalizeModelText(raw.topic || topic),
    difficulty,
    estimatedMinutes:
      Number.isFinite(raw.estimatedMinutes) && Number(raw.estimatedMinutes) > 0
        ? Number(raw.estimatedMinutes)
        : Math.max(5, limitedQuestions.length * 2),
    instructions: normalizeModelText(raw.instructions || "Answer each question, then submit to see feedback."),
    questions: limitedQuestions,
  };
}

function sanitizeQuestionPack(
  raw: Partial<GeneratedQuestionPack>,
  topic: string,
  requestedCount: number
): GeneratedQuestionPack {
  const rawQuestions = Array.isArray(raw.questions) ? raw.questions : [];
  const questions: QuestionPackQuestion[] = rawQuestions
    .map((question, index) => {
      const type =
        String(question.type || "").toUpperCase() === "MULTIPLE_CHOICE"
          ? "MULTIPLE_CHOICE"
          : "THEORY";
      const options =
        type === "MULTIPLE_CHOICE" && Array.isArray(question.options)
          ? question.options
              .map((option, optionIndex) => ({
                text: normalizeModelText(option?.text || `Option ${optionIndex + 1}`),
                isCorrect: Boolean(option?.isCorrect),
              }))
              .filter((option) => option.text)
          : undefined;

      return {
        id: buildQuestionId("pack", index),
        type,
        questionText: normalizeModelText(question.questionText || `Question ${index + 1}`),
        points: Number.isFinite(question.points) && Number(question.points) > 0 ? Number(question.points) : 10,
        answerKey: normalizeModelText(question.answerKey || "Teacher answer key not provided."),
        rationale: normalizeModelText(question.rationale || "Covers the core idea of the topic."),
        options: options && options.length > 1 ? options.slice(0, 4) : undefined,
      } satisfies QuestionPackQuestion;
    })
    .filter((question) => question.questionText);

  return {
    title: normalizeModelText(raw.title || `${topic} Question Pack`),
    topic: normalizeModelText(raw.topic || topic),
    difficulty: normalizeModelText(raw.difficulty || "medium"),
    summary: normalizeModelText(
      raw.summary || "A balanced set of questions designed for revision and classroom assessment."
    ),
    sourceSummary: normalizeModelText(raw.sourceSummary || "Generated from the teacher prompt."),
    teachingNotes: Array.isArray(raw.teachingNotes)
      ? raw.teachingNotes.map((note) => normalizeModelText(note)).filter(Boolean).slice(0, 5)
      : [],
    questions: questions.slice(0, Math.max(1, requestedCount)),
  };
}

function sanitizeConceptSvg(svg: string) {
  const sanitized = sanitizeHtml(
    String(svg || "")
      .replace(/<\?xml[\s\S]*?\?>/gi, "")
      .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
      .trim(),
    {
      allowedTags: SVG_ALLOWED_TAGS,
      allowedAttributes: SVG_ALLOWED_ATTRIBUTES,
      allowProtocolRelative: false,
      disallowedTagsMode: "discard",
      parser: {
        lowerCaseTags: false,
        lowerCaseAttributeNames: false,
      },
    }
  ).trim();

  return sanitized.toLowerCase().startsWith("<svg") ? sanitized : "";
}

function mapConversationVisual(value: unknown): ConversationVisual | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const visual = value as Record<string, unknown>;
  const svgMarkup = sanitizeConceptSvg(typeof visual.svgMarkup === "string" ? visual.svgMarkup : "");

  if (visual.kind !== "svg" || !svgMarkup) {
    return null;
  }

  const title = normalizeWhitespace(String(visual.title || "Concept visual"));
  const alt = normalizeWhitespace(String(visual.alt || title || "Concept visual"));
  const caption =
    typeof visual.caption === "string" ? normalizeWhitespace(visual.caption) || null : null;

  return {
    kind: "svg",
    title: title || "Concept visual",
    alt: alt || title || "Concept visual",
    caption,
    svgMarkup,
  };
}

async function generateConceptVisual(params: {
  audience: string;
  request: string;
  explanation: string;
  contextLines: string[];
}) {
  const rawVisual = await runJsonPrompt<GeneratedConceptVisual>(
    [
      "You create one classroom-friendly SVG diagram to support an explanation.",
      "Generate a diagram only when a visual would materially help a learner understand a process, cycle, relationship, comparison, or system.",
      "If a visual is not helpful, return shouldGenerate as false.",
      "When generating a visual, keep it clean, labelled, and readable with short text and simple arrows or shapes.",
      "Do not use script, style, foreignObject, animation, external URLs, images, CSS classes, or embedded HTML.",
      "Return an SVG with a viewBox and a light educational look.",
    ].join(" "),
    [
      `Audience: ${params.audience}`,
      ...params.contextLines,
      `User request: ${params.request}`,
      `Explanation to support: ${normalizeAssistantText(params.explanation).slice(0, 3200)}`,
      "Return JSON with this shape:",
      JSON.stringify(
        {
          shouldGenerate: true,
          title: "Photosynthesis visual",
          alt: "A diagram showing sunlight, water, and carbon dioxide going into a leaf and oxygen and glucose coming out",
          caption: "Inputs enter the leaf, and photosynthesis produces food and oxygen.",
          svg: "<svg viewBox='0 0 900 560' xmlns='http://www.w3.org/2000/svg'>...</svg>",
        },
        null,
        2
      ),
    ].join("\n"),
    0.2,
    3200
  );

  if (!rawVisual.shouldGenerate) {
    return null;
  }

  const svgMarkup = sanitizeConceptSvg(rawVisual.svg || "");

  if (!svgMarkup) {
    return null;
  }

  const title = normalizeWhitespace(String(rawVisual.title || "Concept visual"));
  const alt = normalizeWhitespace(String(rawVisual.alt || title || "Concept visual"));
  const caption = normalizeWhitespace(String(rawVisual.caption || "")) || null;

  return {
    kind: "svg",
    title: title || "Concept visual",
    alt: alt || title || "Concept visual",
    caption,
    svgMarkup,
  } satisfies ConversationVisual;
}

function mapConversationMetadata(metadata: unknown): ConversationAttachment | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const typedMetadata = metadata as Record<string, unknown>;
  const type = typedMetadata.type;
  const visuals = Array.isArray(typedMetadata.visuals)
    ? typedMetadata.visuals
        .map((visual) => mapConversationVisual(visual))
        .filter((visual): visual is ConversationVisual => Boolean(visual))
    : [];

  if (type !== "quiz" && type !== "question-pack" && visuals.length === 0) {
    return null;
  }

  const attachment: ConversationAttachment = {};

  if (type === "quiz" || type === "question-pack") {
    attachment.type = type;
  }

  if (typeof typedMetadata.quizAttemptId === "string") {
    attachment.quizAttemptId = typedMetadata.quizAttemptId;
  }

  if (typeof typedMetadata.questionPackId === "string") {
    attachment.questionPackId = typedMetadata.questionPackId;
  }

  if (typedMetadata.quiz && typeof typedMetadata.quiz === "object") {
    attachment.quiz = typedMetadata.quiz as GeneratedQuiz;
  }

  if (typedMetadata.questionPack && typeof typedMetadata.questionPack === "object") {
    attachment.questionPack = typedMetadata.questionPack as GeneratedQuestionPack;
  }

  if (visuals.length > 0) {
    attachment.visuals = visuals;
  }

  return attachment;
}

function buildQuizFeedback(topic: string, breakdown: QuizQuestionResult[]) {
  const wrongAnswers = breakdown.filter((item) => !item.correct);
  const correctAnswers = breakdown.filter((item) => item.correct);
  const strongSkills = Array.from(new Set(correctAnswers.map((item) => item.skill))).slice(0, 3);
  const weakSkills = Array.from(new Set(wrongAnswers.map((item) => item.skill))).slice(0, 3);

  const lines = [
    `Acadeal AI review for ${topic}:`,
    `You answered ${correctAnswers.length} of ${breakdown.length} correctly.`,
  ];

  if (strongSkills.length > 0) {
    lines.push(`Strong areas: ${strongSkills.join(", ")}.`);
  }

  if (weakSkills.length > 0) {
    lines.push(`Focus next on: ${weakSkills.join(", ")}.`);
  }

  if (wrongAnswers.length > 0) {
    lines.push(`Revisit question themes: ${wrongAnswers.map((item) => item.question).slice(0, 2).join(" | ")}.`);
  }

  return lines.join("\n");
}

// ─── SCHOOL DATA CONTEXT FOR TEACHER AI ────────────────────────────────────
/**
 * Fetches a compact snapshot of all live school data so the teacher AI can
 * answer factual questions: student rosters, class lists, attendance, etc.
 * Capped to avoid token overflow (~200 students max in context).
 */
async function getSchoolDataContext() {
  const [students, classes, teacherList, recentAttendance, subjectAssignments] = await Promise.all([
    // All students with their class
    prisma.student.findMany({
      select: {
        id: true,
        name: true,
        surname: true,
        studentId: true,
        class: { select: { name: true } },
        grade: { select: { level: true } },
      },
      orderBy: [{ class: { name: "asc" } }, { surname: "asc" }, { name: "asc" }],
      take: 300,
    }),
    // All classes with supervisor
    prisma.class.findMany({
      select: {
        name: true,
        grade: { select: { level: true } },
        supervisor: { select: { name: true, surname: true } },
      },
      orderBy: { name: "asc" },
    }),
    // All teachers and their subjects
    prisma.teacher.findMany({
      select: {
        name: true,
        surname: true,
        subjects: { select: { name: true } },
        classes: { select: { name: true }, take: 3 }, // classes they supervise
      },
      orderBy: { surname: "asc" },
    }),
    // Attendance summary: recent 30 days per student (just counts)
    prisma.attendance.groupBy({
      by: ["studentId", "present"],
      _count: { _all: true },
      where: {
        date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
    // Subject teacher assignments (ClassSubjectTeacher)
    prisma.classSubjectTeacher.findMany({
      select: {
        class: { select: { name: true } },
        subject: { select: { name: true } },
        teacher: { select: { name: true, surname: true } },
      },
    }),
  ]);

  // Build attendance map: studentId → { present, absent }
  const attendanceMap = new Map<string, { present: number; absent: number }>();
  for (const row of recentAttendance) {
    if (!attendanceMap.has(row.studentId)) attendanceMap.set(row.studentId, { present: 0, absent: 0 });
    const entry = attendanceMap.get(row.studentId)!;
    if (row.present) entry.present += row._count._all;
    else entry.absent += row._count._all;
  }

  // Build compact student roster lines
  const studentLines = students.map(s => {
    const att = attendanceMap.get(s.id);
    const attNote = att ? ` (att: ${att.present}P/${att.absent}A last 30d)` : "";
    return `${s.name} ${s.surname} | ID:${s.studentId} | Class:${s.class.name} | Grade:${GRADE_NAMES[s.grade.level] ?? s.grade.level}${attNote}`;
  });

  const classLines = classes.map(c => {
    const sup = c.supervisor ? `${c.supervisor.name} ${c.supervisor.surname}` : "No supervisor";
    return `${c.name} (${GRADE_NAMES[c.grade.level] ?? c.grade.level}) — Supervisor: ${sup}`;
  });

  const teacherLines = teacherList.map(t => {
    const subjects = t.subjects.map((s: { name: string }) => s.name).join(", ") || "None";
    const supervisedClasses = t.classes.map((c: { name: string }) => c.name).join(", ");
    const cls = supervisedClasses ? ` | Supervises: ${supervisedClasses}` : "";
    return `${t.name} ${t.surname} | Subjects: ${subjects}${cls}`;
  });

  const assignmentLines = subjectAssignments.map(a => {
    return `${a.teacher.name} ${a.teacher.surname} teaches ${a.subject.name} in ${a.class.name}`;
  });

  return { studentLines, classLines, teacherLines, assignmentLines };
}

export async function getStudentSupportContext(userId: string): Promise<StudentWorkspaceData> {
  const student = await prisma.student.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      surname: true,
      classId: true,
      gradeId: true,
      class: { select: { name: true } },
      grade: { select: { level: true } },
    },
  });

  if (!student) {
    throw new Error("Student profile could not be found.");
  }

  const [lessons, syllabi] = await Promise.all([
    prisma.lesson.findMany({
      where: { classId: student.classId },
      select: {
        subject: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.courseSyllabus.findMany({
      where: { gradeId: student.gradeId },
      select: { topics: true },
    }),
  ]);

  const subjects = Array.from(new Set(lessons.map((lesson) => lesson.subject.name))).sort((left, right) =>
    left.localeCompare(right)
  );

  const syllabusTopics = Array.from(
    new Set(syllabi.flatMap((syllabus) => syllabus.topics || []).map((topic) => normalizeWhitespace(topic)))
  )
    .filter(Boolean)
    .slice(0, 24);

  return {
    id: student.id,
    name: `${student.name} ${student.surname}`.trim(),
    className: student.class.name,
    gradeLabel: GRADE_NAMES[student.grade.level] || `Grade ${student.grade.level}`,
    subjects,
    syllabusTopics,
  };
}

export async function getTeacherSupportContext(userId: string): Promise<TeacherWorkspaceData> {
  const [teacher, schoolData] = await Promise.all([
    prisma.teacher.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        surname: true,
        subjects: { select: { name: true }, orderBy: { name: "asc" } },
        lessons: {
          select: {
            id: true,
            name: true,
            class: { select: { name: true } },
            subject: { select: { name: true } },
          },
          orderBy: [{ class: { name: "asc" } }, { name: "asc" }],
        },
      },
    }),
    getSchoolDataContext(),
  ]);

  if (!teacher) {
    throw new Error("Teacher profile could not be found.");
  }

  return {
    id: teacher.id,
    name: `${teacher.name} ${teacher.surname}`.trim(),
    subjects: teacher.subjects.map((subject) => subject.name),
    lessons: teacher.lessons.map((lesson) => ({
      id: lesson.id,
      name: lesson.name,
      className: lesson.class.name,
      subjectName: lesson.subject.name,
    })),
    schoolData,
  };
}

export async function getAcadealPageData(
  role: WorkspaceRole,
  userId: string
): Promise<AcadealPageData> {
  const [studentContext, teacherContext, conversations, quizAttempts, questionPacks] = await Promise.all([
    role === "student" ? getStudentSupportContext(userId) : Promise.resolve(undefined),
    role === "teacher" ? getTeacherSupportContext(userId) : Promise.resolve(undefined),
    prisma.aiConversation.findMany({
      where: {
        userId,
        userRole: toWorkspaceRole(role),
      },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 60,
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 25,
    }),
    role === "student"
      ? prisma.aiQuizAttempt.findMany({
          where: { studentId: userId },
          orderBy: { createdAt: "desc" },
          take: 12,
        })
      : Promise.resolve([]),
    role === "teacher"
      ? prisma.aiQuestionPack.findMany({
          where: { teacherId: userId },
          orderBy: { createdAt: "desc" },
          take: 10,
        })
      : Promise.resolve([]),
  ]);

  return {
    role,
    studentContext,
    teacherContext,
    conversations: conversations.map(
      (conversation): WorkspaceConversation => ({
        id: conversation.id,
        title: conversation.title,
        kind: conversation.kind,
        updatedAt: conversation.updatedAt.toISOString(),
        messages: [...conversation.messages]
          .reverse()
          .map((message) => ({
            id: message.id,
            actor: message.actor,
            content: message.content,
            createdAt: message.createdAt.toISOString(),
            metadata: mapConversationMetadata(message.metadata),
          })),
      })
    ),
    quizAttempts: quizAttempts.map(
      (attempt): QuizAttemptView => ({
        id: attempt.id,
        topic: attempt.topic,
        difficulty: attempt.difficulty,
        status: attempt.status,
        totalQuestions: attempt.totalQuestions,
        correctAnswers: attempt.correctAnswers,
        scorePercent: attempt.scorePercent,
        feedbackText: attempt.feedbackText,
        createdAt: attempt.createdAt.toISOString(),
        completedAt: attempt.completedAt?.toISOString() || null,
        quizPayload: attempt.quizPayload as unknown as GeneratedQuiz,
        answerPayload: attempt.answerPayload as QuizAttemptPayload | null,
        processLog: attempt.processLog,
      })
    ),
    questionPacks: questionPacks.map(
      (pack): QuestionPackView => ({
        id: pack.id,
        title: pack.title,
        topic: pack.topic,
        difficulty: pack.difficulty,
        questionCount: pack.questionCount,
        sourceType: pack.sourceType,
        sourceName: pack.sourceName,
        createdAt: pack.createdAt.toISOString(),
        packPayload: pack.packPayload as unknown as GeneratedQuestionPack,
      })
    ),
  };
}

export async function deleteAcadealConversation(params: {
  conversationId: string;
  role: WorkspaceRole;
  userId: string;
}) {
  const conversationId = params.conversationId.trim();

  if (!conversationId) {
    throw Object.assign(new Error("Conversation ID is required."), { status: 400 });
  }

  const conversation = await prisma.aiConversation.findFirst({
    where: {
      id: conversationId,
      userId: params.userId,
      userRole: toWorkspaceRole(params.role),
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (!conversation) {
    throw Object.assign(new Error("Conversation not found."), { status: 404 });
  }

  await prisma.aiConversation.delete({
    where: { id: conversation.id },
  });

  return conversation;
}

async function ensureConversation(params: {
  conversationId?: string | null;
  role: WorkspaceRole;
  userId: string;
  titleSeed: string;
  lessonId?: number | null;
  subjectId?: number | null;
}) {
  const existingConversationId = params.conversationId?.trim();

  if (existingConversationId) {
    const existingConversation = await prisma.aiConversation.findFirst({
      where: {
        id: existingConversationId,
        userId: params.userId,
        userRole: toWorkspaceRole(params.role),
      },
    });

    if (existingConversation) {
      return existingConversation;
    }
  }

  return prisma.aiConversation.create({
    data: {
      userId: params.userId,
      userRole: toWorkspaceRole(params.role),
      kind: toConversationKind(params.role),
      title: buildConversationTitle(params.titleSeed, params.role === "student" ? "Study support" : "Teaching support"),
      lessonId: params.lessonId ?? null,
      subjectId: params.subjectId ?? null,
    },
  });
}

async function addConversationMessage(params: {
  conversationId: string;
  actor: AiMessageActor;
  content: string;
  metadata?: ConversationAttachment | null;
}) {
  return prisma.$transaction(async (tx) => {
    const message = await tx.aiConversationMessage.create({
      data: {
        conversationId: params.conversationId,
        actor: params.actor,
        content: params.content,
        metadata: params.metadata || undefined,
      },
    });

    await tx.aiConversation.update({
      where: { id: params.conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  });
}

export async function replyToStudentExplanation(params: {
  userId: string;
  message: string;
  conversationId?: string | null;
  lessonId?: number | null;
  subjectId?: number | null;
}) {
  const [settings, context] = await Promise.all([
    getSystemSettings(),
    getStudentSupportContext(params.userId),
  ]);

  const conversation = await ensureConversation({
    conversationId: params.conversationId,
    role: "student",
    userId: params.userId,
    titleSeed: params.message,
    lessonId: params.lessonId,
    subjectId: params.subjectId,
  });

  await addConversationMessage({
    conversationId: conversation.id,
    actor: AiMessageActor.USER,
    content: params.message,
  });

  const systemPrompt = [
    "You are Acadeal AI, the student learning coach for ECKINTOSH Student Management System.",
    "Your job is to explain topics clearly for the student's level, using step-by-step reasoning, short examples, and a helpful study plan.",
    "Prefer direct teaching language over abstract theory.",
    "Keep explanations age-appropriate and tied to the student's current grade and subjects.",
    "Format answers with GitHub-flavored Markdown: use headings, lists, and tables where useful. Write mathematical notation with $...$ or $$...$$, never as plain-text fractions. Do not use HTML or SVG in the response; a learning visual is generated separately when useful.",
  ].join(" ");

  const userPrompt = [
    `School: ${settings.schoolName}`,
    `Academic year: ${settings.academicYear}`,
    `Current term: ${settings.currentTerm}`,
    `Student: ${context.name}`,
    `Class: ${context.className}`,
    `Grade: ${context.gradeLabel}`,
    `Subjects: ${context.subjects.join(", ") || "Not available"}`,
    `Syllabus topics in scope: ${context.syllabusTopics.join(", ") || "Not available"}`,
    `Student request: ${params.message}`,
    "Give a clean explanation, a short worked example where relevant, and three revision prompts at the end.",
  ].join("\n");

  const reply = normalizeAssistantText(await runTextPrompt(systemPrompt, userPrompt, 0.45));
  let metadata: ConversationAttachment | null = null;

  try {
    const visual = await generateConceptVisual({
      audience: `${context.gradeLabel} student`,
      request: params.message,
      explanation: reply,
      contextLines: [
        `Student: ${context.name}`,
        `Class: ${context.className}`,
        `Subjects: ${context.subjects.join(", ") || "Not available"}`,
      ],
    });

    if (visual) {
      metadata = { visuals: [visual] };
    }
  } catch (error) {
    console.error("Acadeal visual generation failed:", error);
  }

  await addConversationMessage({
    conversationId: conversation.id,
    actor: AiMessageActor.ASSISTANT,
    content: reply,
    metadata,
  });

  return {
    conversationId: conversation.id,
    reply,
    metadata,
  };
}

export async function createStudentQuiz(params: {
  userId: string;
  topic: string;
  promptMessage?: string;
  difficulty?: string;
  questionCount?: number;
  conversationId?: string | null;
  lessonId?: number | null;
  subjectId?: number | null;
}) {
  const [settings, context] = await Promise.all([
    getSystemSettings(),
    getStudentSupportContext(params.userId),
  ]);
  const difficulty = normalizeDifficulty(params.difficulty);
  const questionCount = normalizeAcadealQuestionCount(
    params.questionCount,
    ACADEAL_DEFAULT_STUDENT_QUIZ_COUNT
  );
  const questionBatches = buildQuestionBatches(questionCount);
  const titleSeed = params.promptMessage || `Quiz on ${params.topic}`;

  const conversation = await ensureConversation({
    conversationId: params.conversationId,
    role: "student",
    userId: params.userId,
    titleSeed,
    lessonId: params.lessonId,
    subjectId: params.subjectId,
  });

  await addConversationMessage({
    conversationId: conversation.id,
    actor: AiMessageActor.USER,
    content:
      params.promptMessage ||
      `Generate a ${difficulty} quiz with ${questionCount} questions on ${params.topic}.`,
  });

  const systemPrompt = [
    "You are Acadeal AI, generating reliable practice quizzes for a student.",
    "Create objective questions only.",
    "Use ONLY MULTIPLE_CHOICE or TRUE_FALSE question types.",
    "Keep the language suited to the student's current level and school context.",
    "Return exactly the requested number of questions in the questions array for each batch. Do not return fewer or more.",
  ].join(" ");
  let quizSeed: GeneratedQuiz | null = null;
  const collectedQuestions: QuizQuestion[] = [];

  for (let batchIndex = 0; batchIndex < questionBatches.length; batchIndex += 1) {
    const batch = questionBatches[batchIndex];
    const batchUserPrompt = [
      `School: ${settings.schoolName}`,
      `Academic year: ${settings.academicYear}`,
      `Current term: ${settings.currentTerm}`,
      `Student name: ${context.name}`,
      `Class: ${context.className}`,
      `Grade: ${context.gradeLabel}`,
      `Subjects: ${context.subjects.join(", ") || "Not available"}`,
      `Topic requested: ${params.topic}`,
      `Difficulty: ${difficulty}`,
      `Total question count requested: ${questionCount}`,
      `Batch ${batchIndex + 1} of ${questionBatches.length}`,
      `This batch must contain exactly ${batch.count} questions.`,
      `This batch covers question numbers ${batch.startIndex + 1} to ${batch.startIndex + batch.count}.`,
      collectedQuestions.length > 0
        ? `Avoid repeating these earlier questions: ${collectedQuestions
            .map((question) => question.question)
            .slice(-10)
            .join(" | ")}`
        : "This is the first batch.",
      "Return JSON with this shape:",
      JSON.stringify(
        {
          title: "Topic Practice Quiz",
          topic: params.topic,
          difficulty,
          estimatedMinutes: 12,
          instructions: "Read and answer every question.",
          questions: [
            {
              id: "quiz-1",
              type: "MULTIPLE_CHOICE",
              question: "Question text",
              options: ["Option A", "Option B", "Option C", "Option D"],
              correctOption: "Option B",
              explanation: "Why this answer is correct",
              skill: "Core concept",
            },
          ],
        },
        null,
        2
      ),
    ].join("\n");

    const batchMaxTokens = 4200;
    const rawQuiz = await runJsonPrompt<GeneratedQuiz>(systemPrompt, batchUserPrompt, 0.25, batchMaxTokens);
    let batchQuiz = sanitizeQuiz(rawQuiz, params.topic, batch.count);

    if (batchQuiz.questions.length !== batch.count) {
      const retriedRawQuiz = await runJsonPrompt<GeneratedQuiz>(
        systemPrompt,
        `${batchUserPrompt}\nImportant: your previous answer returned ${batchQuiz.questions.length} questions. Regenerate and return exactly ${batch.count} questions for this batch.`,
        0.2,
        batchMaxTokens
      );
      const retriedQuiz = sanitizeQuiz(retriedRawQuiz, params.topic, batch.count);

      if (
        Math.abs(batch.count - retriedQuiz.questions.length) <
        Math.abs(batch.count - batchQuiz.questions.length)
      ) {
        batchQuiz = retriedQuiz;
      }
    }

    if (!quizSeed) {
      quizSeed = batchQuiz;
    }

    collectedQuestions.push(...batchQuiz.questions);
  }

  const quiz = sanitizeQuiz(
    {
      title: quizSeed?.title || `${params.topic} Practice Quiz`,
      topic: quizSeed?.topic || params.topic,
      difficulty: quizSeed?.difficulty || difficulty,
      estimatedMinutes: Math.max(5, collectedQuestions.length * 2),
      instructions: quizSeed?.instructions || "Read and answer every question.",
      questions: collectedQuestions,
    },
    params.topic,
    questionCount
  );

  const attempt = await prisma.aiQuizAttempt.create({
    data: {
      conversationId: conversation.id,
      studentId: params.userId,
      lessonId: params.lessonId ?? null,
      subjectId: params.subjectId ?? null,
      topic: quiz.topic,
      difficulty: quiz.difficulty,
      totalQuestions: quiz.questions.length,
      quizPayload: quiz,
    },
  });

  const reply = `I created a ${quiz.difficulty} ${quiz.questions.length}-question quiz on ${quiz.topic}. Open the quiz card below and submit when you're ready.`;

  await addConversationMessage({
    conversationId: conversation.id,
    actor: AiMessageActor.ASSISTANT,
    content: reply,
    metadata: {
      type: "quiz",
      quizAttemptId: attempt.id,
      quiz,
    },
  });

  return {
    conversationId: conversation.id,
    reply,
    attemptId: attempt.id,
    quiz,
  };
}

export async function submitStudentQuizAttempt(params: {
  attemptId: string;
  studentId: string;
  answers: Record<string, QuizAnswerInput>;
  processLog?: unknown;
}) {
  const attempt = await prisma.aiQuizAttempt.findFirst({
    where: {
      id: params.attemptId,
      studentId: params.studentId,
    },
  });

  if (!attempt) {
    throw new Error("Quiz attempt not found.");
  }

  const quiz = attempt.quizPayload as unknown as GeneratedQuiz;
  const breakdown: QuizQuestionResult[] = quiz.questions.map((question) => {
    const submitted = params.answers[question.id];
    const selectedOption = submitted?.selectedOption || null;
    const correct =
      normalizeWhitespace(selectedOption || "").toLowerCase() ===
      normalizeWhitespace(question.correctOption).toLowerCase();

    return {
      questionId: question.id,
      question: question.question,
      selectedOption,
      correctOption: question.correctOption,
      correct,
      skill: question.skill,
      explanation: question.explanation,
    };
  });

  const correctAnswers = breakdown.filter((item) => item.correct).length;
  const scorePercent = breakdown.length > 0 ? Number(((correctAnswers / breakdown.length) * 100).toFixed(1)) : 0;
  const feedbackText = buildQuizFeedback(attempt.topic, breakdown);
  const answerPayload: QuizAttemptPayload = {
    submittedAt: new Date().toISOString(),
    answers: params.answers,
    breakdown,
  };

  await prisma.aiQuizAttempt.update({
    where: { id: attempt.id },
    data: {
      status: AiQuizStatus.COMPLETED,
      correctAnswers,
      scorePercent,
      answerPayload,
      processLog: params.processLog ?? undefined,
      feedbackText,
      completedAt: new Date(),
    },
  });

  if (attempt.conversationId) {
    await addConversationMessage({
      conversationId: attempt.conversationId,
      actor: AiMessageActor.ASSISTANT,
      content: `${feedbackText}\nScore: ${correctAnswers}/${quiz.questions.length} (${scorePercent}%).`,
      metadata: {
        type: "quiz",
        quizAttemptId: attempt.id,
      },
    });
  }

  return {
    id: attempt.id,
    topic: attempt.topic,
    difficulty: attempt.difficulty,
    status: "COMPLETED" as const,
    totalQuestions: quiz.questions.length,
    correctAnswers,
    scorePercent,
    feedbackText,
    createdAt: attempt.createdAt.toISOString(),
    completedAt: new Date().toISOString(),
    quizPayload: quiz,
    answerPayload,
    processLog: params.processLog ?? null,
  } satisfies QuizAttemptView;
}

export async function replyToTeacherSupport(params: {
  userId: string;
  message: string;
  conversationId?: string | null;
  lessonId?: number | null;
  subjectId?: number | null;
}) {
  const [settings, context] = await Promise.all([
    getSystemSettings(),
    getTeacherSupportContext(params.userId),
  ]);

  const conversation = await ensureConversation({
    conversationId: params.conversationId,
    role: "teacher",
    userId: params.userId,
    titleSeed: params.message,
    lessonId: params.lessonId,
    subjectId: params.subjectId,
  });

  await addConversationMessage({
    conversationId: conversation.id,
    actor: AiMessageActor.USER,
    content: params.message,
  });

  const systemPrompt = [
    "You are Acadeal AI, a teacher support assistant embedded in the school management system.",
    "You have access to live school data: full student rosters (name, class, grade, attendance), all class lists, teacher profiles, and subject-to-teacher assignments.",
    "CRITICAL RULES FOR FACTUAL LOOKUPS:",
    "- You must strictly use ONLY the provided school data lists to answer questions about student classes, teacher assignments, and attendance.",
    "- If the exact answer is not found in the school data, or if the teacher/student/class/assignment does not exist in the lists, you MUST say 'This information is not found in the system.'",
    "- NEVER, under any circumstances, make up, guess, or hallucinate names of students, teachers, classes, or assignments that are not explicitly listed in the school data. Doing so is extremely harmful.",
    "- Be extremely literal with names: do not assume or invent names like 'Ama Owusu' or 'Adjei' if they are not in the 'All Teachers' or 'Subject Teacher Assignments' lists.",
    "Also give classroom-ready help: lesson explanations, misconceptions, teaching steps, and assessment ideas when asked pedagogical questions.",
    "Respond like a practical instructional coach who also happens to know every student in the school.",
    "Format pedagogical answers with GitHub-flavored Markdown. Use tables for comparisons or plans, and $...$ or $$...$$ for mathematical notation. Do not use HTML or SVG in the response; a classroom visual is generated separately when useful.",
  ].join(" ");

  const schoolContext = context.schoolData ?? { studentLines: [], classLines: [], teacherLines: [], assignmentLines: [] };

  // ── Direct student name lookup ──────────────────────────────────────────────
  // Extract candidate names from the teacher's message (capitalised words, 2–4
  // tokens) and resolve them against the DB so the answer is pinpointed at the
  // very top of the prompt rather than buried in hundreds of roster lines.
  const nameTokens = params.message
    .replace(/[^a-zA-Z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && w[0] === w[0].toUpperCase() && w[0] !== w[0].toLowerCase());

  let directStudentMatches: string[] = [];
  if (nameTokens.length >= 1 && nameTokens.length <= 6) {
    try {
      const matchedStudents = await prisma.student.findMany({
        where: {
          OR: nameTokens.flatMap((token) => [
            { name: { contains: token, mode: "insensitive" } },
            { surname: { contains: token, mode: "insensitive" } },
          ]),
        },
        select: {
          name: true,
          surname: true,
          studentId: true,
          class: { select: { name: true } },
          grade: { select: { level: true } },
        },
        take: 10,
      });

      directStudentMatches = matchedStudents.map(
        (s) =>
          `${s.name} ${s.surname} | ID:${s.studentId} | Class:${s.class.name} | Grade:${GRADE_NAMES[s.grade.level] ?? s.grade.level}`
      );
    } catch {
      // Non-critical — fall back to full roster below
    }
  }
  // ─────────────────────────────────────────────────────────────────────────────

  // ── Build a bounded prompt so requests stay economical and responsive ────────
  // The full student roster can be 300+ lines (~6 000+ tokens). Sending it
  // alongside everything else overflows the context and the model never sees the
  // answer. Strategy:
  //   • When we have direct DB matches (name lookup): omit the full roster
  //     entirely — the pinpointed rows at the top are all the model needs.
  //   • When there are no direct matches (pedagogical / non-name question):
  //     cap the roster at 80 lines so the total prompt stays well under 8K.
  const ROSTER_CAP_NO_MATCH = 80;
  const studentRosterSection =
    directStudentMatches.length > 0
      ? "--- All Students --- (roster omitted; see DIRECT STUDENT MATCHES above)"
      : `--- All Students (showing ${Math.min(schoolContext.studentLines.length, ROSTER_CAP_NO_MATCH)} of ${schoolContext.studentLines.length}) --- Format: Name | StudentID | Class | Grade | Attendance last 30 days\n${schoolContext.studentLines.slice(0, ROSTER_CAP_NO_MATCH).join("\n") || "No student data"}`;

  const userPrompt = [
    `School: ${settings.schoolName}`,
    `Academic year: ${settings.academicYear}`,
    `Current term: ${settings.currentTerm}`,
    `Teacher: ${context.name}`,
    `Subjects taught: ${context.subjects.join(", ") || "Not available"}`,
    `Active lessons: ${context.lessons
      .map((lesson) => `${lesson.subjectName} / ${lesson.className} / ${lesson.name}`)
      .join("; ") || "Not available"}`,
    directStudentMatches.length > 0
      ? `\n=== DIRECT STUDENT MATCHES FOR THIS QUERY (${directStudentMatches.length} found) ===\n${directStudentMatches.join("\n")}\n=== END DIRECT MATCHES ===`
      : "",
    `\n=== LIVE SCHOOL DATA ===`,
    `--- All Classes (${schoolContext.classLines.length}) ---`,
    schoolContext.classLines.join("\n") || "No class data",
    `--- All Teachers (${schoolContext.teacherLines.length}) ---`,
    schoolContext.teacherLines.join("\n") || "No teacher data",
    `--- Subject Teacher Assignments (${schoolContext.assignmentLines.length}) ---`,
    schoolContext.assignmentLines.join("\n") || "No assignments",
    studentRosterSection,
    `=== END SCHOOL DATA ===`,
    `\nTeacher request: ${params.message}`,
    "If the request is a factual lookup (e.g. which class is a student in, who teaches them, attendance), answer directly from the DIRECT STUDENT MATCHES or school data above.",
    "If the exact answer is not in the provided data, reply 'This information is not found in the system.' Do not guess or invent any names.",
    "If the request is a teaching/learning question, give structured help: understanding the topic, how to teach it, common mistakes, and quick assessment ideas.",
  ]
    .filter((line) => line !== "")
    .join("\n");

  // 2 400 output tokens is enough for any factual answer or teaching explanation
  const reply = normalizeAssistantText(await runTextPrompt(systemPrompt, userPrompt, 0.1, 2400));
  let metadata: ConversationAttachment | null = null;

  try {
    const visual = await generateConceptVisual({
      audience: "teacher",
      request: params.message,
      explanation: reply,
      contextLines: [
        `Teacher: ${context.name}`,
        `Subjects taught: ${context.subjects.join(", ") || "Not available"}`,
      ],
    });

    if (visual) {
      metadata = { visuals: [visual] };
    }
  } catch (error) {
    console.error("Acadeal visual generation failed:", error);
  }

  await addConversationMessage({
    conversationId: conversation.id,
    actor: AiMessageActor.ASSISTANT,
    content: reply,
    metadata,
  });

  return {
    conversationId: conversation.id,
    reply,
    metadata,
  };
}

export async function extractTextFromPdfBuffer(buffer: Buffer) {
  const pdfParsePath = path.join(
    process.cwd(),
    "node_modules",
    "pdf-parse",
    "dist",
    "pdf-parse",
    "cjs",
    "index.cjs"
  );
  const { PDFParse } = (await import(
    /* webpackIgnore: true */ pathToFileURL(pdfParsePath).href
  )) as PdfParseModule;
  const parser = new PDFParse({ data: buffer });

  try {
    const extracted = await parser.getText();
    return normalizeWhitespace(extracted.text || "");
  } finally {
    await parser.destroy();
  }
}

export async function createTeacherQuestionPack(params: {
  userId: string;
  topic?: string;
  promptMessage?: string;
  lessonId?: number | null;
  subjectId?: number | null;
  difficulty?: string;
  questionCount?: number;
  conversationId?: string | null;
  sourceType?: "TOPIC" | "PDF";
  sourceName?: string | null;
  sourceMaterialText?: string | null;
}) {
  const [settings, context] = await Promise.all([
    getSystemSettings(),
    getTeacherSupportContext(params.userId),
  ]);
  const questionCount = normalizeAcadealQuestionCount(
    params.questionCount,
    ACADEAL_DEFAULT_TEACHER_PACK_COUNT
  );
  const questionBatches = buildQuestionBatches(questionCount);
  const difficulty = normalizeWhitespace(params.difficulty || "medium").toLowerCase();
  const topic = normalizeWhitespace(params.topic || "Classroom revision");
  const sourceType = params.sourceType === "PDF" ? AiQuestionPackSource.PDF : AiQuestionPackSource.TOPIC;

  const conversation = await ensureConversation({
    conversationId: params.conversationId,
    role: "teacher",
    userId: params.userId,
    titleSeed: params.promptMessage || `Question pack for ${topic}`,
    lessonId: params.lessonId,
    subjectId: params.subjectId,
  });

  await addConversationMessage({
    conversationId: conversation.id,
    actor: AiMessageActor.USER,
    content:
      params.promptMessage ||
      `Generate a ${difficulty} question pack with ${questionCount} questions on ${topic}.`,
  });

  const sourceExcerpt = normalizeWhitespace(String(params.sourceMaterialText || "")).slice(0, 12000);

  const systemPrompt = [
    "You are Acadeal AI, generating teacher-ready question packs.",
    "Produce a balanced pack of theory and multiple-choice questions unless the source content strongly suggests otherwise.",
    "Every question must be answerable from the topic or source material provided.",
    "Include answer keys and brief rationales.",
    "Return exactly the requested number of questions in the questions array for each batch. Do not return fewer or more.",
  ].join(" ");
  let packSeed: GeneratedQuestionPack | null = null;
  const collectedQuestions: QuestionPackQuestion[] = [];

  for (let batchIndex = 0; batchIndex < questionBatches.length; batchIndex += 1) {
    const batch = questionBatches[batchIndex];
    const batchUserPrompt = [
      `School: ${settings.schoolName}`,
      `Academic year: ${settings.academicYear}`,
      `Current term: ${settings.currentTerm}`,
      `Teacher: ${context.name}`,
      `Subjects taught: ${context.subjects.join(", ") || "Not available"}`,
      `Lessons in scope: ${context.lessons
        .map((lesson) => `${lesson.subjectName} / ${lesson.className} / ${lesson.name}`)
        .join("; ") || "Not available"}`,
      `Topic: ${topic}`,
      `Difficulty: ${difficulty}`,
      `Total question count requested: ${questionCount}`,
      `Batch ${batchIndex + 1} of ${questionBatches.length}`,
      `This batch must contain exactly ${batch.count} questions.`,
      `This batch covers question numbers ${batch.startIndex + 1} to ${batch.startIndex + batch.count}.`,
      `Source type: ${sourceType}`,
      `Source name: ${params.sourceName || "Teacher prompt"}`,
      sourceExcerpt ? `Source material excerpt: ${sourceExcerpt}` : "No source material excerpt provided.",
      collectedQuestions.length > 0
        ? `Avoid repeating these earlier questions: ${collectedQuestions
            .map((question) => question.questionText)
            .slice(-10)
            .join(" | ")}`
        : "This is the first batch.",
      "Return JSON with this shape:",
      JSON.stringify(
        {
          title: `${topic} Question Pack`,
          topic,
          difficulty,
          summary: "Brief pack overview",
          sourceSummary: "What source this came from",
          teachingNotes: ["Point 1", "Point 2"],
          questions: [
            {
              id: "pack-1",
              type: "MULTIPLE_CHOICE",
              questionText: "Question text",
              points: 10,
              answerKey: "Correct answer and marking note",
              rationale: "Why this question matters",
              options: [
                { text: "Option A", isCorrect: false },
                { text: "Option B", isCorrect: true },
                { text: "Option C", isCorrect: false },
                { text: "Option D", isCorrect: false },
              ],
            },
          ],
        },
        null,
        2
      ),
    ].join("\n");

    const batchMaxTokens = 5200;
    const rawPack = await runJsonPrompt<GeneratedQuestionPack>(systemPrompt, batchUserPrompt, 0.2, batchMaxTokens);
    let batchPack = sanitizeQuestionPack(rawPack, topic, batch.count);

    if (batchPack.questions.length !== batch.count) {
      const retriedRawPack = await runJsonPrompt<GeneratedQuestionPack>(
        systemPrompt,
        `${batchUserPrompt}\nImportant: your previous answer returned ${batchPack.questions.length} questions. Regenerate and return exactly ${batch.count} questions for this batch.`,
        0.15,
        batchMaxTokens
      );
      const retriedPack = sanitizeQuestionPack(retriedRawPack, topic, batch.count);

      if (
        Math.abs(batch.count - retriedPack.questions.length) <
        Math.abs(batch.count - batchPack.questions.length)
      ) {
        batchPack = retriedPack;
      }
    }

    if (!packSeed) {
      packSeed = batchPack;
    }

    collectedQuestions.push(...batchPack.questions);
  }

  const pack = sanitizeQuestionPack(
    {
      title: packSeed?.title || `${topic} Question Pack`,
      topic: packSeed?.topic || topic,
      difficulty: packSeed?.difficulty || difficulty,
      summary: packSeed?.summary || "A balanced set of questions designed for revision and classroom assessment.",
      sourceSummary: packSeed?.sourceSummary || "Generated from the teacher prompt.",
      teachingNotes: packSeed?.teachingNotes || [],
      questions: collectedQuestions,
    },
    topic,
    questionCount
  );

  const storedPack = await prisma.aiQuestionPack.create({
    data: {
      conversationId: conversation.id,
      teacherId: params.userId,
      lessonId: params.lessonId ?? null,
      subjectId: params.subjectId ?? null,
      title: pack.title,
      topic: pack.topic,
      difficulty: pack.difficulty,
      questionCount: pack.questions.length,
      sourceType,
      sourceName: params.sourceName ?? null,
      sourceMaterialText: sourceExcerpt || null,
      packPayload: pack,
      notes: pack.teachingNotes.join("\n"),
    },
  });

  const reply = `I generated a ${pack.questions.length}-question pack for ${pack.topic}. Review the pack below, then publish it straight into Assignments if you want.`;

  await addConversationMessage({
    conversationId: conversation.id,
    actor: AiMessageActor.ASSISTANT,
    content: reply,
    metadata: {
      type: "question-pack",
      questionPackId: storedPack.id,
      questionPack: pack,
    },
  });

  return {
    conversationId: conversation.id,
    reply,
    questionPackId: storedPack.id,
    questionPack: pack,
  };
}

export async function publishQuestionPackAsAssignment(params: {
  questionPackId: string;
  userId: string;
  userRole: WorkspaceRole | "admin";
  lessonId: number;
  title: string;
  startDate: Date;
  dueDate: Date;
}) {
  const pack = await prisma.aiQuestionPack.findFirst({
    where: {
      id: params.questionPackId,
      ...(params.userRole === "teacher" ? { teacherId: params.userId } : {}),
    },
  });

  if (!pack) {
    throw new Error("Question pack not found.");
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: params.lessonId },
    select: {
      id: true,
      teacherId: true,
    },
  });

  if (!lesson) {
    throw new Error("Lesson not found.");
  }

  if (params.userRole === "teacher" && lesson.teacherId !== params.userId) {
    throw new Error("You can only publish question packs to your own lessons.");
  }

  const payload = pack.packPayload as unknown as GeneratedQuestionPack;

  const createdAssignment = await prisma.$transaction(async (tx) => {
    const assignment = await tx.assignment.create({
      data: {
        title: normalizeWhitespace(params.title || pack.title),
        lessonId: params.lessonId,
        startDate: params.startDate,
        dueDate: params.dueDate,
      },
    });

    for (const question of payload.questions) {
      const createdQuestion = await tx.assignmentQuestion.create({
        data: {
          assignmentId: assignment.id,
          questionType: question.type,
          questionText: question.questionText,
          points: question.points,
        },
      });

      if (question.type === "MULTIPLE_CHOICE" && question.options && question.options.length > 1) {
        await tx.questionOption.createMany({
          data: question.options.map((option) => ({
            questionId: createdQuestion.id,
            optionText: option.text,
            isCorrect: option.isCorrect,
          })),
        });
      }
    }

    return assignment;
  });

  if (pack.conversationId) {
    await addConversationMessage({
      conversationId: pack.conversationId,
      actor: AiMessageActor.SYSTEM,
      content: `Published question pack "${pack.title}" as assignment "${createdAssignment.title}".`,
      metadata: {
        type: "question-pack",
        questionPackId: pack.id,
      },
    });
  }

  return createdAssignment;
}
