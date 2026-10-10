import Papa from "papaparse";
import { getGroqClient, DEFAULT_GROQ_MODEL, GROQ_REASONING_MODEL } from "@/lib/groq";

/**
 * Extracts text from a PDF buffer using pdf-parse v2's class-based API.
 * pdf-parse v2 exports { PDFParse } — NOT a callable function like v1.
 */
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PDFParse } = require("pdf-parse");
    const parser = new PDFParse({ verbosity: 0 });
    await parser.load(buffer);
    const pages: string[] = await parser.getText();
    const text = Array.isArray(pages) ? pages.join("\n") : String(pages ?? "");
    if (text.trim().length > 0 && isReadableText(text)) {
      return text;
    }
  } catch (err) {
    console.error("pdf-parse v2 extraction failed:", err);
  }
  return "";
}

// DOCX parser – uses mammoth for clean text extraction from ZIP-based .docx

const getMammoth = (): any => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("mammoth");
  } catch {
    return null;
  }
};

export interface ParsedOption {
  text: string;
  isCorrect: boolean;
}

/**
 * Where the correct answer came from:
 * - "document" – the source file stated it (answer key, asterisk, "Answer: B")
 * - "ai"       – no key in the file, so the AI worked the question out
 * - "unknown"  – neither worked; the first option is marked as a placeholder
 * Anything other than "document" should be surfaced to the teacher for review.
 */
export type AnswerSource = "document" | "ai" | "unknown";

export interface ParsedObjectiveQuestion {
  questionText: string;
  options: ParsedOption[];
  points: number;
  answerSource?: AnswerSource;
}

/**
 * Extracts plain text from a DOCX buffer using mammoth.
 * Falls back to a raw XML regex scrape if mammoth is unavailable.
 */
async function extractTextFromDocxBuffer(buffer: Buffer): Promise<string> {
  // Try mammoth first (handles ZIP-based .docx properly)
  const mammoth = getMammoth();
  if (mammoth) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      if (result && result.value && result.value.trim().length > 0) {
        return result.value;
      }
    } catch (err) {
      console.warn("mammoth DOCX extraction failed, trying XML fallback:", err);
    }
  }

  // XML regex fallback (only works if the buffer somehow contains unzipped XML)
  try {
    const content = buffer.toString("binary");
    const matches = content.match(/<w:t[^>]*>(.*?)<\/w:t>/gi);
    if (matches && matches.length > 0) {
      const text = matches
        .map((m) => m.replace(/<[^>]+>/g, "").trim())
        .filter(Boolean)
        .join(" ");
      if (text.trim().length > 0) return text;
    }
  } catch (err) {
    console.error("Error extracting text from docx via XML regex:", err);
  }

  // Last resort – treat as plain text
  return buffer.toString("utf8");
}

/**
 * Parses CSV rows directly if formatted with Question and Options columns.
 */
function parseObjectiveQuestionsFromCsv(buffer: Buffer): ParsedObjectiveQuestion[] {
  try {
    const csvString = buffer.toString("utf8");
    const parsed = Papa.parse<Record<string, string>>(csvString, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.data && parsed.data.length > 0) {
      const questions: ParsedObjectiveQuestion[] = [];

      for (const row of parsed.data) {
        const keys = Object.keys(row);
        const questionKey = keys.find((k) => /question|q_text|prompt|title/i.test(k)) || keys[0];
        const questionText = row[questionKey]?.trim();

        if (!questionText) continue;

        const options: ParsedOption[] = [];
        const ansKey = keys.find((k) => /answer|correct|key/i.test(k));
        const correctVal = ansKey ? row[ansKey]?.trim().toUpperCase() : "";

        // Find option columns (e.g. Option A, Option B, Opt 1, etc. or remaining columns)
        const optionKeys = keys.filter(
          (k) => k !== questionKey && k !== ansKey && /option|opt|choice|[a-e]$/i.test(k)
        );

        const targetOptKeys = optionKeys.length >= 2 ? optionKeys : keys.filter((k) => k !== questionKey && k !== ansKey);

        targetOptKeys.forEach((key, idx) => {
          const optText = row[key]?.trim();
          if (optText) {
            const letter = String.fromCharCode(65 + idx);
            const isCorrect =
              correctVal === letter ||
              correctVal === optText.toUpperCase() ||
              correctVal === String(idx + 1) ||
              optText.startsWith("*");

            options.push({
              text: optText.replace(/^\*/, "").trim(),
              isCorrect,
            });
          }
        });

        if (options.length >= 2) {
          //! No answer column match — leave unmarked so the AI solving pass
          //! can work it out rather than silently defaulting to option A.
          questions.push({
            questionText,
            options,
            points: 1,
            answerSource: options.some((o) => o.isCorrect) ? "document" : "unknown",
          });
        }
      }

      if (questions.length > 0) {
        return questions;
      }
    }
  } catch (err) {
    console.warn("CSV direct parsing skipped:", err);
  }
  return [];
}

