import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { guardAdmin } from "@/lib/security/guard";
import { generateTemporaryPassword, DEFAULT_PARENT_PASSWORD } from "@/lib/security/passwords";
import { studentSchema } from "@/lib/formValidationSchemas";
import { GRADE_NAMES } from "@/lib/utils";
import { sortClassesByGrade } from "@/lib/class-management";
import { getSystemSettings } from "@/lib/settings";
import { sendParentCredentialsSMS } from "@/lib/sms";
import { sendParentCredentialsEmail } from "@/lib/email";
import { assignBilledFeesToNewStudents } from "@/lib/fee-assignment";
import { resolveCurrentAppBaseUrl } from "@/lib/app-url";
import { runAfterResponse } from "@/lib/after-response";
import {
  PARENT_USER_ID_PREFIX,
  buildSequentialId,
  parseSequentialIdValue,
} from "@/lib/userIds";

type RawImportRow = Record<string, unknown>;
type NormalizedRow = Record<string, unknown>;

interface ImportResult {
  successful: number;
  failed: number;
  errors: { row: number; message: string }[];
  /** Bills assigned to the imported students from the live term/admission bills. */
  feesAssigned?: number;
}

const FIELD_ALIASES = {
  username: ["username", "user name", "student username", "studentusername", "login"],
  password: ["password", "passcode", "pwd"],
  name: ["name", "first name", "firstname", "givenname", "student first name"],
  surname: ["surname", "last name", "lastname", "familyname", "student last name"],
  studentFullName: ["student", "student name", "fullname", "full name"],
  otherNames: ["other names", "othernames", "middle name", "middlename"],
  sex: ["sex", "gender"],
  birthday: ["birthday", "date of birth", "dob", "birth date", "birthdate"],
  classValue: ["class", "class id", "classid", "class name", "classname"],
  gradeValue: ["grade", "grade id", "gradeid", "grade name", "gradename", "grade level", "gradelevel", "level"],
  residencyStatus: ["residency status", "residencystatus", "residency", "status"],
  house: ["house"],
  email: ["email", "email address", "emailaddress", "contact email", "contactemail"],
  phone: ["phone", "student phone", "studentphone", "mobile", "telephone"],
  contact: ["contact", "contact number", "contactnumber"],
  address: ["address", "home address", "homeaddress"],
  bloodType: ["bloodtype", "blood type", "blood_group", "blood group"],
  occupation: ["occupation"],
  nhisNumber: ["nhis", "nhis number", "nhisnumber"],
  admissionDate: ["admission date", "admissiondate", "date admitted", "dateadmitted"],
  emergencyContact: ["emergency contact", "emergencycontact", "emergency phone", "emergencyphone"],
  parentId: ["parent id", "parentid"],
  parentFirstName: ["parent first name", "parentfirstname", "parent name", "parentname", "guardian name", "guardianname"],
  parentLastName: ["parent last name", "parentlastname", "guardian surname", "guardiansurname"],
  parentFullName: ["parent", "parent full name", "parentfullname", "guardian"],
  parentPhone: ["parent phone", "parentphone", "guardian phone", "guardianphone"],
  parentEmail: ["parent email", "parentemail", "guardian email", "guardianemail"],
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

const normalizeResidencyStatus = (value: string | undefined): "DAY" | "BOARDING" => {
  if (!value) return "DAY";
  const normalized = normalizeKey(value);
  if (["boarding", "boarder", "board"].includes(normalized)) return "BOARDING";
  return "DAY";
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
    .slice(0, 40);

type ClassRef = { id: number; name: string; gradeId: number };
type GradeRef = { id: number; level: number };

const buildGradeMaps = (grades: GradeRef[]) => {
  const byId = new Map<number, GradeRef>();
  const byLevel = new Map<number, GradeRef>();
  const byName = new Map<string, GradeRef>();

  for (const grade of grades) {
    byId.set(grade.id, grade);
    byLevel.set(grade.level, grade);
    byName.set(normalizeKey(`grade ${grade.level}`), grade);
    byName.set(normalizeKey(`level ${grade.level}`), grade);
    byName.set(normalizeKey(String(grade.level)), grade);

    const configuredName = GRADE_NAMES[grade.level];
    if (configuredName) {
      byName.set(normalizeKey(configuredName), grade);
    }
  }

  return { byId, byLevel, byName };
};

const buildClassMaps = (classes: ClassRef[]) => {
  const byId = new Map<number, ClassRef>();
  const byName = new Map<string, ClassRef>();

  for (const classItem of classes) {
    byId.set(classItem.id, classItem);
    byName.set(normalizeKey(classItem.name), classItem);
  }

  return { byId, byName };
};

const resolveGrade = (
  rawValue: string | undefined,
  maps: ReturnType<typeof buildGradeMaps>
): GradeRef | undefined => {
  if (!rawValue) return undefined;
  const text = rawValue.trim();
  const normalized = normalizeKey(text);

  const numeric = Number(text);
  if (!Number.isNaN(numeric)) {
    return maps.byId.get(numeric) ?? maps.byLevel.get(numeric);
  }

  const byName = maps.byName.get(normalized);
  if (byName) return byName;

  const numericInStringMatch = normalized.match(/\d+/);
  if (numericInStringMatch) {
    const number = Number(numericInStringMatch[0]);
    return maps.byId.get(number) ?? maps.byLevel.get(number);
  }

  return undefined;
};

const resolveClass = (
  rawValue: string | undefined,
  maps: ReturnType<typeof buildClassMaps>
): ClassRef | undefined => {
  if (!rawValue) return undefined;
  const text = rawValue.trim();
  const normalized = normalizeKey(text);

  const numeric = Number(text);
  if (!Number.isNaN(numeric)) {
    return maps.byId.get(numeric);
  }

  const byName = maps.byName.get(normalized);
  if (byName) return byName;

  if (normalized.startsWith("class")) {
    return maps.byName.get(normalized.slice(5));
  }

  return undefined;
};

const buildStudentIdPrefix = (initials: string) => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);
  return `${initials}${month}${year}`;
};

