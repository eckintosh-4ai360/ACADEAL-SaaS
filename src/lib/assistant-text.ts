const HTML_ENTITY_MAP: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  "#39": "'",
  bull: "•",
};

function decodeHtmlEntities(value: string) {
  return value.replace(/&([a-z0-9#]+);/gi, (match, entity) => HTML_ENTITY_MAP[entity] ?? match);
}

export function normalizeAssistantText(value: string) {
  return decodeHtmlEntities(String(value || ""))
    .replace(/\r\n/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<\/li>/gi, "")
    .replace(/<\/(p|div|section|article|header|footer|blockquote|h[1-6]|ul|ol|table|tr)>/gi, "\n")
    .replace(/<(p|div|section|article|header|footer|blockquote|h[1-6]|ul|ol|table|tr)\b[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
