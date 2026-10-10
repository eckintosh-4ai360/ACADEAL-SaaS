/**
 * Canonical term values used throughout the fee system.
 *
 * The settings page allows free-form text for `currentTerm`, so admins may type
 * "First Term", "Third Term", "Term Three", "3", etc.  Every place that reads
 * `settings.currentTerm` for filtering or comparison must first run the value
 * through `normalizeTermValue()` to get one of the three canonical values.
 */

export const CANONICAL_TERMS = ["One", "Two", "Three"] as const;
export type CanonicalTerm = (typeof CANONICAL_TERMS)[number];

const TERM_MAP: Record<string, CanonicalTerm> = {
  // Short words
  one: "One",
  two: "Two",
  three: "Three",

  // "First Term", "Second Term", "Third Term"
  "first term": "One",
  "second term": "Two",
  "third term": "Three",
  first: "One",
  second: "Two",
  third: "Three",

  // "Term One", "Term Two", "Term Three"
  "term one": "One",
  "term two": "Two",
  "term three": "Three",

  // "Term 1", "Term 2", "Term 3"
  "term 1": "One",
  "term 2": "Two",
  "term 3": "Three",

  // Numeric
  "1": "One",
  "2": "Two",
  "3": "Three",
};

/**
 * Normalize any term string the admin may have typed into the canonical short
 * form used by the fee system: `"One"`, `"Two"`, or `"Three"`.
 *
 * If the value is already canonical it is returned as-is.  Unknown values fall
 * back to `"One"`.
 */
export function normalizeTermValue(raw: string | null | undefined): CanonicalTerm {
  const trimmed = (raw ?? "").trim().toLowerCase();

  if (!trimmed) {
    return "One";
  }

  return TERM_MAP[trimmed] ?? "One";
}

/**
 * Format a canonical term value (or any recognized variant) into a
 * human-readable display label: `"Term One"`, `"Term Two"`, `"Term Three"`.
 */
export function formatTermLabel(raw: string | null | undefined): string {
  const canonical = normalizeTermValue(raw);

  return `Term ${canonical}`;
}