/**
 * Extracts plain text from various file types (PDF, CSV, TXT, JSON, DOCX).
 */
export async function extractTextFromFile(file: File, buffer: Buffer): Promise<string> {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  // ── PDF   
  if (fileType.includes("pdf") || fileName.endsWith(".pdf")) {
    return extractTextFromPdf(buffer);
  }

  // ── DOCX / DOC  
  if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
    return extractTextFromDocxBuffer(buffer);
  }

  // ── CSV   
  if (fileType.includes("csv") || fileName.endsWith(".csv")) {
    const csvContent = buffer.toString("utf8");
    const parsed = Papa.parse<string[]>(csvContent, { skipEmptyLines: true });
    return parsed.data.map((row) => row.join(" \n ")).join("\n");
  }

  // ── JSON  
  if (fileType.includes("json") || fileName.endsWith(".json")) {
    try {
      const json = JSON.parse(buffer.toString("utf8"));
      return JSON.stringify(json, null, 2);
    } catch {
      return buffer.toString("utf8");
    }
  }

  return buffer.toString("utf8");
}

/**
 * Returns true if the text contains enough printable words to be treated as
 * real document content rather than raw binary / PDF internal structure.
 */
function isReadableText(text: string): boolean {
  const sample = text.slice(0, 2000);
  // Count printable ASCII characters (space, letters, digits, common punctuation)
  const printable = (sample.match(/[\x20-\x7E]/g) || []).length;
  const ratio = printable / sample.length;
  // Accept if >60% of sampled chars are printable ASCII
  return ratio > 0.6;
}

/**
 * Strips markdown fences and any prose around a JSON payload.
 */
function extractJsonPayload(responseText: string): string {
  const cleaned = responseText
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  // Models sometimes wrap the array in a sentence — grab the outermost array.
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    return cleaned.slice(start, end + 1);
  }
  return cleaned;
}

/**
 * True when the document itself carries answer markings — an answer key, an
 * "Answer: B" line, or asterisked options.
 *
 * The transcription model cannot be taken at its word here: told not to guess,
 * it still marks answers on papers that have no key at all. When this returns
 * false, every answer it produced is discarded and sent to the solver instead,
 * so a wrong guess can never silently become the marking key.
 */
function documentStatesAnswers(text: string): boolean {
  return (
    /\b(?:answer|ans|correct\s*answer|answer\s*key|solution|marking\s*scheme)\s*(?:key)?\s*[:\-=]/i.test(text) ||
    /^\s*(?:key|answers)\s*[:\-]/im.test(text) ||
    /^\s*[A-J][\.\)][^\n]*\*\s*$/m.test(text)
  );
}

/**
 * Stage 1 — structural extraction.
 *
 * This pass only transcribes what is physically on the page: the question
 * text, the options, and their original order. It deliberately does NOT try
 * to work out answers; mixing "copy this out" with "solve this" in a single
 * call is what made the small model mark option A for everything.
 */
