import { NotificationType, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { isMissingDatabaseObjectError } from "@/lib/prisma-errors";

export type BirthdayCelebrantType = "STUDENT" | "STAFF";

export type BirthdayCelebrant = {
  id: string;
  name: string;
  type: BirthdayCelebrantType;
  detail: string;
  /** The person who will receive a birthday SMS, when one is available. */
  smsRecipient: {
    phone: string;
    label: string;
  } | null;
};

type BirthdayStaffRecord = {
  id: string;
  name: string;
  surname: string | null;
  birthday: Date | null;
  phone: string | null;
  staffType: "ADMIN" | "TEACHER";
};

function isBirthdayToday(birthday: Date | null, today: Date) {
  if (!birthday) return false;

  // Birthdays are calendar dates. Comparing their UTC date portions prevents
  // server-local time from moving a birthday to the previous/next day.
  return (
    birthday.getUTCMonth() === today.getUTCMonth() &&
    birthday.getUTCDate() === today.getUTCDate()
  );
}

function fullName(name: string, surname?: string | null) {
  return [name, surname].filter(Boolean).join(" ").trim();
}

function birthdayAlertId(celebrant: BirthdayCelebrant, today: Date) {
  const date = [
    today.getUTCFullYear(),
    String(today.getUTCMonth() + 1).padStart(2, "0"),
    String(today.getUTCDate()).padStart(2, "0"),
  ].join("-");

  return `birthday:${date}:${celebrant.type}:${celebrant.id}`;
}

function utcDayRange(today: Date) {
  const start = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

async function loadBirthdayStaff(): Promise<BirthdayStaffRecord[]> {
  try {
    const staff = await prisma.staff.findMany({
      select: {
        id: true,
        name: true,
        surname: true,
        birthday: true,
        phone: true,
        staffType: true,
      },
    });

    return staff;
  } catch (error) {
    // Older tenant databases can still be on the pre-unified staff schema.
    // Fall back to the original tables instead of hiding birthdays entirely.
    if (!isMissingDatabaseObjectError(error)) throw error;

    const [teachers, admins] = await Promise.all([
      prisma.teacher.findMany({
        select: {
          id: true,
          name: true,
          surname: true,
          birthday: true,
          phone: true,
        },
      }),
      prisma.admin.findMany({
        select: {
          id: true,
          name: true,
          phone: true,
        },
      }),
    ]);

    return [
      ...teachers.map((teacher) => ({ ...teacher, staffType: "TEACHER" as const })),
      // Legacy admin records did not store birthday information, so they
      // cannot appear until their staff profile has been migrated.
      ...admins.map((admin) => ({
        ...admin,
        surname: null,
        birthday: null,
        staffType: "ADMIN" as const,
      })),
    ];
  }
}

/** Returns the students and staff members celebrating their birthday today. */
export async function getTodaysBirthdays(today = new Date()): Promise<BirthdayCelebrant[]> {
  const [students, staff] = await Promise.all([
    prisma.student.findMany({
      select: {
        id: true,
        name: true,
        surname: true,
        birthday: true,
        phone: true,
        contactNumber: true,
        parent: {
          select: {
            phone: true,
          },
        },
        class: {
          select: {
            name: true,
          },
        },
      },
    }),
    loadBirthdayStaff(),
  ]);

  const studentCelebrants = students
    .filter((student) => isBirthdayToday(student.birthday, today))
    .map<BirthdayCelebrant>((student) => {
      const parentPhone = student.parent?.phone || student.contactNumber;
      const phone = parentPhone || student.phone;

      return {
        id: student.id,
        name: fullName(student.name, student.surname),
        type: "STUDENT",
        detail: student.class.name,
        smsRecipient: phone
          ? {
              phone,
              label: parentPhone ? "Parent / guardian" : "Student",
            }
          : null,
      };
    });

  const staffCelebrants = staff
    .filter((member) => isBirthdayToday(member.birthday, today))
    .map<BirthdayCelebrant>((member) => ({
      id: member.id,
      name: fullName(member.name, member.surname),
      type: "STAFF",
      detail: member.staffType === "ADMIN" ? "Administrator" : "Teacher",
      smsRecipient: member.phone
        ? {
            phone: member.phone,
            label: "Staff member",
          }
        : null,
    }));

  return [...studentCelebrants, ...staffCelebrants].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

/**
 * Creates one in-app alert per administrator and celebrant each day. The
 * dashboard can render repeatedly without producing duplicate alerts.
 */
export async function ensureBirthdayNotifications(
  celebrants: BirthdayCelebrant[],
  today = new Date()
) {
  if (celebrants.length === 0) return;

  const admins = await prisma.admin.findMany({ select: { id: true } });
  if (admins.length === 0) return;

  const { start, end } = utcDayRange(today);
  const existing = await prisma.notification.findMany({
    where: {
      recipientId: { in: admins.map((admin) => admin.id) },
      type: NotificationType.GENERAL,
      sentAt: { gte: start, lt: end },
    },
    select: {
      recipientId: true,
      metadata: true,
    },
  });

  const sent = new Set(
    existing.flatMap((notification) => {
      const metadata = notification.metadata as Record<string, unknown> | null;
      const alertId = metadata?.birthdayAlertId;
      return typeof alertId === "string" && notification.recipientId
        ? [`${notification.recipientId}:${alertId}`]
        : [];
    })
  );

  const notifications = admins.flatMap((admin) =>
    celebrants.flatMap((celebrant) => {
      const alertId = birthdayAlertId(celebrant, today);
      if (sent.has(`${admin.id}:${alertId}`)) return [];

      return [
        {
          title: `Birthday today: ${celebrant.name}`,
          message: `${celebrant.name} (${celebrant.type === "STUDENT" ? "student" : celebrant.detail.toLowerCase()}) is celebrating a birthday today.`,
          type: NotificationType.GENERAL,
          recipientId: admin.id,
          recipientType: "ADMIN" as const,
          metadata: {
            category: "BIRTHDAY",
            birthdayAlertId: alertId,
            celebrantId: celebrant.id,
            celebrantType: celebrant.type,
          } as Prisma.InputJsonValue,
        },
      ];
    })
  );

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications });
  }
}
