import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { teacherSchema } from "@/lib/formValidationSchemas";
import prisma from "@/lib/prisma";
import {
  TEACHER_STAFF_ID_PREFIX,
  buildSequentialId,
  parseSequentialIdValue,
} from "@/lib/userIds";
import { writeServerAuditLog } from "@/lib/audit-server";
import { upsertStaffProfile } from "@/lib/staff";
import { generateTemporaryPassword } from "@/lib/security/passwords";

type RawImportRow = Record<string, unknown>;
type NormalizedRow = Record<string, unknown>;
type SubjectRef = { id: number; name: string };

interface ImportResult {
  successful: number;
  failed: number;
  errors: { row: number; message: string }[];
}

const FIELD_ALIASES = {
  username: ["username", "user name", "teacher username", "teacherusername", "login"],
  password: ["password", "passcode", "pwd"],
  name: ["name", "first name", "firstname", "givenname", "teacher first name"],
  surname: ["surname", "last name", "lastname", "familyname", "teacher last name"],
  teacherFullName: ["teacher", "teacher name", "full name", "fullname"],
  sex: ["sex", "gender"],
  birthday: ["birthday", "date of birth", "dob", "birth date", "birthdate"],
  address: ["address", "home address", "residential address", "residentialaddress"],
  email: ["email", "email address", "emailaddress", "contact email", "contactemail"],
  phone: ["phone", "teacher phone", "teacherphone", "mobile", "telephone"],
  contact: ["contact", "contact number", "contactnumber"],
  subjects: ["subjects", "subject", "subject name", "subject names", "subjectname", "subjectnames"],
  subjectIds: ["subject ids", "subjectids", "subject id", "subjectid"],
} as const;

const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);

const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const toText = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
};

const normalizeRow = (row: RawImportRow): NormalizedRow => {
  const normalized: NormalizedRow = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[normalizeKey(key)] = value;
  }
  return normalized;
};

const pickValue = (row: NormalizedRow, aliases: readonly string[]): string | undefined => {
  for (const alias of aliases) {
    const value = row[normalizeKey(alias)];
    const text = toText(value);
    if (text !== undefined) {
      return text;
    }
  }
  return undefined;
};

const splitFullName = (fullName: string): { firstName: string; lastName: string } => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
};

const toExcelDate = (serial: number): Date | undefined => {
  if (!Number.isFinite(serial)) return undefined;
  const date = new Date(EXCEL_EPOCH_UTC + serial * 24 * 60 * 60 * 1000);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const parseDateValue = (value: unknown): Date | undefined => {
  if (value === null || value === undefined || value === "") return undefined;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }

  if (typeof value === "number") {
    return toExcelDate(value);
  }

  const text = toText(value);
  if (!text) return undefined;

  if (/^\d+(\.\d+)?$/.test(text)) {
    const numeric = Number(text);
    if (numeric > 20000 && numeric < 80000) {
      return toExcelDate(numeric);
    }
  }

  const ddMmYyyy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (ddMmYyyy) {
    const day = Number(ddMmYyyy[1]);
    const month = Number(ddMmYyyy[2]);
    const year = Number(ddMmYyyy[3]);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date;
    }
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const normalizeSex = (value: string | undefined): "MALE" | "FEMALE" | undefined => {
  if (!value) return undefined;
  const normalized = normalizeKey(value);
  if (["male", "m", "boy"].includes(normalized)) return "MALE";
  if (["female", "f", "girl"].includes(normalized)) return "FEMALE";
  return undefined;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 30);

const sanitizeUsername = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 20);

const splitListValue = (value: string | undefined) =>
  (value || "")
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean);

const buildSubjectMaps = (subjects: SubjectRef[]) => {
  const byId = new Map<number, SubjectRef>();
  const byName = new Map<string, SubjectRef>();

  for (const subject of subjects) {
    byId.set(subject.id, subject);
    byName.set(normalizeKey(subject.name), subject);
  }

  return { byId, byName };
};

const resolveSubjects = (
  subjectNamesValue: string | undefined,
  subjectIdsValue: string | undefined,
  subjectMaps: ReturnType<typeof buildSubjectMaps>
) => {
  const tokens = [...splitListValue(subjectNamesValue), ...splitListValue(subjectIdsValue)];
  const subjectIds = new Set<string>();
  const invalidTokens: string[] = [];

  for (const token of tokens) {
    const normalizedToken = normalizeKey(token);
    if (!normalizedToken) continue;

    const numericToken = Number(token);
    const byId = !Number.isNaN(numericToken) ? subjectMaps.byId.get(numericToken) : undefined;
    const byName = subjectMaps.byName.get(normalizedToken);
    const subject = byId ?? byName;

    if (!subject) {
      invalidTokens.push(token);
      continue;
    }

    subjectIds.add(String(subject.id));
  }

  return {
    subjectIds: Array.from(subjectIds),
    invalidTokens,
  };
};