async function extractQuestionsWithAi(
  text: string,
  documentHasAnswerKey: boolean
): Promise<ParsedObjectiveQuestion[]> {
  const groq = getGroqClient();
  const completion = await groq.chat.completions.create({
    model: DEFAULT_GROQ_MODEL,
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `You are an exam paper transcriber. You copy multiple-choice questions out of a document into JSON. You do NOT answer them.
Return ONLY a valid JSON array. No markdown code blocks, no commentary.

Output Schema:
[
  {
    "questionText": "What is the capital of Ghana?",
    "options": [
      { "text": "Accra", "isCorrect": false },
      { "text": "Kumasi", "isCorrect": false }
    ],
    "points": 1
  }
]

Rules:
- Preserve the exact order the questions appear in the document. Question 1 in the document must be the first element of the array.
- Preserve the exact order of the options within each question. Option A must be the first element of "options", B the second, and so on. Never reorder or sort them.
- "questionText": the question exactly as written, minus the leading number ("1.", "Q1:", "Question 3 -").
- "options": the choices exactly as written, minus the letter prefix ("A)", "B.", "[C]", "(d)").
- Copy option text verbatim. Do not fix, simplify, evaluate or rewrite it. "8x" stays "8x".
- "isCorrect": set true ONLY when the document itself states the answer — an answer key, an "Answer: B" line, an asterisk, or a highlighted/bold choice. If the document does not say which option is correct, set isCorrect to false on EVERY option. Never guess. Never default to the first option.
- Skip any question with fewer than 2 options.
- "points": 1 unless the document states a mark allocation.`,
      },
      {
        role: "user",
        content: `Transcribe every multiple choice question from this document:\n\n${text.slice(0, 20000)}`,
      },
    ],
  });

  const parsed = JSON.parse(extractJsonPayload(completion.choices[0]?.message?.content?.trim() || ""));
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((q: any) => {
      const rawOpts = Array.isArray(q.options) ? q.options : [];
      const options: ParsedOption[] = rawOpts
        .map((opt: any) => ({
          text: typeof opt === "string" ? opt.trim() : String(opt?.text || "").trim(),
          //! Only trust a marked answer when the paper actually has a key.
          isCorrect:
            documentHasAnswerKey && typeof opt === "object" ? Boolean(opt?.isCorrect) : false,
        }))
        .filter((o: ParsedOption) => o.text.length > 0);

      return {
        questionText: String(q.questionText || q.question || "").trim(),
        points: typeof q.points === "number" && q.points > 0 ? q.points : 1,
        options,
        answerSource: options.some((o) => o.isCorrect) ? ("document" as const) : ("unknown" as const),
      };
    })
    .filter((q: ParsedObjectiveQuestion) => q.questionText && q.options.length >= 2);
}

/** How many questions to send to the solver in one request. */
const SOLVE_BATCH_SIZE = 10;

/**
 * Stage 2 — answer solving.
 *
 * Runs only over questions whose answer the document never stated. Uses the
 * stronger reasoning model, because these are the answers teachers will grade
 * students against.
 */