const nextStudentId = async (
  prefix: string,
  nextSequenceRef: { current: number }
) => {
  let candidate = `${prefix}${String(nextSequenceRef.current).padStart(3, "0")}`;

  while (await prisma.student.findUnique({ where: { studentId: candidate }, select: { id: true } })) {
    nextSequenceRef.current += 1;
    candidate = `${prefix}${String(nextSequenceRef.current).padStart(3, "0")}`;
  }

  nextSequenceRef.current += 1;
  return candidate;
};

const nextParentUserId = async (nextSequenceRef: { current: number }) => {
  let candidate = buildSequentialId(PARENT_USER_ID_PREFIX, nextSequenceRef.current);

  while (
    await prisma.parent.findFirst({
      where: { parentUserId: candidate },
      select: { id: true },
    })
  ) {
    nextSequenceRef.current += 1;
    candidate = buildSequentialId(PARENT_USER_ID_PREFIX, nextSequenceRef.current);
  }

  nextSequenceRef.current += 1;
  return candidate;
};

const resolveUniqueStudentUsername = async (
  providedUsername: string | undefined,
  name: string,
  surname: string,
  reservedUsernames: Set<string>
) => {
  const fallbackBase = `${slugify(name)}.${slugify(surname)}`.replace(/^\.+|\.+$/g, "") || "student";
  const base = sanitizeUsername(providedUsername || "") || fallbackBase;

  let candidate = base;
  let counter = 1;

  while (
    reservedUsernames.has(candidate) ||
    (await prisma.student.findUnique({ where: { username: candidate }, select: { id: true } }))
  ) {
    candidate = `${base}${counter}`;
    counter += 1;
  }

  reservedUsernames.add(candidate);
  return candidate;
};

const resolveUniqueParentUsername = async (firstName: string, phone: string) => {
  const phoneSuffix = phone.replace(/\D/g, "").slice(-4) || "0000";
  const base = sanitizeUsername(`p.${slugify(firstName)}${phoneSuffix}`) || `p.parent${phoneSuffix}`;

  let candidate = base;
  let counter = 1;

  while (await prisma.parent.findUnique({ where: { username: candidate }, select: { id: true } })) {
    candidate = `${base}${counter}`;
    counter += 1;
  }

  return candidate;
};

const MAX_IMPORT_ROWS = 1000;

