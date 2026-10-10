"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Brain,
  CheckCircle2,
  FileQuestion,
  GraduationCap,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Target,
  Trash2,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { normalizeAssistantText } from "@/lib/assistant-text";
import {
  normalizeAcadealQuestionCount,
  ACADEAL_DEFAULT_STUDENT_QUIZ_COUNT,
  ACADEAL_DEFAULT_TEACHER_PACK_COUNT,
  ACADEAL_MIN_QUESTION_COUNT,
} from "@/lib/acadeal-limits";
import { cn } from "@/lib/utils";
import type {
  ConversationAttachment,
  ConversationVisual,
  GeneratedQuestionPack,
  GeneratedQuiz,
  QuestionPackView,
  QuizAnswerInput,
  QuizAttemptView,
  AcadealPageData,
  WorkspaceConversation,
} from "@/types/acadeal";

type Props = {
  initialData: AcadealPageData;
};

type StudentMode = "explain" | "quiz";

type QuizDraftMap = Record<string, Record<string, QuizAnswerInput>>;
type QuizProcessMap = Record<string, Array<{ questionId: string; selectedOption: string; changedAt: string }>>;

function formatShortDate(value: string | null) {
  if (!value) return "In progress";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function createMessage(
  actor: "USER" | "ASSISTANT" | "SYSTEM",
  content: string,
  metadata?: ConversationAttachment | null
) {
  return {
    id: `${actor.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    actor,
    content,
    createdAt: new Date().toISOString(),
    metadata: metadata ?? null,
  };
}

function prepareMessageMarkdown(content: string) {
  return normalizeAssistantText(content)
    .replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, (_match, equation: string) => {
      return `\n\n$$\n${equation.trim()}\n$$\n\n`;
    })
    .replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, (_match, equation: string) => {
      return `$${equation.trim()}$`;
    });
}

function MessageContent({ content }: { content: string }) {
  return (
    <div className="acadeal-markdown min-w-0 break-words text-sm leading-7">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => <h1 className="mb-3 text-xl font-semibold leading-8">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-3 text-lg font-semibold leading-7">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-2 text-base font-semibold leading-7">{children}</h3>,
          h4: ({ children }) => <h4 className="mb-2 font-semibold">{children}</h4>,
          h5: ({ children }) => <h5 className="mb-2 font-semibold">{children}</h5>,
          h6: ({ children }) => <h6 className="mb-2 font-semibold">{children}</h6>,
          p: ({ children }) => <p className="my-2">{children}</p>,
          ul: ({ children }) => <ul className="my-2 ml-5 list-disc space-y-1.5">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 ml-5 list-decimal space-y-1.5">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-4 border-primary/40 pl-4 text-muted-foreground">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-border/70" />,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline underline-offset-2"
            >
              {children}
            </a>
          ),
          pre: ({ children }) => (
            <pre className="my-3 overflow-x-auto rounded-xl bg-muted px-4 py-3 text-xs leading-6">
              {children}
            </pre>
          ),
          code: ({ children, className }) => (
            <code className={cn("rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]", className)}>
              {children}
            </code>
          ),
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-max border-collapse text-left text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted/70">{children}</thead>,
          th: ({ children }) => <th className="border-b border-border px-3 py-2 font-semibold">{children}</th>,
          td: ({ children }) => <td className="border-b border-border/70 px-3 py-2 align-top">{children}</td>,
          tr: ({ children }) => <tr className="last:[&>td]:border-b-0">{children}</tr>,
        }}
      >
        {prepareMessageMarkdown(content)}
      </ReactMarkdown>
    </div>
  );
}

function MessageVisuals({ visuals }: { visuals: ConversationVisual[] }) {
  return (
    <div className="mt-4 space-y-4">
      {visuals.map((visual, index) => (
        <figure
          key={`${visual.title}-${index}`}
          className="overflow-hidden rounded-2xl border border-primary/15 bg-background shadow-sm"
        >
          <div
            role="img"
            aria-label={visual.alt}
            className="bg-white [&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
            dangerouslySetInnerHTML={{ __html: visual.svgMarkup }}
          />
          <figcaption className="space-y-1 border-t border-primary/10 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">{visual.title}</p>
            {visual.caption && <p className="text-sm text-muted-foreground">{visual.caption}</p>}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

function sanitizeQuestionCountInput(value: string) {
  if (!value) {
    return "";
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? String(parsed) : "";
}

function normalizeQuestionCountField(value: string, fallback: number) {
  return String(normalizeAcadealQuestionCount(value, fallback));
}

function mergeConversationState(
  conversations: WorkspaceConversation[],
  conversationId: string,
  kind: "STUDY_SUPPORT" | "TEACHING_SUPPORT",
  title: string,
  messagesToAppend: Array<ReturnType<typeof createMessage>>
) {
  const nextConversations = [...conversations];
  const existingIndex = nextConversations.findIndex((conversation) => conversation.id === conversationId);

  if (existingIndex === -1) {
    nextConversations.unshift({
      id: conversationId,
      title,
      kind,
      updatedAt: new Date().toISOString(),
      messages: messagesToAppend,
    });

    return nextConversations;
  }

  const existing = nextConversations[existingIndex];
  const updatedConversation = {
    ...existing,
    updatedAt: new Date().toISOString(),
    messages: [...existing.messages, ...messagesToAppend],
  };

  nextConversations.splice(existingIndex, 1);
  nextConversations.unshift(updatedConversation);
  return nextConversations;
}

function findQuiz(
  messageMetadata: unknown,
  quizAttempts: QuizAttemptView[]
): QuizAttemptView | null {
  if (!messageMetadata || typeof messageMetadata !== "object") {
    return null;
  }

  const metadata = messageMetadata as {
    quizAttemptId?: string;
    quiz?: GeneratedQuiz;
  };

  const existing = quizAttempts.find((attempt) => attempt.id === metadata.quizAttemptId);

  if (existing) {
    return existing;
  }

  if (!metadata.quiz || !metadata.quizAttemptId) {
    return null;
  }

  return {
    id: metadata.quizAttemptId,
    topic: metadata.quiz.topic,
    difficulty: metadata.quiz.difficulty,
    status: "GENERATED",
    totalQuestions: metadata.quiz.questions.length,
    correctAnswers: 0,
    scorePercent: 0,
    feedbackText: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
    quizPayload: metadata.quiz,
  };
}

function findQuestionPack(
  messageMetadata: unknown,
  questionPacks: QuestionPackView[]
): QuestionPackView | null {
  if (!messageMetadata || typeof messageMetadata !== "object") {
    return null;
  }

  const metadata = messageMetadata as {
    questionPackId?: string;
    questionPack?: GeneratedQuestionPack;
  };

  const existing = questionPacks.find((pack) => pack.id === metadata.questionPackId);

  if (existing) {
    return existing;
  }

  if (!metadata.questionPack || !metadata.questionPackId) {
    return null;
  }

  return {
    id: metadata.questionPackId,
    title: metadata.questionPack.title,
    topic: metadata.questionPack.topic,
    difficulty: metadata.questionPack.difficulty,
    questionCount: metadata.questionPack.questions.length,
    sourceType: "TOPIC",
    sourceName: null,
    createdAt: new Date().toISOString(),
    packPayload: metadata.questionPack,
  };
}

function EmptyThread({
  role,
  onPromptClick,
}: {
  role: "student" | "teacher";
  onPromptClick: (value: string) => void;
}) {
  const prompts =
    role === "student"
      ? [
          "Explain fractions using simple examples",
          "Help me understand photosynthesis",
          "Generate a quiz on nouns and verbs",
        ]
      : [
          "Explain the best way to teach ratios",
          "Give me misconceptions to watch for in photosynthesis",
          "Plan a quick assessment for descriptive writing",
        ];

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles className="h-8 w-8" />
      </div>
      <h2 className="text-3xl font-bold tracking-tight">Acadeal AI</h2>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        {role === "student"
          ? "Ask for explanations, generate practice quizzes, and keep a record of your progress."
          : "Use lesson support, build question packs, and publish AI-generated assessments into the assignment workflow."}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onPromptClick(prompt)}
            className="rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

function QuizCard({
  attempt,
  answers,
  onSelect,
  onSubmit,
  isSubmitting,
}: {
  attempt: QuizAttemptView;
  answers: Record<string, QuizAnswerInput>;
  onSelect: (attemptId: string, questionId: string, option: string) => void;
  onSubmit: (attempt: QuizAttemptView) => void;
  isSubmitting: boolean;
}) {
  const completed = attempt.status === "COMPLETED" && Boolean(attempt.answerPayload);
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-primary/20 bg-background shadow-sm">
      <div className="border-b border-primary/10 bg-primary/5 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{attempt.quizPayload.difficulty}</Badge>
          <Badge variant="outline">{attempt.totalQuestions} questions</Badge>
          {completed && <Badge className="bg-emerald-600 text-white">{attempt.scorePercent}%</Badge>}
        </div>
        <h3 className="mt-3 text-lg font-semibold">{attempt.quizPayload.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{attempt.quizPayload.instructions}</p>
      </div>

      <div className="space-y-5 px-5 py-5">
        {attempt.quizPayload.questions.map((question, index) => {
          const selected = completed
            ? attempt.answerPayload?.answers?.[question.id]?.selectedOption || ""
            : answers[question.id]?.selectedOption || "";
          const result = attempt.answerPayload?.breakdown?.find((item) => item.questionId === question.id);

          return (
            <div key={question.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="outline">Q{index + 1}</Badge>
                <Badge variant="secondary">{question.skill}</Badge>
                {result && (
                  <Badge className={cn(result.correct ? "bg-emerald-600 text-white" : "bg-red-600 text-white")}>
                    {result.correct ? "Correct" : "Review"}
                  </Badge>
                )}
              </div>
              <p className="text-sm font-medium text-foreground">{question.question}</p>
              <div className="mt-4 grid gap-2">
                {question.options.map((option) => {
                  const isSelected = selected === option;
                  const isCorrectAnswer = completed && question.correctOption === option;
                  const isWrongSelection = completed && isSelected && !isCorrectAnswer;

                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={completed || isSubmitting}
                      onClick={() => onSelect(attempt.id, question.id, option)}
                      className={cn(
                        "rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                        isCorrectAnswer && "border-emerald-400 bg-emerald-50 text-emerald-900",
                        isWrongSelection && "border-red-400 bg-red-50 text-red-900",
                        !isCorrectAnswer &&
                          !isWrongSelection &&
                          isSelected &&
                          "border-primary bg-primary/10 text-foreground",
                        !isCorrectAnswer &&
                          !isWrongSelection &&
                          !isSelected &&
                          "border-border hover:border-primary/40 hover:bg-muted"
                      )}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              {result && (
                <div className="mt-3 rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                  {result.explanation}
                </div>
              )}
            </div>
          );
        })}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Progress</p>
            <p className="text-sm font-medium">
              {completed ? "Completed" : `${answeredCount} of ${attempt.totalQuestions} answered`}
            </p>
            {completed && attempt.feedbackText && (
              <p className="mt-1 max-w-2xl whitespace-pre-wrap text-sm text-muted-foreground">
                {attempt.feedbackText}
              </p>
            )}
          </div>
          {!completed && (
            <Button
              type="button"
              onClick={() => onSubmit(attempt)}
              disabled={isSubmitting || answeredCount !== attempt.totalQuestions}
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Submit Quiz
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function QuestionPackCard({ pack }: { pack: QuestionPackView }) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-amber-200 bg-background shadow-sm">
      <div className="border-b border-amber-200 bg-amber-50 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{pack.difficulty}</Badge>
          <Badge variant="outline">{pack.questionCount} questions</Badge>
          <Badge variant="outline">{pack.sourceType}</Badge>
        </div>
        <h3 className="mt-3 text-lg font-semibold">{pack.packPayload.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{pack.packPayload.summary}</p>
      </div>
      <div className="space-y-4 px-5 py-5">
        <div className="grid gap-2 md:grid-cols-2">
          {pack.packPayload.teachingNotes.slice(0, 4).map((note) => (
            <div key={note} className="rounded-xl border border-border bg-card px-3 py-3 text-sm text-muted-foreground">
              {note}
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {pack.packPayload.questions.map((question, index) => (
            <div key={question.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline">Q{index + 1}</Badge>
                <Badge variant="secondary">{question.type}</Badge>
                <Badge variant="outline">{question.points} pts</Badge>
              </div>
              <p className="text-sm font-medium">{question.questionText}</p>
              <p className="mt-2 text-sm text-muted-foreground">{question.answerKey}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AcadealWorkspace({ initialData }: Props) {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isStudent = initialData.role === "student";
  const isTeacher = initialData.role === "teacher";

  const [conversations, setConversations] = useState(initialData.conversations);
  const [quizAttempts, setQuizAttempts] = useState(initialData.quizAttempts);
  const [questionPacks, setQuestionPacks] = useState(initialData.questionPacks);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    () => initialData.conversations[0]?.id ?? null
  );
  const [composerValue, setComposerValue] = useState("");
  const [studentMode, setStudentMode] = useState<StudentMode>("explain");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);
  const [quizDrafts, setQuizDrafts] = useState<QuizDraftMap>(() =>
    Object.fromEntries(
      initialData.quizAttempts.map((attempt) => [attempt.id, attempt.answerPayload?.answers || {}])
    )
  );
  const [quizProcessLog, setQuizProcessLog] = useState<QuizProcessMap>({});
  const [activePackId, setActivePackId] = useState<string | null>(initialData.questionPacks[0]?.id ?? null);
  const [quizBuilder, setQuizBuilder] = useState({
    topic: "",
    difficulty: "medium",
    questionCount: String(ACADEAL_DEFAULT_STUDENT_QUIZ_COUNT),
  });
  const [questionStudio, setQuestionStudio] = useState({
    topic: "",
    promptMessage: "",
    difficulty: "medium",
    questionCount: String(ACADEAL_DEFAULT_TEACHER_PACK_COUNT),
    lessonId: initialData.teacherContext?.lessons[0]?.id
      ? String(initialData.teacherContext.lessons[0].id)
      : "",
    file: null as File | null,
  });
  const [publishDraft, setPublishDraft] = useState({
    title: "",
    startDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    lessonId: initialData.teacherContext?.lessons[0]?.id
      ? String(initialData.teacherContext.lessons[0].id)
      : "",
  });

  const activeConversation = useMemo(
    () =>
      activeConversationId
        ? conversations.find((conversation) => conversation.id === activeConversationId) || null
        : null,
    [activeConversationId, conversations]
  );

  const activePack = useMemo(
    () => questionPacks.find((pack) => pack.id === activePackId) || questionPacks[0] || null,
    [activePackId, questionPacks]
  );

  useEffect(() => {
    if (
      activeConversationId &&
      !conversations.some((conversation) => conversation.id === activeConversationId)
    ) {
      setActiveConversationId(conversations[0]?.id ?? null);
    }
  }, [activeConversationId, conversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation, isLoading, quizAttempts]);

  useEffect(() => {
    if (activePack) {
      setPublishDraft((current) => ({
        ...current,
        title: current.title || activePack.title,
      }));
    }
  }, [activePack]);

  function handleStartNewChat() {
    setActiveConversationId(null);
    setComposerValue("");
    setStatusMessage(null);
  }

  function handleSelectConversation(conversationId: string) {
    setActiveConversationId(conversationId);
    setStatusMessage(null);
  }

  async function handleDeleteConversation(conversationId: string) {
    if (deletingConversationId || isLoading) {
      return;
    }

    const conversation = conversations.find((item) => item.id === conversationId);
    const confirmed = window.confirm(
      `Delete "${conversation?.title || "this conversation"}"? This removes the chat history from recent conversations.`
    );

    if (!confirmed) {
      return;
    }

    const wasActive = activeConversationId === conversationId;
    setDeletingConversationId(conversationId);
    setStatusMessage(null);

    try {
      const response = await fetch(
        `/api/ai/acadeal/conversations/${encodeURIComponent(conversationId)}`,
        {
          method: "DELETE",
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : "Unable to delete this conversation."
        );
      }

      const remainingConversations = conversations.filter(
        (conversationItem) => conversationItem.id !== conversationId
      );

      setConversations(remainingConversations);

      if (wasActive) {
        setActiveConversationId(remainingConversations[0]?.id ?? null);
        setComposerValue("");
      }
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Unable to delete this conversation."
      );
    } finally {
      setDeletingConversationId(null);
    }
  }

  async function requestQuiz({
    topic,
    promptMessage,
    difficulty,
    questionCount,
  }: {
    topic: string;
    promptMessage?: string;
    difficulty?: string;
    questionCount?: number;
  }) {
    const response = await fetch("/api/ai/acadeal/quiz", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic,
        promptMessage,
        difficulty,
        questionCount,
        conversationId: activeConversation?.id,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(typeof data?.error === "string" ? data.error : "Unable to generate a quiz.");
    }

    const nextAttempt: QuizAttemptView = {
      id: data.attemptId,
      topic: data.quiz.topic,
      difficulty: data.quiz.difficulty,
      status: "GENERATED",
      totalQuestions: data.quiz.questions.length,
      correctAnswers: 0,
      scorePercent: 0,
      feedbackText: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
      quizPayload: data.quiz,
    };

    setQuizAttempts((current) => [nextAttempt, ...current.filter((attempt) => attempt.id !== nextAttempt.id)]);
    setConversations((current) =>
      mergeConversationState(current, data.conversationId, "STUDY_SUPPORT", topic, [
        createMessage("USER", promptMessage || `Generate a quiz on ${topic}.`),
        createMessage("ASSISTANT", data.reply, {
          type: "quiz",
          quizAttemptId: data.attemptId,
          quiz: data.quiz,
        }),
      ])
    );
    setActiveConversationId(data.conversationId);
  }

  async function sendSupportMessage() {
    const message = composerValue.trim();

    if (!message || isLoading) {
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      if (isStudent && studentMode === "quiz") {
        const questionCount = normalizeAcadealQuestionCount(
          quizBuilder.questionCount,
          ACADEAL_DEFAULT_STUDENT_QUIZ_COUNT
        );

        await requestQuiz({
          topic: message,
          promptMessage: `Generate a ${quizBuilder.difficulty} quiz with ${questionCount} questions on ${message}.`,
          difficulty: quizBuilder.difficulty,
          questionCount,
        });
        setQuizBuilder((current) => ({
          ...current,
          questionCount: String(questionCount),
        }));
        setComposerValue("");
        return;
      }

      const response = await fetch("/api/ai/acadeal/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          conversationId: activeConversation?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Unable to generate a reply.");
      }

      const kind = isStudent ? "STUDY_SUPPORT" : "TEACHING_SUPPORT";
      setConversations((current) =>
        mergeConversationState(current, data.conversationId, kind, message, [
          createMessage("USER", message),
          createMessage("ASSISTANT", data.reply, data.metadata ?? null),
        ])
      );
      setActiveConversationId(data.conversationId);
      setComposerValue("");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to generate a reply.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleQuizBuilderSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!quizBuilder.topic.trim() || isLoading) {
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const questionCount = normalizeAcadealQuestionCount(
        quizBuilder.questionCount,
        ACADEAL_DEFAULT_STUDENT_QUIZ_COUNT
      );

      await requestQuiz({
        topic: quizBuilder.topic.trim(),
        promptMessage: `Generate a ${quizBuilder.difficulty} quiz with ${questionCount} questions on ${quizBuilder.topic.trim()}.`,
        difficulty: quizBuilder.difficulty,
        questionCount,
      });
      setQuizBuilder((current) => ({
        ...current,
        topic: "",
        questionCount: String(questionCount),
      }));
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to generate a quiz.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleQuizSelect(attemptId: string, questionId: string, option: string) {
    const changedAt = new Date().toISOString();

    setQuizDrafts((current) => ({
      ...current,
      [attemptId]: {
        ...(current[attemptId] || {}),
        [questionId]: {
          selectedOption: option,
          changedAt,
        },
      },
    }));

    setQuizProcessLog((current) => ({
      ...current,
      [attemptId]: [
        ...(current[attemptId] || []),
        {
          questionId,
          selectedOption: option,
          changedAt,
        },
      ],
    }));
  }

  async function handleQuizSubmit(attempt: QuizAttemptView) {
    setIsLoading(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/ai/acadeal/quiz/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          attemptId: attempt.id,
          answers: quizDrafts[attempt.id] || {},
          processLog: quizProcessLog[attempt.id] || [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Unable to submit quiz.");
      }

      setQuizAttempts((current) =>
        current.map((item) => (item.id === data.id ? data : item))
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to submit quiz.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleQuestionPackSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if ((!questionStudio.topic.trim() && !questionStudio.promptMessage.trim() && !questionStudio.file) || isLoading) {
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const questionCount = normalizeAcadealQuestionCount(
        questionStudio.questionCount,
        ACADEAL_DEFAULT_TEACHER_PACK_COUNT
      );

      const formData = new FormData();
      formData.append("topic", questionStudio.topic);
      formData.append("promptMessage", questionStudio.promptMessage);
      formData.append("difficulty", questionStudio.difficulty);
      formData.append("questionCount", String(questionCount));
      if (activeConversation?.id) {
        formData.append("conversationId", activeConversation.id);
      }
      if (questionStudio.lessonId) {
        formData.append("lessonId", questionStudio.lessonId);
      }
      if (questionStudio.file) {
        formData.append("file", questionStudio.file);
      }

      const response = await fetch("/api/ai/acadeal/question-pack", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : "Unable to generate a question pack."
        );
      }

      const nextPack: QuestionPackView = {
        id: data.questionPackId,
        title: data.questionPack.title,
        topic: data.questionPack.topic,
        difficulty: data.questionPack.difficulty,
        questionCount: data.questionPack.questions.length,
        sourceType: questionStudio.file ? "PDF" : "TOPIC",
        sourceName: questionStudio.file?.name || null,
        createdAt: new Date().toISOString(),
        packPayload: data.questionPack,
      };

      setQuestionPacks((current) => [nextPack, ...current.filter((pack) => pack.id !== nextPack.id)]);
      setActivePackId(nextPack.id);
      setConversations((current) =>
        mergeConversationState(
          current,
          data.conversationId,
          "TEACHING_SUPPORT",
          questionStudio.promptMessage || questionStudio.topic || "Question pack",
          [
            createMessage(
              "USER",
              questionStudio.promptMessage ||
                `Generate a ${questionStudio.difficulty} question pack with ${questionCount} questions on ${questionStudio.topic || "the uploaded PDF"}.`
            ),
            createMessage("ASSISTANT", data.reply, {
              type: "question-pack",
              questionPackId: data.questionPackId,
              questionPack: data.questionPack,
            }),
          ]
        )
      );
      setActiveConversationId(data.conversationId);
      setQuestionStudio((current) => ({
        ...current,
        topic: "",
        promptMessage: "",
        questionCount: String(questionCount),
        file: null,
      }));
      setPublishDraft((current) => ({
        ...current,
        title: nextPack.title,
      }));
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to generate a question pack.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePublishPack() {
    if (!activePack || !publishDraft.lessonId || !publishDraft.title.trim() || isLoading) {
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/ai/acadeal/question-pack/${activePack.id}/assignment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lessonId: Number(publishDraft.lessonId),
          title: publishDraft.title,
          startDate: publishDraft.startDate,
          dueDate: publishDraft.dueDate,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Unable to publish assignment.");
      }

      router.push(data.redirectTo);
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to publish assignment.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(0,1fr)_24rem]">
      <Card className="h-full min-h-0 overflow-hidden">
        <CardContent className="flex h-full flex-col p-0">
          <div className="border-b px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Workspace</p>
                  <h1 className="text-xl font-bold">Acadeal AI</h1>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleStartNewChat}
                title="New chat"
                aria-label="Start a new chat"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 px-4 py-4">
            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {isStudent ? "Student profile" : "Teacher profile"}
                </p>
                {isStudent && initialData.studentContext && (
                  <div className="mt-3 space-y-2">
                    <p className="font-semibold">{initialData.studentContext.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {initialData.studentContext.className} • {initialData.studentContext.gradeLabel}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {initialData.studentContext.subjects.slice(0, 6).map((subject) => (
                        <Badge key={subject} variant="secondary">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {isTeacher && initialData.teacherContext && (
                  <div className="mt-3 space-y-2">
                    <p className="font-semibold">{initialData.teacherContext.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {initialData.teacherContext.subjects.join(", ")}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Memory</p>
                  <Badge variant="outline">{conversations.length}</Badge>
                </div>
                <Button
                  type="button"
                  variant={activeConversation ? "outline" : "default"}
                  onClick={handleStartNewChat}
                  className="mb-3 w-full justify-start"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New chat
                </Button>
                <div className="space-y-2">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={cn(
                        "group flex items-start gap-2 rounded-2xl border px-3 py-3 transition-colors",
                        activeConversation?.id === conversation.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectConversation(conversation.id)}
                        aria-current={activeConversation?.id === conversation.id ? "page" : undefined}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="line-clamp-1 font-medium">{conversation.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatShortDate(conversation.updatedAt)}
                        </p>
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={Boolean(deletingConversationId) || isLoading}
                        onClick={() => void handleDeleteConversation(conversation.id)}
                        className={cn(
                          "h-8 w-8 shrink-0 text-muted-foreground transition-opacity hover:text-destructive",
                          deletingConversationId === conversation.id
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                        )}
                        aria-label={`Delete ${conversation.title}`}
                      >
                        {deletingConversationId === conversation.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                  {conversations.length === 0 && (
                    <p className="text-sm text-muted-foreground">No saved conversations yet.</p>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="h-full min-h-0 overflow-hidden">
        <CardContent className="flex h-full flex-col p-0">
          <div className="border-b bg-background/95 px-5 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  {isStudent ? "Learning support" : "Teacher support"}
                </p>
                <h2 className="text-2xl font-bold">Acadeal AI</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" onClick={handleStartNewChat}>
                  <Plus className="mr-2 h-4 w-4" />
                  New chat
                </Button>
                {isStudent && (
                  <>
                    <Button
                      type="button"
                      variant={studentMode === "explain" ? "default" : "outline"}
                      onClick={() => setStudentMode("explain")}
                    >
                      <BookOpen className="mr-2 h-4 w-4" />
                      Explain
                    </Button>
                    <Button
                      type="button"
                      variant={studentMode === "quiz" ? "default" : "outline"}
                      onClick={() => setStudentMode("quiz")}
                    >
                      <Brain className="mr-2 h-4 w-4" />
                      Quiz
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            {activeConversation ? (
              <ScrollArea className="h-full px-5 py-5">
                <div className="space-y-6">
                  {activeConversation.messages.map((message) => {
                    const quizAttempt = findQuiz(message.metadata, quizAttempts);
                    const questionPack = findQuestionPack(message.metadata, questionPacks);
                    const visuals = message.metadata?.visuals || [];

                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex",
                          message.actor === "USER" ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-3xl rounded-3xl px-5 py-4 shadow-sm",
                            message.actor === "USER"
                              ? "bg-primary text-primary-foreground"
                              : "border border-border bg-card text-foreground"
                          )}
                        >
                          <MessageContent content={message.content} />
                          {visuals.length > 0 && <MessageVisuals visuals={visuals} />}
                          {quizAttempt && (
                            <QuizCard
                              attempt={quizAttempt}
                              answers={quizDrafts[quizAttempt.id] || {}}
                              onSelect={handleQuizSelect}
                              onSubmit={handleQuizSubmit}
                              isSubmitting={isLoading}
                            />
                          )}
                          {questionPack && <QuestionPackCard pack={questionPack} />}
                        </div>
                      </div>
                    );
                  })}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="rounded-3xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
                        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                        Eckintosh AI is thinking...
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            ) : (
              <EmptyThread role={initialData.role} onPromptClick={setComposerValue} />
            )}
          </div>

          <div className="border-t bg-background/95 px-5 py-4">
            {statusMessage && (
              <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {statusMessage}
              </div>
            )}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void sendSupportMessage();
              }}
              className="space-y-3"
            >
              {isStudent && studentMode === "quiz" && (
                <div className="grid gap-3 md:grid-cols-3">
                  <Select
                    value={quizBuilder.difficulty}
                    onChange={(event) =>
                      setQuizBuilder((current) => ({ ...current, difficulty: event.target.value }))
                    }
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="mixed">Mixed</option>
                  </Select>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={ACADEAL_MIN_QUESTION_COUNT}
                    value={quizBuilder.questionCount}
                    onChange={(event) =>
                      setQuizBuilder((current) => ({
                        ...current,
                        questionCount: sanitizeQuestionCountInput(event.target.value),
                      }))
                    }
                    onBlur={() =>
                      setQuizBuilder((current) => ({
                        ...current,
                        questionCount: normalizeQuestionCountField(
                          current.questionCount,
                          ACADEAL_DEFAULT_STUDENT_QUIZ_COUNT
                        ),
                      }))
                    }
                    aria-label="Student quiz question count"
                    placeholder={`Questions (${ACADEAL_MIN_QUESTION_COUNT}+)`}
                  />
                  <div className="rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground">
                    Topic mode: enter any whole number starting from {ACADEAL_MIN_QUESTION_COUNT}.
                  </div>
                </div>
              )}
              <div className="flex items-end gap-3">
                <Textarea
                  value={composerValue}
                  onChange={(event) => setComposerValue(event.target.value)}
                  placeholder={
                    isStudent
                      ? studentMode === "quiz"
                        ? "Type a topic, for example: Fractions and ratios"
                        : "Ask Acadeal AI to explain a topic"
                      : "Ask for teaching help, lesson ideas, misconceptions, or examples"
                  }
                  className="min-h-[88px] flex-1 resize-none"
                />
                <Button type="submit" size="lg" disabled={isLoading || !composerValue.trim()}>
                  <Send className="mr-2 h-4 w-4" />
                  Send
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>

      <Card className="hidden h-full overflow-hidden xl:block">
        <CardContent className="flex h-full flex-col p-0">
          <div className="border-b px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                {isStudent ? <GraduationCap className="h-5 w-5" /> : <FileQuestion className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  {isStudent ? "Quiz lab" : "Question studio"}
                </p>
                <h3 className="text-xl font-bold">
                  {isStudent ? "Practice + progress" : "Generate + publish"}
                </h3>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 px-5 py-5">
            <div className="space-y-6">
              {isStudent && (
                <>
                  <form onSubmit={(event) => void handleQuizBuilderSubmit(event)} className="space-y-3">
                    <Input
                      value={quizBuilder.topic}
                      onChange={(event) =>
                        setQuizBuilder((current) => ({ ...current, topic: event.target.value }))
                      }
                      placeholder="Topic for a new quiz"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Select
                        value={quizBuilder.difficulty}
                        onChange={(event) =>
                          setQuizBuilder((current) => ({ ...current, difficulty: event.target.value }))
                        }
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                        <option value="mixed">Mixed</option>
                      </Select>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={ACADEAL_MIN_QUESTION_COUNT}
                        value={quizBuilder.questionCount}
                        onChange={(event) =>
                          setQuizBuilder((current) => ({
                            ...current,
                            questionCount: sanitizeQuestionCountInput(event.target.value),
                          }))
                        }
                        onBlur={() =>
                          setQuizBuilder((current) => ({
                            ...current,
                            questionCount: normalizeQuestionCountField(
                              current.questionCount,
                              ACADEAL_DEFAULT_STUDENT_QUIZ_COUNT
                            ),
                          }))
                        }
                        aria-label="Quiz lab question count"
                        placeholder={`Questions (${ACADEAL_MIN_QUESTION_COUNT}+)`}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Set any whole-number question count starting from {ACADEAL_MIN_QUESTION_COUNT}.
                    </p>
                    <Button type="submit" className="w-full" disabled={isLoading || !quizBuilder.topic.trim()}>
                      <Target className="mr-2 h-4 w-4" />
                      Generate Quiz
                    </Button>
                  </form>

                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Recent attempts</p>
                    {quizAttempts.map((attempt) => (
                      <div key={attempt.id} className="rounded-2xl border border-border bg-card px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{attempt.topic}</p>
                            <p className="text-sm text-muted-foreground">
                              {attempt.difficulty} • {attempt.totalQuestions} questions
                            </p>
                          </div>
                          <Badge variant={attempt.status === "COMPLETED" ? "secondary" : "outline"}>
                            {attempt.status === "COMPLETED" ? `${attempt.scorePercent}%` : "Pending"}
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {formatShortDate(attempt.completedAt || attempt.createdAt)}
                        </p>
                      </div>
                    ))}
                    {quizAttempts.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Your generated quizzes and results will appear here for future analysis.
                      </p>
                    )}
                  </div>
                </>
              )}

              {isTeacher && (
                <>
                  <form onSubmit={(event) => void handleQuestionPackSubmit(event)} className="space-y-3">
                    <Input
                      value={questionStudio.topic}
                      onChange={(event) =>
                        setQuestionStudio((current) => ({ ...current, topic: event.target.value }))
                      }
                      placeholder="Topic, for example: Ecosystems"
                    />
                    <Textarea
                      value={questionStudio.promptMessage}
                      onChange={(event) =>
                        setQuestionStudio((current) => ({ ...current, promptMessage: event.target.value }))
                      }
                      placeholder="Optional teaching brief, e.g. mix revision and application questions"
                      className="min-h-[110px]"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Select
                        value={questionStudio.difficulty}
                        onChange={(event) =>
                          setQuestionStudio((current) => ({ ...current, difficulty: event.target.value }))
                        }
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </Select>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={ACADEAL_MIN_QUESTION_COUNT}
                        value={questionStudio.questionCount}
                        onChange={(event) =>
                          setQuestionStudio((current) => ({
                            ...current,
                            questionCount: sanitizeQuestionCountInput(event.target.value),
                          }))
                        }
                        onBlur={() =>
                          setQuestionStudio((current) => ({
                            ...current,
                            questionCount: normalizeQuestionCountField(
                              current.questionCount,
                              ACADEAL_DEFAULT_TEACHER_PACK_COUNT
                            ),
                          }))
                        }
                        aria-label="Teacher question pack count"
                        placeholder={`Questions (${ACADEAL_MIN_QUESTION_COUNT}+)`}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Question packs support any whole-number count starting from {ACADEAL_MIN_QUESTION_COUNT}.
                    </p>
                    <Select
                      value={questionStudio.lessonId}
                      onChange={(event) =>
                        setQuestionStudio((current) => ({ ...current, lessonId: event.target.value }))
                      }
                    >
                      <option value="">Select lesson</option>
                      {initialData.teacherContext?.lessons.map((lesson) => (
                        <option key={lesson.id} value={lesson.id}>
                          {lesson.subjectName} • {lesson.className}
                        </option>
                      ))}
                    </Select>
                    <label className="flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground transition-colors hover:bg-muted">
                      <Upload className="mr-2 h-4 w-4" />
                      {questionStudio.file ? questionStudio.file.name : "Upload PDF to generate questions"}
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={(event) =>
                          setQuestionStudio((current) => ({
                            ...current,
                            file: event.target.files?.[0] || null,
                          }))
                        }
                      />
                    </label>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={
                        isLoading ||
                        (!questionStudio.topic.trim() &&
                          !questionStudio.promptMessage.trim() &&
                          !questionStudio.file)
                      }
                    >
                      <FileQuestion className="mr-2 h-4 w-4" />
                      Generate Question Pack
                    </Button>
                  </form>

                  {activePack && (
                    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Publish to assignments</p>
                        <h4 className="mt-2 font-semibold">{activePack.title}</h4>
                      </div>
                      <Input
                        value={publishDraft.title}
                        onChange={(event) =>
                          setPublishDraft((current) => ({ ...current, title: event.target.value }))
                        }
                        placeholder="Assignment title"
                      />
                      <Select
                        value={publishDraft.lessonId}
                        onChange={(event) =>
                          setPublishDraft((current) => ({ ...current, lessonId: event.target.value }))
                        }
                      >
                        <option value="">Select lesson</option>
                        {initialData.teacherContext?.lessons.map((lesson) => (
                          <option key={lesson.id} value={lesson.id}>
                            {lesson.subjectName} • {lesson.className}
                          </option>
                        ))}
                      </Select>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input
                          type="date"
                          value={publishDraft.startDate}
                          onChange={(event) =>
                            setPublishDraft((current) => ({ ...current, startDate: event.target.value }))
                          }
                        />
                        <Input
                          type="date"
                          value={publishDraft.dueDate}
                          onChange={(event) =>
                            setPublishDraft((current) => ({ ...current, dueDate: event.target.value }))
                          }
                        />
                      </div>
                      <Button type="button" className="w-full" onClick={() => void handlePublishPack()}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Publish as Assignment
                      </Button>
                    </div>
                  )}

                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Recent question packs</p>
                    {questionPacks.map((pack) => (
                      <button
                        key={pack.id}
                        type="button"
                        onClick={() => setActivePackId(pack.id)}
                        className={cn(
                          "w-full rounded-2xl border px-4 py-3 text-left transition-colors",
                          activePack?.id === pack.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted"
                        )}
                      >
                        <p className="font-medium">{pack.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {pack.questionCount} questions • {pack.sourceType}
                        </p>
                      </button>
                    ))}
                    {questionPacks.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Generated packs will appear here for reuse and publishing.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
