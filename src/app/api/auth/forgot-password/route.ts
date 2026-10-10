import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { generateTemporaryPassword } from "@/lib/security/passwords";
import prisma from "@/lib/prisma";
import {
  normalizePhoneNumber,
  sendResetPasswordCredentialsSMS,
} from "@/lib/sms";
import { checkRateLimit } from "@/lib/rateLimiter";
import { headers } from "next/headers";
import { upsertStaffProfile } from "@/lib/staff";

const exactIdentifierMatch = (value: string) => ({
  equals: value,
  mode: "insensitive" as const,
});

type UserRole = "admin" | "teacher" | "student" | "parent";

type ResettableUser = {
  id: string;
  role: UserRole;
  userId: string;
  displayName: string;
  password: string;
  phones: string[];
};

function dedupePhones(phones: Array<string | null | undefined>) {
  const seen = new Set<string>();

  return phones.flatMap((phone) => {
    if (!phone?.trim()) {
      return [];
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone || seen.has(normalizedPhone)) {
      return [];
    }

    seen.add(normalizedPhone);
    return [normalizedPhone];
  });
}

/**
 * The old scheme was two letters taken from the user's own name, three digits
 * and the current year — roughly 900 candidates once you know who the account
 * belongs to, which is public information inside a school.
 */
function buildAutoResetPassword() {
  return generateTemporaryPassword();
}

async function findUserByUserId(identifier: string): Promise<ResettableUser | null> {
  const [admin, teacher, student, parent] = await Promise.all([
    prisma.admin.findFirst({
      where: { staffId: exactIdentifierMatch(identifier) },
      select: {
        id: true,
        staffId: true,
        name: true,
        phone: true,
        password: true,
      },
    }),
    prisma.teacher.findFirst({
      where: { staffId: exactIdentifierMatch(identifier) },
      select: {
        id: true,
        staffId: true,
        name: true,
        surname: true,
        phone: true,
        password: true,
      },
    }),
    prisma.student.findFirst({
      where: { studentId: exactIdentifierMatch(identifier) },
      select: {
        id: true,
        studentId: true,
        name: true,
        surname: true,
        phone: true,
        contactNumber: true,
        password: true,
        parent: {
          select: {
            phone: true,
          },
        },
      },
    }),
    prisma.parent.findFirst({
      where: { parentUserId: exactIdentifierMatch(identifier) },
      select: {
        id: true,
        parentUserId: true,
        name: true,
        surname: true,
        phone: true,
        password: true,
      },
    }),
  ]);

  if (admin) {
    return {
      id: admin.id,
      role: "admin",
      userId: admin.staffId,
      displayName: admin.name,
      password: admin.password,
      phones: dedupePhones([admin.phone]),
    };
  }

  if (teacher) {
    return {
      id: teacher.id,
      role: "teacher",
      userId: teacher.staffId,
      displayName: `${teacher.name} ${teacher.surname}`,
      password: teacher.password,
      phones: dedupePhones([teacher.phone]),
    };
  }

  if (student) {
    return {
      id: student.id,
      role: "student",
      userId: student.studentId,
      displayName: `${student.name} ${student.surname}`,
      password: student.password,
      phones: dedupePhones([
        student.phone,
        student.contactNumber,
        student.parent?.phone,
      ]),
    };
  }

  if (parent?.parentUserId) {
    return {
      id: parent.id,
      role: "parent",
      userId: parent.parentUserId,
      displayName: `${parent.name} ${parent.surname}`,
      password: parent.password,
      phones: dedupePhones([parent.phone]),
    };
  }

  return null;
}

async function updateUserPassword(role: UserRole, id: string, password: string) {
  switch (role) {
    case "admin":
      return prisma.$transaction(async (tx) => {
        const admin = await tx.admin.update({
          where: { id },
          data: { password },
          select: {
            id: true,
            username: true,
            staffId: true,
            password: true,
            name: true,
            email: true,
            phone: true,
            img: true,
            role: true,
            permissions: true,
          },
        });

        await upsertStaffProfile(tx, {
          staffId: admin.staffId,
          username: admin.username,
          password: admin.password,
          name: admin.name,
          surname: null,
          email: admin.email ?? null,
          phone: admin.phone ?? null,
          address: null,
          img: admin.img ?? null,
          sex: null,
          birthday: null,
          permissions: admin.permissions ?? null,
          staffType: "ADMIN",
          adminRole: admin.role,
        });

        return admin;
      });
    case "teacher":
      return prisma.$transaction(async (tx) => {
        const teacher = await tx.teacher.update({
          where: { id },
          data: { password },
          select: {
            id: true,
            username: true,
            staffId: true,
            password: true,
            name: true,
            surname: true,
            email: true,
            phone: true,
            address: true,
            img: true,
            sex: true,
            birthday: true,
            permissions: true,
          },
        });

        await upsertStaffProfile(tx, {
          staffId: teacher.staffId,
          username: teacher.username,
          password: teacher.password,
          name: teacher.name,
          surname: teacher.surname,
          email: teacher.email ?? null,
          phone: teacher.phone ?? null,
          address: teacher.address,
          img: teacher.img ?? null,
          sex: teacher.sex,
          birthday: teacher.birthday,
          permissions: teacher.permissions ?? null,
          staffType: "TEACHER",
        });

        return teacher;
      });
    case "student":
      return prisma.student.update({
        where: { id },
        data: { password },
      });
    case "parent":
      return prisma.parent.update({
        where: { id },
        data: { password },
      });
  }
}

export async function POST(request: NextRequest) {
  try {
    const headerList = await headers();
    const ip = headerList.get("x-forwarded-for")?.split(",")[0] || "unknown";

    const rateLimit = await checkRateLimit(ip, { namespace: "forgot-password" });
    if (rateLimit.limited) {
      return NextResponse.json(
        { 
          error: `Too many requests. Please try again in ${Math.ceil(rateLimit.retryAfterSeconds / 60)} minutes.`,
          retryAfter: rateLimit.retryAfterSeconds 
        },
        { 
          status: 429,
          headers: { "Retry-After": rateLimit.retryAfterSeconds.toString() }
        }
      );
    }

    const { userId, phone } = await request.json();
    const identifier = typeof userId === "string" ? userId.trim() : "";
    const phoneValue = typeof phone === "string" ? phone.trim() : "";

    if (!identifier || !phoneValue) {
      return NextResponse.json(
        { error: "User ID and phone number are required." },
        { status: 400 }
      );
    }

    const user = await findUserByUserId(identifier);

    if (!user) {
      return NextResponse.json(
        { error: "User ID and phone number do not match our records." },
        { status: 400 }
      );
    }

    const matchedPhone = normalizePhoneNumber(phoneValue);

    if (!matchedPhone || !user.phones.includes(matchedPhone)) {
      return NextResponse.json(
        { error: "User ID and phone number do not match our records." },
        { status: 400 }
      );
    }

    const newPassword = buildAutoResetPassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await updateUserPassword(user.role, user.id, hashedPassword);

    const notificationResult = await sendResetPasswordCredentialsSMS(
      matchedPhone,
      user.displayName,
      user.userId,
      newPassword
    );

    if (!notificationResult.success) {
      try {
        await updateUserPassword(user.role, user.id, user.password);
      } catch (rollbackError) {
        console.error("Failed to roll back password after notification error:", rollbackError);
      }

      return NextResponse.json(
        { error: "Password reset failed while sending the new password." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "A new password has been sent to your phone number.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
