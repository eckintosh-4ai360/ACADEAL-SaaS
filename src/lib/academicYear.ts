export type AcademicYearOption = {
  value: string;
  label: string;
  sortKey: number;
};

const DEFAULT_ACADEMIC_YEAR_SEPARATOR = "-";
const DEFAULT_GENERATED_ACADEMIC_YEAR_RANGE = 2;

function parseAcademicYear(value: string) {
  const match = value.trim().match(/(\d{4})\D+(\d{4})/);

  if (!match) {
    return null;
  }

  const startYear = Number.parseInt(match[1], 10);
  const endYear = Number.parseInt(match[2], 10);

  if (
    Number.isNaN(startYear) ||
    Number.isNaN(endYear) ||
    endYear < startYear
  ) {
    return null;
  }

  return { startYear, endYear };
}

function inferAcademicYearSeparator(value: string) {
  return value.includes("/") ? "/" : DEFAULT_ACADEMIC_YEAR_SEPARATOR;
}

function formatAcademicYearValue(startYear: number, separator: string) {
  return `${startYear}${separator}${startYear + 1}`;
}

function formatAcademicYearLabel(startYear: number) {
  return `${startYear} - ${startYear + 1}`;
}

function getFallbackAcademicYearStart() {
  const today = new Date();
  const currentYear = today.getFullYear();

  return today.getMonth() < 6 ? currentYear - 1 : currentYear;
}

export function buildAcademicYearOptions(
  values: string[],
  options?: { range?: number }
) {
  const parsedValues = values
    .map((value) => ({ raw: value.trim(), parsed: parseAcademicYear(value) }))
    .filter(
      (entry): entry is { raw: string; parsed: NonNullable<ReturnType<typeof parseAcademicYear>> } =>
        Boolean(entry.raw) && Boolean(entry.parsed)
    );

  const baseStartYear =
    parsedValues[0]?.parsed.startYear ?? getFallbackAcademicYearStart();
  const separator = inferAcademicYearSeparator(parsedValues[0]?.raw ?? "");
  const optionMap = new Map<string, AcademicYearOption>();
  const range = options?.range ?? DEFAULT_GENERATED_ACADEMIC_YEAR_RANGE;

  for (
    let startYear = baseStartYear - range;
    startYear <= baseStartYear + range;
    startYear += 1
  ) {
    const value = formatAcademicYearValue(startYear, separator);
    optionMap.set(value, {
      value,
      label: formatAcademicYearLabel(startYear),
      sortKey: startYear,
    });
  }

  for (const entry of parsedValues) {
    optionMap.set(entry.raw, {
      value: entry.raw,
      label: formatAcademicYearLabel(entry.parsed.startYear),
      sortKey: entry.parsed.startYear,
    });
  }

  return Array.from(optionMap.values()).sort(
    (left, right) => left.sortKey - right.sortKey
  );
}