async function solveQuestionBatch(
  batch: ParsedObjectiveQuestion[]
): Promise<Map<number, number>> {
  const resolved = new Map<number, number>();
  if (batch.length === 0) return resolved;

  const prompt = batch
    .map((q, idx) => {
      const opts = q.options
        .map((o, oIdx) => `  ${String.fromCharCode(65 + oIdx)}. ${o.text}`)
        .join("\n");
      return `Question ${idx + 1}: ${q.questionText}\n${opts}`;
    })
    .join("\n\n");

  const groq = getGroqClient();
  const completion = await groq.chat.completions.create({
    model: GROQ_REASONING_MODEL,
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `You are a subject-matter expert marking an exam. For each question you are given, work out which of the listed options is the correct answer.

Return ONLY a valid JSON array, one entry per question, in the same order:
[{ "question": 1, "answer": "B" }, { "question": 2, "answer": "C" }]

Rules:
- "question" is the question number exactly as given.
- "answer" is the letter of the correct option.
- Solve the question properly before answering. For maths, actually carry out the arithmetic or algebra: "5x + 3x" is "8x", not "8" and not "15x".
- The answer must be one of the letters actually listed for that question.
- If no listed option is correct, or you genuinely cannot determine the answer, use "answer": null for that question.
- Output nothing but the JSON array.`,
      },
      { role: "user", content: prompt },
    ],
  });

  const parsed = JSON.parse(extractJsonPayload(completion.choices[0]?.message?.content?.trim() || ""));
  if (!Array.isArray(parsed)) return resolved;

  for (const entry of parsed) {
    const questionNo = Number(entry?.question);
    const rawAnswer = entry?.answer;
    if (!Number.isFinite(questionNo) || rawAnswer === null || rawAnswer === undefined) continue;

    const batchIdx = questionNo - 1;
    const question = batch[batchIdx];
    if (!question) continue;

    const answerStr = String(rawAnswer).trim().toUpperCase();
    let optionIdx = -1;

    if (/^[A-Z]$/.test(answerStr)) {
      optionIdx = answerStr.charCodeAt(0) - 65;
    } else if (/^\d+$/.test(answerStr)) {
      optionIdx = Number(answerStr) - 1;
    } else {
      // Model returned the option text instead of a letter
      optionIdx = question.options.findIndex(
        (o) => o.text.trim().toUpperCase() === answerStr
      );
    }

    if (optionIdx >= 0 && optionIdx < question.options.length) {
      resolved.set(batchIdx, optionIdx);
    }
  }

  return resolved;
}

/**
 * Fills in the correct answer for every question the document left unmarked,
 * then guarantees each question ends up with exactly one correct option.
 */
async function resolveMissingAnswers(
  questions: ParsedObjectiveQuestion[]
): Promise<ParsedObjectiveQuestion[]> {
  const pending = questions
    .map((q, idx) => ({ q, idx }))
    .filter(({ q }) => !q.options.some((o) => o.isCorrect));

  for (let i = 0; i < pending.length; i += SOLVE_BATCH_SIZE) {
    const slice = pending.slice(i, i + SOLVE_BATCH_SIZE);
    try {
      const answers = await solveQuestionBatch(slice.map((s) => s.q));
      answers.forEach((optionIdx, batchIdx) => {
        const target = slice[batchIdx];
        if (!target) return;
        target.q.options.forEach((opt, oIdx) => {
          opt.isCorrect = oIdx === optionIdx;
        });
        target.q.answerSource = "ai";
      });
    } catch (err) {
      console.warn("Groq answer solving failed for a batch, leaving for teacher review:", err);
    }
  }

  // Safety net: never hand back a question with no answer at all, but keep it
  // flagged as "unknown" so the review UI tells the teacher to check it.
  return questions.map((q) => {
    const correctCount = q.options.filter((o) => o.isCorrect).length;

    if (correctCount === 0) {
      const options = q.options.map((o, idx) => ({ ...o, isCorrect: idx === 0 }));
      return { ...q, options, answerSource: "unknown" as const };
    }

    if (correctCount > 1) {
      // Multiple flagged answers – keep only the first so grading stays sane.
      let seen = false;
      const options = q.options.map((o) => {
        const keep = o.isCorrect && !seen;
        if (keep) seen = true;
        return { ...o, isCorrect: keep };
      });
      return { ...q, options };
    }

    return { ...q, answerSource: q.answerSource || "document" };
  });
}

/**
 * Parses objective questions from text: AI transcription (regex fallback),
 * then a separate solving pass for answers the document never provided.
 */