//* Rows are created one at a time and each one hashes a password, so a full
//* 1000-row file needs several minutes. Credential SMS/email still go out
//* after the response, so this only covers the database work.
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const guard = await guardAdmin();
  if (!guard.ok) {
    return guard.response;
  }

  try {
    const body = (await request.json()) as { students?: RawImportRow[] };
    const students = body?.students;

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ message: "No students data provided" }, { status: 400 });
    }

    if (students.length > MAX_IMPORT_ROWS) {
      return NextResponse.json(
        {
          message: `Import is limited to ${MAX_IMPORT_ROWS} rows per request. Split the file and try again.`,
        },
        { status: 400 }
      );
    }

    const [classesResult, grades, settings] = await Promise.all([
      prisma.class.findMany({
        select: { id: true, name: true, gradeId: true },
      }),
      prisma.grade.findMany({
        select: { id: true, level: true },
        orderBy: { level: "asc" },
      }),
      getSystemSettings(),
    ]);

    const classes = sortClassesByGrade(classesResult, grades);

    if (classes.length === 0) {
      return NextResponse.json(
        {
          message:
            "No classes have been configured for this school yet. Add the school's classes first, then import students.",
        },
        { status: 400 }
      );
    }

    const classMaps = buildClassMaps(classes);
    const gradeMaps = buildGradeMaps(grades);

    const studentIdPrefix = buildStudentIdPrefix(
      settings.studentIdInitials?.trim() || "STU"
    );
    const latestStudent = await prisma.student.findFirst({
      where: { studentId: { startsWith: studentIdPrefix } },
      orderBy: { createdAt: "desc" },
      select: { studentId: true },
    });

    const nextSequenceRef = { current: 1 };
    if (latestStudent?.studentId) {
      const suffix = latestStudent.studentId.slice(studentIdPrefix.length);
      const parsedSuffix = Number.parseInt(suffix, 10);
      if (!Number.isNaN(parsedSuffix)) {
        nextSequenceRef.current = parsedSuffix + 1;
      }
    }

    const latestParent = await prisma.parent.findFirst({
      where: { parentUserId: { startsWith: PARENT_USER_ID_PREFIX } },
      orderBy: { createdAt: "desc" },
      select: { parentUserId: true },
    });

    const nextParentSequenceRef = {
      current: parseSequentialIdValue(
        latestParent?.parentUserId,
        PARENT_USER_ID_PREFIX
      ),
    };

    const result: ImportResult = {
      successful: 0,
      failed: 0,
      errors: [],
    };

    const gradeLevelById = new Map(grades.map((grade) => [grade.id, grade.level]));
    const admittedStudents: { id: string; classId: number; gradeLevel: number }[] = [];

    const reservedUsernames = new Set<string>();
    const reservedEmails = new Set<string>();
    const reservedPhones = new Set<string>();

    for (let i = 0; i < students.length; i++) {
      const rowNumber = i + 2;
      const rawRow = students[i];

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
        const studentFullName = pickValue(row, FIELD_ALIASES.studentFullName);
        if ((!name || !surname) && studentFullName) {
          const split = splitFullName(studentFullName);
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
            message: "Missing required student names (name and surname)",
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

        const classInput = pickValue(row, FIELD_ALIASES.classValue);
        const classRecord = resolveClass(classInput, classMaps);
        if (!classRecord) {
          result.errors.push({
            row: rowNumber,
            message: "Missing or invalid class (use class name or class ID)",
          });
          result.failed += 1;
          continue;
        }

        const gradeInput = pickValue(row, FIELD_ALIASES.gradeValue);
        const resolvedGrade = resolveGrade(gradeInput, gradeMaps);
        const gradeId = resolvedGrade?.id ?? classRecord.gradeId;

        if (!gradeId) {
          result.errors.push({
            row: rowNumber,
            message: "Missing or invalid grade (use grade name/level or grade ID)",
          });
          result.failed += 1;
          continue;
        }

        if (resolvedGrade && resolvedGrade.id !== classRecord.gradeId) {
          result.errors.push({
            row: rowNumber,
            message: "Class and grade do not match each other",
          });
          result.failed += 1;
          continue;
        }

        const residencyStatus = normalizeResidencyStatus(pickValue(row, FIELD_ALIASES.residencyStatus));

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

          const existingEmail = await prisma.student.findUnique({
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

          const existingPhone = await prisma.student.findUnique({
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

        let parentFirstName = pickValue(row, FIELD_ALIASES.parentFirstName);
        let parentLastName = pickValue(row, FIELD_ALIASES.parentLastName);
        const parentFullName = pickValue(row, FIELD_ALIASES.parentFullName);
        if ((!parentFirstName || !parentLastName) && parentFullName) {
          const splitParent = splitFullName(parentFullName);
          parentFirstName = parentFirstName || splitParent.firstName;
          parentLastName = parentLastName || splitParent.lastName;
        }
        if (parentFirstName && !parentLastName && parentFirstName.includes(" ")) {
          const splitParent = splitFullName(parentFirstName);
          parentFirstName = splitParent.firstName;
          parentLastName = splitParent.lastName;
        }

        const parentIdInput = pickValue(row, FIELD_ALIASES.parentId);
        const parentPhone = pickValue(row, FIELD_ALIASES.parentPhone);
        const parentEmail = pickValue(row, FIELD_ALIASES.parentEmail)?.toLowerCase();

        let parentId: string | undefined;
        let resolvedParentPhone = parentPhone;
        let resolvedParentEmail: string | undefined = parentEmail;
        let resolvedParentName: string | undefined;
        let resolvedParentUserId: string | undefined;
        const plaintextParentPassword = DEFAULT_PARENT_PASSWORD;
        let isNewParent = false;

        if (parentIdInput) {
          const existingParent = await prisma.parent.findUnique({
            where: { id: parentIdInput },
            select: { id: true, name: true, surname: true, phone: true },
          });
          if (!existingParent) {
            result.errors.push({
              row: rowNumber,
              message: `Parent with ID '${parentIdInput}' not found`,
            });
            result.failed += 1;
            continue;
          }
          parentId = existingParent.id;
          parentFirstName = parentFirstName || existingParent.name;
          parentLastName = parentLastName || existingParent.surname;
          resolvedParentPhone = resolvedParentPhone || existingParent.phone;
        } else if (parentPhone) {
          const existingByPhone = await prisma.parent.findFirst({
            where: { phone: parentPhone },
            select: { id: true, name: true, surname: true, phone: true },
          });

          if (existingByPhone) {
            parentId = existingByPhone.id;
            parentFirstName = parentFirstName || existingByPhone.name;
            parentLastName = parentLastName || existingByPhone.surname;
            resolvedParentPhone = resolvedParentPhone || existingByPhone.phone;
          } else if (parentFirstName && parentLastName) {
            const parentUsername = await resolveUniqueParentUsername(parentFirstName, parentPhone);
            const hashedParentPwd = await bcrypt.hash(plaintextParentPassword, 10);
            const parentUserId = await nextParentUserId(nextParentSequenceRef);
            const parentAddress = pickValue(row, FIELD_ALIASES.address) || "";
            const createdParent = await prisma.parent.create({
              data: {
                username: parentUsername,
                parentUserId,
                password: hashedParentPwd,
                name: parentFirstName,
                surname: parentLastName,
                phone: parentPhone,
                email: parentEmail || null,
                address: parentAddress,
                isProfileComplete: true,
              },
              select: { id: true },
            });
            parentId = createdParent.id;
            resolvedParentUserId = parentUserId;
            resolvedParentEmail = resolvedParentEmail || parentEmail;
            resolvedParentName = `${parentFirstName} ${parentLastName}`;
            isNewParent = true;
          } else {
            result.errors.push({
              row: rowNumber,
              message: "Parent phone provided, but parent first/last name is missing",
            });
            result.failed += 1;
            continue;
          }
        } else if (parentFirstName && parentLastName) {
          const existingByName = await prisma.parent.findFirst({
            where: {
              name: parentFirstName,
              surname: parentLastName,
            },
            select: { id: true, phone: true },
          });
          if (existingByName) {
            parentId = existingByName.id;
            resolvedParentPhone = resolvedParentPhone || existingByName.phone;
          }
        }

        const providedUsername = pickValue(row, FIELD_ALIASES.username);
        const username = await resolveUniqueStudentUsername(
          providedUsername,
          name,
          surname,
          reservedUsernames
        );

        const password = pickValue(row, FIELD_ALIASES.password) || generateTemporaryPassword();
        const hashedPassword = await bcrypt.hash(password, 10);
        const studentId = await nextStudentId(studentIdPrefix, nextSequenceRef);

        const otherNames = pickValue(row, FIELD_ALIASES.otherNames);
        const house = pickValue(row, FIELD_ALIASES.house);
        const occupation = pickValue(row, FIELD_ALIASES.occupation);
        const nhisNumber = pickValue(row, FIELD_ALIASES.nhisNumber);
        const emergencyContact = pickValue(row, FIELD_ALIASES.emergencyContact);
        const address = pickValue(row, FIELD_ALIASES.address);
        const bloodType = pickValue(row, FIELD_ALIASES.bloodType);
        const admissionDateInput =
          pickValue(row, FIELD_ALIASES.admissionDate) ??
          row[normalizeKey(FIELD_ALIASES.admissionDate[0])];
        const admissionDate = parseDateValue(admissionDateInput) ?? null;

        const explicitContactValue = pickValue(row, FIELD_ALIASES.contact);
        const explicitContactNumber =
          explicitContactValue && !explicitContactValue.includes("@")
            ? explicitContactValue
            : undefined;

        const guardianName =
          parentFirstName || parentLastName
            ? `${parentFirstName || ""} ${parentLastName || ""}`.trim()
            : undefined;
        const contactNumber = explicitContactNumber || resolvedParentPhone;

        const validated = studentSchema.safeParse({
          username,
          password: "",
          address: address || "",
          bloodType: bloodType || "",
          phone: normalizedPhone,
          parentType: parentId ? "existing" : "new",
          parentId,
          parentName: parentFirstName,
          parentSurname: parentLastName,
          parentPhone: resolvedParentPhone,
          parentEmail,
          name,
          surname,
          otherNames: otherNames || "",
          sex,
          birthday,
          gradeId,
          classId: classRecord.id,
          residencyStatus,
          house: house || "",
          guardianName: guardianName || "",
          contactNumber: contactNumber || "",
          email: normalizedEmail || "",
          occupation: occupation || "",
          nhisNumber: nhisNumber || "",
          admissionDate,
          emergencyContact: emergencyContact || "",
        });

        if (!validated.success) {
          result.errors.push({
            row: rowNumber,
            message: validated.error.issues[0]?.message || "Row failed student validation",
          });
          result.failed += 1;
          continue;
        }

        const createdStudent = await prisma.student.create({
          data: {
            username: validated.data.username || username,
            studentId,
            password: hashedPassword,
            name: validated.data.name,
            surname: validated.data.surname,
            otherNames: validated.data.otherNames || null,
            email: normalizedEmail || null,
            phone: normalizedPhone || null,
            address: address || "",
            bloodType: bloodType || null,
            sex: validated.data.sex,
            birthday: validated.data.birthday,
            residencyStatus: validated.data.residencyStatus,
            house: validated.data.house || null,
            guardianName: validated.data.guardianName || null,
            contactNumber: validated.data.contactNumber || null,
            occupation: validated.data.occupation || null,
            nhisNumber: validated.data.nhisNumber || null,
            admissionDate: validated.data.admissionDate || null,
            emergencyContact: validated.data.emergencyContact || null,
            parentId: parentId || null,
            classId: validated.data.classId,
            gradeId: validated.data.gradeId,
          },
        });

        const importedGradeLevel = gradeLevelById.get(validated.data.gradeId);
        if (importedGradeLevel !== undefined) {
          admittedStudents.push({
            id: createdStudent.id,
            classId: validated.data.classId,
            gradeLevel: importedGradeLevel,
          });
        }

        //* Credentials go out after the response, kept alive by after().
        if (resolvedParentPhone || resolvedParentEmail) {
          const studentFullName = `${validated.data.name} ${validated.data.surname}`;
          const finalParentUserId = resolvedParentUserId ||
            (parentId ? (await prisma.parent.findUnique({ where: { id: parentId }, select: { parentUserId: true } }))?.parentUserId ?? "" : "");
          const finalParentName = resolvedParentName ||
            (parentFirstName ? `${parentFirstName} ${parentLastName ?? ""}`.trim() : "Parent");

          runAfterResponse("IMPORT CREDENTIALS", async () => {
            try {
              const rawAppUrl = settings.publicAppUrl || await resolveCurrentAppBaseUrl();
              const appUrl = rawAppUrl.replace(/\/+$/, "");
              const loginUrl = `${appUrl}/login`;
              const credStudents = [{ studentName: studentFullName, studentId, password }];

              if (resolvedParentPhone) {
                await sendParentCredentialsSMS({
                  parentPhone: resolvedParentPhone,
                  parentName: finalParentName,
                  parentUserId: finalParentUserId,
                  parentPassword: isNewParent ? plaintextParentPassword : "(existing — contact school)",
                  schoolName: settings.schoolName || "our school",
                  schoolPhone: settings.schoolPhone || "the school office",
                  publicAppUrl: appUrl,
                  students: credStudents,
                  loginUrl,
                });
              }
              if (resolvedParentEmail) {
                await sendParentCredentialsEmail({
                  parentEmail: resolvedParentEmail,
                  parentName: finalParentName,
                  parentUserId: finalParentUserId,
                  parentPassword: isNewParent ? plaintextParentPassword : "(existing — contact school)",
                  students: credStudents,
                });
              }
            } catch (notifyErr) {
              console.error(`[IMPORT CREDENTIALS] row ${rowNumber}:`, notifyErr);
            }
          });
        }

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

    //* Imported students join a term that is usually already billed, so give
    //* them the same term and admission bills their class already carries.
    //* A billing failure must not turn a successful import into an error.
    try {
      const billing = await assignBilledFeesToNewStudents(admittedStudents);
      result.feesAssigned = billing.termFeesCreated + billing.admissionFeesCreated;
    } catch (billingError) {
      console.error("[IMPORT FEES] Failed to assign bills to imported students:", billingError);
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ message: "Failed to process import request" }, { status: 500 });
  }
}