const nextTeacherStaffId = async (nextSequenceRef: { current: number }) => {
  let candidate = buildSequentialId(TEACHER_STAFF_ID_PREFIX, nextSequenceRef.current);

  while (await prisma.teacher.findUnique({ where: { staffId: candidate }, select: { id: true } })) {
    nextSequenceRef.current += 1;
    candidate = buildSequentialId(TEACHER_STAFF_ID_PREFIX, nextSequenceRef.current);
  }

  nextSequenceRef.current += 1;
  return candidate;
};

const resolveUniqueTeacherUsername = async (
  providedUsername: string | undefined,
  name: string,
  surname: string,
  reservedUsernames: Set<string>
) => {
  const fallbackBase = `${slugify(name)}.${slugify(surname)}`.replace(/^\.+|\.+$/g, "") || "teacher";
  const base = sanitizeUsername(providedUsername || "") || fallbackBase;

  let candidate = base;
  let counter = 1;

  while (
    reservedUsernames.has(candidate) ||
    (await prisma.teacher.findUnique({ where: { username: candidate }, select: { id: true } }))
  ) {
    const suffix = String(counter);
    const trimmedBase = base.slice(0, Math.max(1, 20 - suffix.length));
    candidate = sanitizeUsername(`${trimmedBase}${suffix}`) || `teacher${suffix}`;
    counter += 1;
  }

  reservedUsernames.add(candidate);
  return candidate;
};

