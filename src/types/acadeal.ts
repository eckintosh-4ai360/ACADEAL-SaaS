export type AcadealActor = "USER" | "ASSISTANT" | "SYSTEM";
export type StudentIntent = "EXPLAIN" | "QUIZ";
export type TeacherIntent = "SUPPORT" | "QUESTION_PACK";
export type QuizDifficulty = "easy" | "medium" | "hard" | "mixed";
export type QuizStatus = "GENERATED" | "COMPLETED" | "ABANDONED";
export type QuestionPackSource = "TOPIC" | "PDF";

export type QuizQuestion = {
  id: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE";
  question: string;
  options: string[];
  correctOption: string;
  explanation: string;
  skill: string;
};

export type GeneratedQuiz = {
  title: string;
  topic: string;
  difficulty: QuizDifficulty;
  estimatedMinutes: number;
  instructions: string;
  questions: QuizQuestion[];
};

export type QuizAnswerInput = {
  selectedOption: string;
  changedAt: string;
};

export type QuizQuestionResult = {
  questionId: string;
  question: string;
  selectedOption: string | null;
  correctOption: string;
  correct: boolean;
  skill: string;
  explanation: string;
};

export type QuizAttemptPayload = {
  submittedAt: string;
  answers: Record<string, QuizAnswerInput>;
  breakdown: QuizQuestionResult[];
};

export type QuizAttemptView = {
  id: string;
  topic: string;
  difficulty: string;
  status: QuizStatus;
  totalQuestions: number;
  correctAnswers: number;
  scorePercent: number;
  feedbackText: string | null;
  createdAt: string;
  completedAt: string | null;
  quizPayload: GeneratedQuiz;
  answerPayload?: QuizAttemptPayload | null;
  processLog?: unknown;
};

export type QuestionPackQuestion = {
  id: string;
  type: "THEORY" | "MULTIPLE_CHOICE";
  questionText: string;
  points: number;
  answerKey: string;
  rationale: string;
  options?: Array<{
    text: string;
    isCorrect: boolean;
  }>;
};

export type GeneratedQuestionPack = {
  title: string;
  topic: string;
  difficulty: string;
  summary: string;
  sourceSummary: string;
  teachingNotes: string[];
  questions: QuestionPackQuestion[];
};

export type QuestionPackView = {
  id: string;
  title: string;
  topic: string | null;
  difficulty: string;
  questionCount: number;
  sourceType: QuestionPackSource;
  sourceName: string | null;
  createdAt: string;
  packPayload: GeneratedQuestionPack;
};

export type ConversationVisual = {
  kind: "svg";
  title: string;
  alt: string;
  caption?: string | null;
  svgMarkup: string;
};

export type ConversationAttachment = {
  type?: "quiz" | "question-pack";
  quizAttemptId?: string;
  questionPackId?: string;
  quiz?: GeneratedQuiz;
  questionPack?: GeneratedQuestionPack;
  visuals?: ConversationVisual[];
};

export type WorkspaceMessage = {
  id: string;
  actor: AcadealActor;
  content: string;
  createdAt: string;
  metadata?: ConversationAttachment | null;
};

export type WorkspaceConversation = {
  id: string;
  title: string;
  kind: "STUDY_SUPPORT" | "TEACHING_SUPPORT";
  updatedAt: string;
  messages: WorkspaceMessage[];
};

export type StudentWorkspaceData = {
  id: string;
  name: string;
  className: string;
  gradeLabel: string;
  subjects: string[];
  syllabusTopics: string[];
};

export type TeacherWorkspaceData = {
  id: string;
  name: string;
  subjects: string[];
  lessons: Array<{
    id: number;
    name: string;
    className: string;
    subjectName: string;
  }>;
  /** Live school roster injected into the AI context for factual lookups */
  schoolData?: {
    studentLines: string[];
    classLines: string[];
    teacherLines: string[];
    assignmentLines: string[];
  };
};

export type AcadealPageData = {
  role: "student" | "teacher";
  studentContext?: StudentWorkspaceData;
  teacherContext?: TeacherWorkspaceData;
  conversations: WorkspaceConversation[];
  quizAttempts: QuizAttemptView[];
  questionPacks: QuestionPackView[];
};
