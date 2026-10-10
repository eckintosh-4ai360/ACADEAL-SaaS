import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendSMS } from "@/lib/sms";
import { getSystemSettings } from "@/lib/settings";
import { normalizeTermValue } from "@/lib/termUtils";
import { userHasFeePermission } from "@/lib/user-permissions-server";

export const maxDuration = 300;

type SessionUser = {
  email?: string | null;
  name?: string | null;
  role?: string;
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, message, category, recipients, gradeId } = body;
    const sessionUser = session.user as SessionUser;
    const role = sessionUser.role;

    if (role !== "admin") {
      const teacherCanSendFeesBill =
        type === "FEES_BILL" && (await userHasFeePermission("generateBill"));
      const teacherCanSendArrears =
        type === "FEES_ARREARS" && (await userHasFeePermission("arrearsPDF"));

      if (role !== "teacher" || (!teacherCanSendFeesBill && !teacherCanSendArrears)) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }
    }

    const senderName = sessionUser.name || sessionUser.email || "ADMIN";

    let finalRecipients: { phone: string; message: string; name?: string }[] = [];

    if (type === "FEES_ARREARS") {
      const settings = await getSystemSettings();
      const currentTerm = normalizeTermValue(settings.currentTerm);
      const academicYear = settings.academicYear || "2025/2026";

      const feesWithArrears = await prisma.fee.findMany({
        where: {
          term: currentTerm,
          academicYear,
        },
        include: {
          student: {
            include: { parent: true }
          },
        },
      });

      const studentMap = new Map<
        string,
        {
          studentId: string;
          name: string;
          phone: string | null;
          totalFees: number;
          totalPaid: number;
        }
      >();

      for (const fee of feesWithArrears) {
        const key = fee.student.studentId;
        const existing = studentMap.get(key);
        if (existing) {
          existing.totalFees += fee.amount;
          existing.totalPaid += fee.paidAmount;
        } else {
          studentMap.set(key, {
            studentId: fee.student.studentId,
            name: `${fee.student.name} ${fee.student.surname}`,
            phone: fee.student.parent?.phone || null,
            totalFees: fee.amount,
            totalPaid: fee.paidAmount,
          });
        }
      }

      const arrears = Array.from(studentMap.values())
        .map((s) => ({ ...s, balance: s.totalFees - s.totalPaid }))
        .filter((s) => s.balance > 0 && s.phone);

      const smsRecipientsMap = new Map<string, { phone: string; message: string }>();

      for (const student of arrears) {
        if (!student.phone) continue;
        const phone = student.phone;
        const baseMsg = `Dear Parent, a gentle reminder that your ward ${student.name} owes GH₵ ${student.balance.toFixed(2)} in school fees for ${currentTerm} term. Kindly make payment as soon as possible. Thank you.`;
        
        if (smsRecipientsMap.has(phone)) {
          const existing = smsRecipientsMap.get(phone)!;
          existing.message += `\n${student.name} owes GH₵ ${student.balance.toFixed(2)}`;
        } else {
          smsRecipientsMap.set(phone, { phone, message: baseMsg });
        }
      }

      finalRecipients = Array.from(smsRecipientsMap.values());
    } else if (type === "FEES_BILL") {
      if (!gradeId || !message?.trim()) {
        return NextResponse.json(
          { success: false, error: "gradeId and message are required" },
          { status: 400 }
        );
      }

      const students = await prisma.student.findMany({
        where: { gradeId: Number(gradeId) },
        include: { parent: true },
      });

      const phones = Array.from(
        new Set(
          students
            .map((student) => student.parent?.phone)
            .filter((phone): phone is string => Boolean(phone))
        )
      );

      finalRecipients = phones.map((phone) => ({ phone, message }));
    } else {
      let phones: string[] = [];

      if (type === "CUSTOM") {
        phones = recipients || [];
      } else if (type === "STAFF") {
        const teachers = await prisma.teacher.findMany({ select: { phone: true } });
        const admins = await prisma.admin.findMany({ select: { phone: true } });
        phones = [
          ...teachers.map(t => t.phone),
          ...admins.map(a => a.phone)
        ].filter(p => p) as string[];
      } else if (type === "BULK") {
        if (category === "ALL_PARENTS") {
          const parents = await prisma.parent.findMany({ select: { phone: true } });
          phones = parents.map(p => p.phone).filter(p => p);
        } else {
          const students = await prisma.student.findMany({
            where: { class: { name: category } },
            include: { parent: true }
          });
          phones = students.map(s => s.parent?.phone).filter(p => p) as string[];
        }
      }

      phones = Array.from(new Set(phones));
      finalRecipients = phones.map(phone => ({ phone, message }));
    }

    if (finalRecipients.length === 0) {
      return NextResponse.json({ success: false, error: "No recipients found" });
    }

    console.log(`Sending SMS to ${finalRecipients.length} recipients...`);
    
    //* Keep a small amount of parallelism so a large custom/bulk send does not
    //* spend one network round-trip per recipient while still avoiding a burst
    //* that can trigger provider throttling.
    const results: {
      phone: string;
      success: boolean;
      error?: string;
      data?: unknown;
      providerMessageId?: string;
    }[] = [];
    const batchSize = 5;

    for (let offset = 0; offset < finalRecipients.length; offset += batchSize) {
      const batch = finalRecipients.slice(offset, offset + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (rec) => {
          try {
            const res = await sendSMS(rec.phone, rec.message);
            if (!res.success) {
              console.warn(`Failed to send SMS to ${rec.phone}: ${res.error}`);
            }
            return {
              phone: rec.phone,
              success: res.success,
              error: res.error,
              data: res.data,
              providerMessageId: res.providerMessageId,
            };
          } catch (error) {
            console.error(`Error sending SMS to ${rec.phone}:`, error);
            return { phone: rec.phone, success: false, error: "Unexpected error" };
          }
        })
      );
      results.push(...batchResults);
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.length - successCount;

    // Only log if at least one succeeded
    if (successCount > 0) {
      await prisma.smsLog.create({
        data: {
          sender: senderName,
          recipient:
            type === "CUSTOM"
              ? (recipients?.join(", ") || "Custom")
              : type === "BULK"
                ? "All Parents"
                : type === "STAFF"
                  ? "All Staff"
                  : type === "FEES_BILL"
                    ? `Grade ${gradeId ?? "Unknown"} Parents`
                    : "Fees Arrears",
          message:
            type === "FEES_ARREARS"
              ? `Sent personalized arrears SMS to ${successCount} parents`
              : message,
        },
      });
    }

    if (successCount === 0) {
      // Collect meaningful error messages from failed results
      const firstError = results[0]?.error || "SMS provider rejected the request";
      const providerData = results[0]?.data;
      let providerMessage = firstError;
      if (providerData && typeof providerData === "object") {
        const d = providerData as { message?: string; status?: string; code?: string };
        if (d.message) providerMessage = d.message;
      }
      return NextResponse.json({
        success: false,
        count: 0,
        error: providerMessage,
        results,
      });
    }

    return NextResponse.json({ success: true, count: successCount, failed: failedCount, results });
  } catch (error) {
    console.error("SMS SEND API ERROR:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