export async function parseObjectiveQuestionsFromText(text: string): Promise<ParsedObjectiveQuestion[]> {
  if (!text || !text.trim()) {
    return [];
  }

  let questions: ParsedObjectiveQuestion[] = [];
  const documentHasAnswerKey = documentStatesAnswers(text);

  // 1. Structural extraction via Groq if the API key is configured
  try {
    questions = await extractQuestionsWithAi(text, documentHasAnswerKey);
  } catch (err) {
    console.warn("Groq AI objective extraction failed, using resilient regex parser:", err);
  }

  // 2. Fallback Resilient Regex Parser
  if (questions.length === 0) {
    questions = parseObjectiveQuestionsWithRegex(text);
  }

  if (questions.length === 0) {
    return [];
  }

  // 3. Work out answers the document did not supply
  return resolveMissingAnswers(questions);
}

/**
 * Resilient Regex & Rule-based parser for structured and semi-structured text.
 */
export function parseObjectiveQuestionsWithRegex(text: string): ParsedObjectiveQuestion[] {
  if (!text || !text.trim()) return [];

  // First, check if text is JSON
  try {
    const json = JSON.parse(text);
    if (Array.isArray(json)) {
      const questions: ParsedObjectiveQuestion[] = [];
      for (const item of json) {
        if (item.questionText || item.question) {
          const qText = String(item.questionText || item.question).trim();
          const rawOpts = Array.isArray(item.options)
            ? item.options
            : [item.optionA, item.optionB, item.optionC, item.optionD].filter(Boolean);

          const options: ParsedOption[] = rawOpts.map((o: any) => ({
            text: typeof o === "string" ? o.trim() : String(o.text || "").trim(),
            isCorrect: typeof o === "object" ? Boolean(o.isCorrect) : false,
          }));

          if (qText && options.length >= 2) {
            questions.push({
              questionText: qText,
              options,
              points: 1,
              answerSource: options.some((o) => o.isCorrect) ? "document" : "unknown",
            });
          }
        }
      }
      if (questions.length > 0) return questions;
    }
  } catch {
    // Not JSON, continue to text line parsing
  }

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const questions: ParsedObjectiveQuestion[] = [];

  let currentQuestionText = "";
  let currentOptions: ParsedOption[] = [];
  let detectedAnswer: string | null = null;

  const saveCurrentQuestion = () => {
    if (currentQuestionText && currentOptions.length >= 2) {
      //* Star-marked options count as an answer stated by the document
      let fromDocument = currentOptions.some((o) => o.isCorrect);

      if (detectedAnswer) {
        const upperAns = detectedAnswer.toUpperCase();
        let matched = false;
        currentOptions.forEach((opt, idx) => {
          const letter = String.fromCharCode(65 + idx);
          if (upperAns.includes(letter) || opt.text.toUpperCase().startsWith(upperAns)) {
            opt.isCorrect = true;
            matched = true;
          } else {
            opt.isCorrect = false;
          }
        });
        fromDocument = matched;
      }

      //! Leave options unmarked when the document never stated an answer —
      //! the AI solving pass fills these in instead of defaulting to option A.
      questions.push({
        questionText: currentQuestionText.replace(/^(?:\d+[\.\)]|Q\d+[:\.]?|Question\s+\d+[:\.]?)\s*/i, "").trim(),
        options: [...currentOptions],
        points: 1,
        answerSource: fromDocument ? "document" : "unknown",
      });
    }
    currentQuestionText = "";
    currentOptions = [];
    detectedAnswer = null;
  };

  // Regex rules
  const questionHeaderRegex = /^(?:\d+[\.\)]|Q\d+[:\.]?|Question\s+\d+[:\.]?)\s*(.+)/i;
  //! A bare "1." at the start of a line is a QUESTION number, not an option.
  //! The old pattern allowed [A-E1-5], so "2. Solve for x" was swallowed as an
  //! option and every question in a numbered paper collapsed into one item.
  //! Digit options are therefore only recognised in bracketed form: (1) or [1].
  const optionRegex = /^(?:[A-J][\.\)\:]|\([A-J0-9]\)|\[[A-J0-9]\])\s*(.+)/i;
  const answerRegex = /^(?:Answer|Ans|Correct(?:\s*Answer)?|Key)\s*[:\-]?\s*([A-J1-9])/i;
  const inlineOptionsRegex = /(?:[A-E][\.\)]|\([A-E]\))\s+([^A-E\n]+)/gi;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for Answer line
    const ansMatch = line.match(answerRegex);
    if (ansMatch) {
      detectedAnswer = ansMatch[1].trim();
      continue;
    }

    //! Question headers are matched BEFORE options. "1." and "A." are both
    //! valid line starts, and a numbered question must never be mistaken for
    //! an option — that is what merged whole papers into a single question.
    const qMatch = line.match(questionHeaderRegex);
    if (qMatch) {
      saveCurrentQuestion();
      currentQuestionText = qMatch[1].trim();

      // Check if options are inline on the next line or same line
      const inlineMatches = Array.from(line.matchAll(inlineOptionsRegex));
      if (inlineMatches.length >= 2) {
        inlineMatches.forEach((m) => {
          currentOptions.push({ text: m[1].trim(), isCorrect: false });
        });
      }
      continue;
    }

    // Check for Option line
    const optMatch = line.match(optionRegex);
    if (optMatch) {
      const isStarMarked = line.startsWith("*") || line.endsWith("*");
      const optText = optMatch[1].replace(/\*$/, "").trim();
      currentOptions.push({
        text: optText,
        isCorrect: isStarMarked,
      });
      continue;
    }

    // Check if line ends with a question mark "?" or looks like a question prompt followed by options
    const isNextLineOption = i + 1 < lines.length && optionRegex.test(lines[i + 1]);
    if ((line.endsWith("?") || isNextLineOption) && currentOptions.length === 0) {
      saveCurrentQuestion();
      currentQuestionText = line;
      continue;
    }

    // If we're building a question and options haven't started yet
    if (currentQuestionText && currentOptions.length === 0) {
      currentQuestionText += " " + line;
    }
  }

  saveCurrentQuestion();

  // If still no questions found, attempt ultra-lenient splitting on "?" or option tokens
  if (questions.length === 0 && text.trim().length > 10) {
    const fallbackQuestion = text.trim();
    const inlineMatches = Array.from(fallbackQuestion.matchAll(/(?:[A-E][\.\)]|\([A-E]\))\s*([^\n\rA-E]+)/gi));
    //! Only treat the whole document as ONE question when the option count is
    //! plausible. More than this means it is a multi-question paper that failed
    //! to split, and emitting a single 20-option question is worse than failing
    //! with a message the teacher can act on.
    if (inlineMatches.length >= 2 && inlineMatches.length <= 8) {
      const prompt = fallbackQuestion.split(/(?:[A-E][\.\)]|\([A-E]\))/i)[0].trim() || "Objective Question";
      const opts: ParsedOption[] = inlineMatches.map((m) => ({
        text: m[1].trim(),
        isCorrect: false,
      }));
      questions.push({
        questionText: prompt,
        options: opts,
        points: 1,
        answerSource: "unknown",
      });
    }
  }

  return questions;
}

/**
 * Main entrance for file parsing with CSV direct handling fallback.
 */
export async function parseObjectiveFile(file: File, buffer: Buffer): Promise<ParsedObjectiveQuestion[]> {
  const fileName = file.name.toLowerCase();

  // If CSV, try CSV structured parser first
  if (fileName.endsWith(".csv") || file.type.includes("csv")) {
    const csvQuestions = parseObjectiveQuestionsFromCsv(buffer);
    if (csvQuestions.length > 0) {
      //* Still solve any row whose answer column was missing or unmatched
      return resolveMissingAnswers(csvQuestions);
    }
  }

  const text = await extractTextFromFile(file, buffer);
  return parseObjectiveQuestionsFromText(text);
}
