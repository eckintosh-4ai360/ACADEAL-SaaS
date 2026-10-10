import prisma from "@/lib/prisma";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "he",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "that",
  "the",
  "to",
  "was",
  "were",
  "will",
  "with",
]);

export type PlagiarismMatch = {
  questionId: number;
  questionText: string;
  similarity: number;
  sharedPhrases: string[];
  studentA: {
    id: string;
    name: string;
    answer: string;
  };
  studentB: {
    id: string;
    name: string;
    answer: string;
  };
};

export type AssignmentPlagiarismReport = {
  assignmentId: number;
  assignmentTitle: string;
  className: string;
  subjectName: string;
  totalTheoryResponses: number;
  comparedPairs: number;
  flaggedPairs: number;
  highestSimilarity: number;
  matches: PlagiarismMatch[];
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token && !STOP_WORDS.has(token));
}

function buildShingles(tokens: string[], size = 3) {
  const shingles = new Set<string>();

  for (let index = 0; index <= tokens.length - size; index += 1) {
    shingles.add(tokens.slice(index, index + size).join(" "));
  }

  return shingles;
}

function jaccardSimilarity(left: Set<string>, right: Set<string>) {
  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  let intersection = 0;

  left.forEach((token) => {
    if (right.has(token)) {
      intersection += 1;
    }
  });

  const union = left.size + right.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function getSharedPhrases(left: string[], right: string[]) {
  const leftShingles = buildShingles(left, 4);
  const rightShingles = buildShingles(right, 4);
  const phrases: string[] = [];

  leftShingles.forEach((phrase) => {
    if (rightShingles.has(phrase)) {
      phrases.push(phrase);
    }
  });

  return phrases.slice(0, 4);
}

function calculateSimilarity(leftAnswer: string, rightAnswer: string) {
  const leftTokens = tokenize(leftAnswer);
  const rightTokens = tokenize(rightAnswer);

  const tokenSimilarity = jaccardSimilarity(new Set(leftTokens), new Set(rightTokens));
  const phraseSimilarity = jaccardSimilarity(buildShingles(leftTokens, 3), buildShingles(rightTokens, 3));
  const sharedPhrases = getSharedPhrases(leftTokens, rightTokens);
  const similarity = Number((tokenSimilarity * 0.35 + phraseSimilarity * 0.65).toFixed(3));

  return {
    similarity,
    sharedPhrases,
  };
}

function shortenAnswer(answer: string) {
  const compact = answer.replace(/\s+/g, " ").trim();
  return compact.length > 180 ? `${compact.slice(0, 177)}...` : compact;
}

export async function generateAssignmentPlagiarismReport(
  assignmentId: number
): Promise<AssignmentPlagiarismReport | null> {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      lesson: {
        include: {
          class: true,
          subject: true,
        },
      },
      questions: {
        where: { questionType: "THEORY" },
        include: {
          answers: {
            where: {
              answerText: {
                not: null,
              },
            },
            include: {
              student: {
                select: {
                  id: true,
                  name: true,
                  surname: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!assignment) {
    return null;
  }

  const matches: PlagiarismMatch[] = [];
  let comparedPairs = 0;
  let totalTheoryResponses = 0;
  let highestSimilarity = 0;

  assignment.questions.forEach((question) => {
    const answers = question.answers.filter(
      (answer) => typeof answer.answerText === "string" && answer.answerText.trim().length >= 40
    );

    totalTheoryResponses += answers.length;

    for (let leftIndex = 0; leftIndex < answers.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < answers.length; rightIndex += 1) {
        comparedPairs += 1;

        const leftAnswer = answers[leftIndex];
        const rightAnswer = answers[rightIndex];
        const result = calculateSimilarity(leftAnswer.answerText || "", rightAnswer.answerText || "");

        if (result.similarity > highestSimilarity) {
          highestSimilarity = result.similarity;
        }

        if (result.similarity >= 0.58) {
          matches.push({
            questionId: question.id,
            questionText: question.questionText,
            similarity: result.similarity,
            sharedPhrases: result.sharedPhrases,
            studentA: {
              id: leftAnswer.student.id,
              name: `${leftAnswer.student.name} ${leftAnswer.student.surname}`.trim(),
              answer: shortenAnswer(leftAnswer.answerText || ""),
            },
            studentB: {
              id: rightAnswer.student.id,
              name: `${rightAnswer.student.name} ${rightAnswer.student.surname}`.trim(),
              answer: shortenAnswer(rightAnswer.answerText || ""),
            },
          });
        }
      }
    }
  });

  return {
    assignmentId: assignment.id,
    assignmentTitle: assignment.title,
    className: assignment.lesson.class.name,
    subjectName: assignment.lesson.subject.name,
    totalTheoryResponses,
    comparedPairs,
    flaggedPairs: matches.length,
    highestSimilarity: Number(highestSimilarity.toFixed(3)),
    matches: matches.sort((left, right) => right.similarity - left.similarity).slice(0, 12),
  };
}
