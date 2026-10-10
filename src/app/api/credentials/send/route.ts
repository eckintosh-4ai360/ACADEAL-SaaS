import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendSMS } from "@/lib/sms";
import { sendNotificationEmail } from "@/lib/email";
import { resolveCurrentAppBaseUrl } from "@/lib/app-url";
import { getSystemSettings } from "@/lib/settings";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "admin") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { scope } = body as { scope?: "all" | string[] };

    //* Fetch parents with their students
    const parents = await prisma.parent.findMany({
      where: scope === "all" || !scope ? undefined : { id: { in: scope as string[] } },
      select: {
        id: true,
        name: true,
        surname: true,
        phone: true,
        email: true,
        parentUserId: true,
        students: {
          select: {
            id: true,
            name: true,
            surname: true,
            studentId: true,
          },
        },
      },
    });

    if (parents.length === 0) {
      return NextResponse.json({ success: false, error: "No parents found" });
    }

    const settings = await getSystemSettings();
    const rawAppUrl = settings.publicAppUrl || await resolveCurrentAppBaseUrl();
    const appUrl = rawAppUrl.replace(/\/+$/, "");
    const loginUrl = `${appUrl}/login`;

    let smsSent = 0;
    let smsSkipped = 0;
    let emailSent = 0;
    let emailSkipped = 0;
    const errors: string[] = [];

    for (const parent of parents) {
      const parentDisplay = `${parent.name} ${parent.surname}`;

      if (parent.students.length === 0) {
        smsSkipped++;
        continue;
      }

      //* Build student ID list
      const studentLines = parent.students
        .map((s) => `${s.name} ${s.surname} (ID: ${s.studentId || "PENDING"})`)
        .join(", ");

      //* SMS reminder (no passwords)
      if (parent.phone) {
        const smsMsg =
          `Hello ${parent.name}, your ${parent.parentUserId ? `Parent ID: ${parent.parentUserId}` : "parent account"} ` +
          `is set up on the school portal. ` +
          `Your child(ren): ${studentLines}. ` +
          `For password help, contact the school admin. Login: ${loginUrl}`;

        const res = await sendSMS(parent.phone, smsMsg);
        if (res.success) {
          smsSent++;
        } else {
          smsSkipped++;
          errors.push(`SMS to ${parent.phone} failed: ${res.error}`);
        }
      } else {
        smsSkipped++;
      }

      //* Email reminder (no passwords)
      if (parent.email) {
        const msgHtml = `
          <p>Hello <strong>${parentDisplay}</strong>,</p>
          <p>This is a reminder that your parent account is active on the school portal.</p>
          <p><strong>Parent ID:</strong> ${parent.parentUserId || "—"}</p>
          <p><strong>Your child(ren):</strong><br>${parent.students.map((s) => `${s.name} ${s.surname} — Student ID: <code>${s.studentId || "PENDING"}</code>`).join("<br>")}</p>
          <p>If you have forgotten your password, please contact the school admin to reset it.</p>
          <p><a href="${loginUrl}">Login to Portal →</a></p>
        `;

        const res = await sendNotificationEmail(parent.email, "Your School Portal Credentials Reminder", msgHtml);
        if (res.success) {
          emailSent++;
        } else {
          emailSkipped++;
          errors.push(`Email to ${parent.email} failed: ${res.error}`);
        }
      } else {
        emailSkipped++;
      }
    }

    return NextResponse.json({
      success: true,
      totalParents: parents.length,
      smsSent,
      smsSkipped,
      emailSent,
      emailSkipped,
      errors: errors.slice(0, 20),
    });
  } catch (error) {
    console.error("[CREDENTIALS BULK SEND] Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
