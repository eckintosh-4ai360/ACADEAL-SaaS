import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTodaysBirthdays, type BirthdayCelebrantType } from "@/lib/birthdays";
import prisma from "@/lib/prisma";
import { getSystemSettings } from "@/lib/settings";
import { sendSMS } from "@/lib/sms";

export const maxDuration = 60;

type SessionUser = {
  name?: string | null;
  email?: string | null;
  role?: string;
};

function isCelebrantType(value: unknown): value is BirthdayCelebrantType {
  return value === "STUDENT" || value === "STAFF";
}

function birthdayLogRecipient(type: BirthdayCelebrantType, id: string) {
  return `Birthday notification [${type}:${id}]`;
}

function utcDayRange(today: Date) {
  const start = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as SessionUser | undefined;

    if (!session?.user || sessionUser?.role !== "admin") {
      return NextResponse.json({ error: "Only administrators can send birthday SMS messages." }, { status: 403 });
    }

    const body = await request.json();
    const celebrantId = typeof body.celebrantId === "string" ? body.celebrantId : "";
    const celebrantType = body.celebrantType;

    if (!celebrantId || !isCelebrantType(celebrantType)) {
      return NextResponse.json({ error: "A valid birthday celebrant is required." }, { status: 400 });
    }

    // Looking the person up from today's server-side birthday list prevents
    // sending to arbitrary records or to a birthday that is not today.
    const celebrant = (await getTodaysBirthdays()).find(
      (person) => person.id === celebrantId && person.type === celebrantType
    );

    if (!celebrant) {
      return NextResponse.json({ error: "This person is not celebrating a birthday today." }, { status: 404 });
    }

    if (!celebrant.smsRecipient) {
      return NextResponse.json(
        { error: `No phone number is recorded for ${celebrant.name}'s ${celebrant.type === "STUDENT" ? "parent, guardian, or profile" : "staff profile"}.` },
        { status: 400 }
      );
    }

    const now = new Date();
    const { start, end } = utcDayRange(now);
    const recipient = birthdayLogRecipient(celebrant.type, celebrant.id);
    const alreadySent = await prisma.smsLog.findFirst({
      where: {
        recipient,
        sentAt: { gte: start, lt: end },
      },
      select: { id: true },
    });

    if (alreadySent) {
      return NextResponse.json(
        { error: `A birthday SMS has already been sent for ${celebrant.name} today.` },
        { status: 409 }
      );
    }

    const settings = await getSystemSettings();
    const schoolName = settings.schoolName || "the school";
    const message =
      `Happy birthday, ${celebrant.name}! ` +
      `Everyone at ${schoolName} wishes you a joyful day and a wonderful year ahead.`;
    const result = await sendSMS(celebrant.smsRecipient.phone, message);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "The SMS provider could not send the birthday message." },
        { status: 502 }
      );
    }

    await prisma.smsLog.create({
      data: {
        sender: sessionUser.name || sessionUser.email || "ADMIN",
        recipient,
        message: `${celebrant.name} (${celebrant.smsRecipient.label}): ${message}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Birthday SMS sent to ${celebrant.smsRecipient.label.toLowerCase()} for ${celebrant.name}.`,
    });
  } catch (error) {
    console.error("Birthday SMS error:", error);
    return NextResponse.json({ error: "Unable to send the birthday SMS." }, { status: 500 });
  }
}
