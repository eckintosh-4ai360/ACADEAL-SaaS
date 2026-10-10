import { Groq } from "groq-sdk";

let groqClient: Groq | null = null;

export const DEFAULT_GROQ_MODEL =
  process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-120b";

/**
 * Stronger model used for tasks that need actual reasoning rather than
 * text shuffling — e.g. working out the correct answer to an exam question
 * when the source document carries no answer key.
 * The small "instant" model gets simple algebra wrong far too often to be
 * trusted with answer keys that teachers will grade students against.
 */
export const GROQ_REASONING_MODEL =
  process.env.GROQ_REASONING_MODEL?.trim() || "openai/gpt-oss-120b";

export function getGroqClient() {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY?.trim();

    if (!apiKey) {
      throw new Error("GROQ_API_KEY environment variable is missing");
    }

    groqClient = new Groq({ apiKey });
  }

  return groqClient;
}
