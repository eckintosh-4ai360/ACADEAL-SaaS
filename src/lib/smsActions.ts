"use server";

import prisma from "@/lib/prisma";
import { sendSMS } from "@/lib/sms";
import { getSystemSettings } from "@/lib/settings";
import { normalizeTermValue, formatTermLabel } from "@/lib/termUtils";
import { userHasFeePermission } from "@/lib/user-permissions-server";

type SendSmsToParentsParams = {
  studentIds: string[];
  customMessage?: string;
  useTemplate: boolean;
};

type SendSmsResult = {
  success: boolean;
  count: number;
  error?: string;
};

export async function sendSmsToSelectedParents(
  params: SendSmsToParentsParams
): Promise<SendSmsResult> {
  try {
    if (!(await userHasFeePermission("arrearsPDF"))) {
      return {
        success: false,
        count: 0,
        error: "Unauthorized: You do not have access to send arrears messages.",
      };
    }

    const { studentIds, customMessage, useTemplate } = params;

    if (!studentIds || studentIds.length === 0) {
      return { success: false, count: 0, error: "No students selected" };
    }

    // Fetch selected students with their parent info and fees
    const students = await prisma.student.findMany({
      where: {
        studentId: { in: studentIds },
      },
      include: {
        parent: true,
        fees: true,
      },
    });

    if (students.length === 0) {
      return { success: false, count: 0, error: "No students found" };
    }

    // Get system settings for current term and academic year
    const settings = await getSystemSettings();
    const currentTerm = normalizeTermValue(settings.currentTerm);

    // Map to track unique phone numbers
    const smsRecipientsMap = new Map<string, { phone: string; message: string }>();

    if (useTemplate) {
      // Generate personalized messages using template
      for (const student of students) {
        if (!student.parent?.phone) continue;

        // Calculate total outstanding balance for this student
        const totalFees = student.fees.reduce((sum, f) => sum + f.amount, 0);
        const totalPaid = student.fees.reduce((sum, f) => sum + f.paidAmount, 0);
        const balance = totalFees - totalPaid;

        if (balance <= 0) continue; // Skip if no balance

        const phone = student.parent.phone;
        const studentName = `${student.name} ${student.surname}`;
        const message = `Dear Parent, a gentle reminder that your ward ${studentName} owes GH₵ ${balance.toFixed(2)} in school fees for ${formatTermLabel(currentTerm)}. Kindly make payment as soon as possible. Thank you.`;

        if (smsRecipientsMap.has(phone)) {
          const existing = smsRecipientsMap.get(phone)!;
          existing.message += `\n${studentName} owes GH₵ ${balance.toFixed(2)}`;
        } else {
          smsRecipientsMap.set(phone, { phone, message });
        }
      }
    } else {
      // Use custom message for all parents
      if (!customMessage?.trim()) {
        return { success: false, count: 0, error: "Custom message is required" };
      }

      const recipientPhones = new Set<string>();
      for (const student of students) {
        if (student.parent?.phone && !recipientPhones.has(student.parent.phone)) {
          recipientPhones.add(student.parent.phone);
          smsRecipientsMap.set(student.parent.phone, {
            phone: student.parent.phone,
            message: customMessage,
          });
        }
      }
    }

    if (smsRecipientsMap.size === 0) {
      return {
        success: false,
        count: 0,
        error: "No valid parent phone numbers found",
      };
    }

    // Send SMS to all recipients
    const results = [];
    for (const rec of smsRecipientsMap.values()) {
      try {
        const res = await sendSMS(rec.phone, rec.message);
        results.push({ phone: rec.phone, success: res.success, error: res.error });
        if (!res.success) {
          console.warn(`Failed to send SMS to ${rec.phone}: ${res.error}`);
        }
      } catch (error) {
        console.error(`Error sending SMS to ${rec.phone}:`, error);
        results.push({ phone: rec.phone, success: false, error: "Unexpected error" });
      }
    }

    // Log the SMS activity
    const successCount = results.filter((r) => r.success).length;
    if (successCount > 0) {
      await prisma.smsLog.create({
        data: {
          sender: "ADMIN",
          recipient: `Selected Students (${studentIds.length} students)`,
          message: useTemplate
            ? `Sent personalized SMS to ${successCount} parent(s)`
            : `Sent custom message to ${successCount} parent(s)`,
        },
      });
    }

    return { success: successCount > 0, count: successCount };
  } catch (error) {
    console.error("SMS TO PARENTS ERROR:", error);
    return {
      success: false,
      count: 0,
      error: "Internal server error",
    };
  }
}