export async function POST(request: NextRequest) {
  const startedAt = Date.now();

  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { teachers?: RawImportRow[] };
    const teachers = body?.teachers;

    if (!Array.isArray(teachers) || teachers.length === 0) {
      return NextResponse.json({ message: "No teachers data provided" }, { status: 400 });
    }

    const subjects = await prisma.subject.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    const subjectMaps = buildSubjectMaps(subjects);

    const latestTeacher = await prisma.teacher.findFirst({
      where: { staffId: { startsWith: TEACHER_STAFF_ID_PREFIX } },
      orderBy: { createdAt: "desc" },
      select: { staffId: true },
    });

    const nextSequenceRef = {
      current: parseSequentialIdValue(
        latestTeacher?.staffId,
        TEACHER_STAFF_ID_PREFIX
      ),
    };

    const result: ImportResult = {
      successful: 0,
      failed: 0,
      errors: [],
    };

    const reservedUsernames = new Set<string>();
    const reservedEmails = new Set<string>();
    const reservedPhones = new Set<string>();

    for (let i = 0; i < teachers.length; i++) {
      const rowNumber = i + 2;
      const rawRow = teachers[i];

      if (!rawRow || typeof rawRow !== "object") {
        result.errors.push({
          row: rowNumber,
          message: "Invalid row data format",
        });
        result.failed += 1;
        continue;
      }

      try {
        const row = normalizeRow(rawRow);

        let name = pickValue(row, FIELD_ALIASES.name);
        let surname = pickValue(row, FIELD_ALIASES.surname);
        const teacherFullName = pickValue(row, FIELD_ALIASES.teacherFullName);

        if ((!name || !surname) && teacherFullName) {
          const split = splitFullName(teacherFullName);
          name = name || split.firstName;
          surname = surname || split.lastName;
        }

        if (name && !surname && name.includes(" ")) {
          const split = splitFullName(name);
          name = split.firstName;
          surname = split.lastName;
        }

        if (!name || !surname) {
          result.errors.push({
            row: rowNumber,
            message: "Missing required teacher names (name and surname)",
          });
          result.failed += 1;
          continue;
        }

        const sex = normalizeSex(pickValue(row, FIELD_ALIASES.sex));
        if (!sex) {
          result.errors.push({
            row: rowNumber,
            message: "Missing or invalid sex/gender (use MALE/FEMALE)",
          });
          result.failed += 1;
          continue;
        }

        const birthdayInput =
          pickValue(row, FIELD_ALIASES.birthday) ??
          row[normalizeKey(FIELD_ALIASES.birthday[0])];
        const birthday = parseDateValue(birthdayInput);
        if (!birthday) {
          result.errors.push({
            row: rowNumber,
            message: "Missing or invalid birthday/date of birth",
          });
          result.failed += 1;
          continue;
        }

        const address = pickValue(row, FIELD_ALIASES.address);
        if (!address) {
          result.errors.push({
            row: rowNumber,
            message: "Missing required address",
          });
          result.failed += 1;
          continue;
        }

        const contactFallback = pickValue(row, FIELD_ALIASES.contact);
        let email = pickValue(row, FIELD_ALIASES.email);
        let phone = pickValue(row, FIELD_ALIASES.phone);

        if (contactFallback && !email && !phone) {
          if (contactFallback.includes("@")) {
            email = contactFallback;
          } else {
            phone = contactFallback;
          }
        }

        const normalizedEmail = email?.toLowerCase();
        if (normalizedEmail) {
          if (reservedEmails.has(normalizedEmail)) {
            result.errors.push({
              row: rowNumber,
              message: `Email '${normalizedEmail}' appears more than once in the file`,
            });
            result.failed += 1;
            continue;
          }

          const existingEmail = await prisma.teacher.findUnique({
            where: { email: normalizedEmail },
            select: { id: true },
          });
          if (existingEmail) {
            result.errors.push({
              row: rowNumber,
              message: `Email '${normalizedEmail}' already exists`,
            });
            result.failed += 1;
            continue;
          }

          reservedEmails.add(normalizedEmail);
        }

        const normalizedPhone = phone?.trim();
        if (normalizedPhone) {
          if (reservedPhones.has(normalizedPhone)) {
            result.errors.push({
              row: rowNumber,
              message: `Phone '${normalizedPhone}' appears more than once in the file`,
            });
            result.failed += 1;
            continue;
          }

          const existingPhone = await prisma.teacher.findUnique({
            where: { phone: normalizedPhone },
            select: { id: true },
          });
          if (existingPhone) {
            result.errors.push({
              row: rowNumber,
              message: `Phone '${normalizedPhone}' already exists`,
            });
            result.failed += 1;
            continue;
          }

          reservedPhones.add(normalizedPhone);
        }

        const resolvedSubjects = resolveSubjects(
          pickValue(row, FIELD_ALIASES.subjects),
          pickValue(row, FIELD_ALIASES.subjectIds),
          subjectMaps
        );

        if (resolvedSubjects.invalidTokens.length > 0) {
          result.errors.push({
            row: rowNumber,
            message: `Unknown subjects: ${resolvedSubjects.invalidTokens.join(", ")}`,
          });
          result.failed += 1;
          continue;
        }

        const username = await resolveUniqueTeacherUsername(
          pickValue(row, FIELD_ALIASES.username),
          name,
          surname,
          reservedUsernames
        );

        const password = pickValue(row, FIELD_ALIASES.password) || generateTemporaryPassword();
        const validated = teacherSchema.safeParse({
          username,
          password,
          name,
          surname,
          email: normalizedEmail || "",
          phone: normalizedPhone,
          address,
          birthday,
          sex,
          subjects: resolvedSubjects.subjectIds,
        });

        if (!validated.success) {
          result.errors.push({
            row: rowNumber,
            message: validated.error.issues[0]?.message || "Row failed teacher validation",
          });
          result.failed += 1;
          continue;
        }

        const staffId = await nextTeacherStaffId(nextSequenceRef);
        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.$transaction(async (tx) => {
          const staffProfile = await upsertStaffProfile(tx, {
            staffId,
            username: validated.data.username,
            password: hashedPassword,
            name: validated.data.name,
            surname: validated.data.surname,
            email: normalizedEmail || null,
            phone: normalizedPhone || null,
            address: validated.data.address,
            img: null,
            sex: validated.data.sex,
            birthday: validated.data.birthday,
            permissions: null,
            staffType: "TEACHER",
          });

          await tx.teacher.create({
            data: {
              username: validated.data.username,
              staffId,
              ...(staffProfile ? { staffProfileId: staffProfile.id } : {}),
              password: hashedPassword,
              name: validated.data.name,
              surname: validated.data.surname,
              email: normalizedEmail || null,
              phone: normalizedPhone || null,
              address: validated.data.address,
              img: null,
              sex: validated.data.sex,
              birthday: validated.data.birthday,
              subjects: {
                connect: resolvedSubjects.subjectIds.map((subjectId) => ({
                  id: Number(subjectId),
                })),
              },
            },
          });
        });

        result.successful += 1;
      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        result.errors.push({
          row: rowNumber,
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
        result.failed += 1;
      }
    }

    if (result.successful > 0) {
      revalidatePath("/dashboard/teachers");
    }

    await writeServerAuditLog({
      action: "teacher.import",
      category: "user_management",
      status: result.successful > 0 ? "SUCCESS" : "FAILURE",
      summary: `Imported teachers: ${result.successful} successful, ${result.failed} failed`,
      metadata: {
        totalRows: teachers.length,
        successful: result.successful,
        failed: result.failed,
      },
      durationMs: Date.now() - startedAt,
      source: "route_handler",
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Teacher import error:", error);

    await writeServerAuditLog({
      action: "teacher.import",
      category: "user_management",
      status: "FAILURE",
      summary: "Teacher import request failed before processing completed",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
      durationMs: Date.now() - startedAt,
      source: "route_handler",
    });

    return NextResponse.json({ message: "Failed to process import request" }, { status: 500 });
  }
}
