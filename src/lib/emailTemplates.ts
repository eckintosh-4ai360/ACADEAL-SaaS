import prisma from "./prisma";
import { EmailTemplateCategory, EmailStatus, Prisma } from "@prisma/client";
import { createTransporter, getEmailRuntimeConfig } from "./email";

type EmailTemplateData = {
  name: string;
  category: EmailTemplateCategory;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  variables?: string[];
};

type EmailVariables = Record<string, string>;

function deriveSeverityClass(severity?: string) {
  const normalized = severity?.trim().toLowerCase();

  if (!normalized) return "info";
  if (normalized.includes("high") || normalized.includes("critical") || normalized.includes("severe")) {
    return "high";
  }
  if (normalized.includes("medium") || normalized.includes("moderate")) {
    return "medium";
  }
  if (normalized.includes("low") || normalized.includes("minor")) {
    return "low";
  }

  return "info";
}

async function buildTemplateVariables(variables: EmailVariables): Promise<EmailVariables> {
  const config = await getEmailRuntimeConfig();

  return {
    schoolName: config.schoolName,
    year: config.year,
    loginUrl: `${config.baseUrl}/login`,
    paymentUrl: config.baseUrl,
    confirmUrl: `${config.baseUrl}/dashboard/meetings`,
    rescheduleUrl: `${config.baseUrl}/dashboard/meetings`,
    severityClass: deriveSeverityClass(variables.severity),
    ...variables,
  };
}

/**
 * Initialize default email templates in the database
 */
export async function initializeEmailTemplates() {
  const defaultTemplates: EmailTemplateData[] = [
    {
      name: "Welcome Email",
      category: EmailTemplateCategory.WELCOME,
      subject: "Welcome to {{schoolName}}!",
      bodyHtml: getWelcomeTemplateHtml(),
      bodyText: "Welcome {{name}}! Your account has been created. Login ID: {{loginId}}. Temporary Password: {{temporaryPassword}}. Please login and change your password.",
      variables: ["{{schoolName}}", "{{name}}", "{{loginId}}", "{{temporaryPassword}}", "{{role}}", "{{loginUrl}}", "{{year}}"],
    },
    {
      name: "Fee Reminder",
      category: EmailTemplateCategory.FEE_REMINDER,
      subject: "Fee Payment Reminder - {{feeTitle}}",
      bodyHtml: getFeeReminderTemplateHtml(),
      bodyText: "Dear {{parentName}}, This is a reminder that {{studentName}}'s {{feeTitle}} of {{currency}}{{amount}} is due on {{dueDate}}. Please ensure payment is made before the due date.",
      variables: ["{{parentName}}", "{{studentName}}", "{{feeTitle}}", "{{amount}}", "{{dueDate}}", "{{currency}}", "{{paymentUrl}}", "{{year}}", "{{schoolName}}"],
    },
    {
      name: "Assignment Notification",
      category: EmailTemplateCategory.ASSIGNMENT_NOTIFICATION,
      subject: "New Assignment: {{assignmentTitle}}",
      bodyHtml: getAssignmentNotificationTemplateHtml(),
      bodyText: "Dear {{parentName}}, A new assignment '{{assignmentTitle}}' has been posted for {{studentName}}. Due Date: {{dueDate}}. Subject: {{subjectName}}.",
      variables: ["{{parentName}}", "{{studentName}}", "{{assignmentTitle}}", "{{subjectName}}", "{{dueDate}}", "{{description}}", "{{year}}", "{{schoolName}}"],
    },
    {
      name: "Exam Notification",
      category: EmailTemplateCategory.EXAM_NOTIFICATION,
      subject: "Upcoming Exam: {{examTitle}}",
      bodyHtml: getExamNotificationTemplateHtml(),
      bodyText: "Dear {{parentName}}, {{studentName}} has an upcoming exam '{{examTitle}}' on {{examDate}} from {{startTime}} to {{endTime}}. Please ensure they are well prepared.",
      variables: ["{{parentName}}", "{{studentName}}", "{{examTitle}}", "{{examDate}}", "{{startTime}}", "{{endTime}}", "{{subjectName}}", "{{year}}", "{{schoolName}}"],
    },
    {
      name: "Meeting Request",
      category: EmailTemplateCategory.MEETING_REQUEST,
      subject: "Parent-Teacher Meeting Request - {{studentName}}",
      bodyHtml: getMeetingRequestTemplateHtml(),
      bodyText: "Dear {{recipientName}}, {{requesterName}} has requested a parent-teacher meeting on {{meetingDate}} at {{meetingTime}}. Location: {{location}}. Please confirm your availability.",
      variables: ["{{recipientName}}", "{{requesterName}}", "{{studentName}}", "{{meetingDate}}", "{{meetingTime}}", "{{location}}", "{{purpose}}", "{{confirmUrl}}", "{{rescheduleUrl}}", "{{year}}", "{{schoolName}}"],
    },
    {
      name: "Meeting Reminder",
      category: EmailTemplateCategory.MEETING_REMINDER,
      subject: "Meeting Reminder - {{studentName}}",
      bodyHtml: getMeetingReminderTemplateHtml(),
      bodyText: "Dear {{recipientName}}, This is a reminder about your meeting scheduled for {{meetingDate}} at {{meetingTime}}. Location: {{location}}. We look forward to seeing you.",
      variables: ["{{recipientName}}", "{{studentName}}", "{{meetingDate}}", "{{meetingTime}}", "{{location}}", "{{teacherName}}", "{{year}}", "{{schoolName}}"],
    },
    {
      name: "Meeting Confirmation",
      category: EmailTemplateCategory.MEETING_CONFIRMATION,
      subject: "Meeting Confirmed - {{studentName}}",
      bodyHtml: getMeetingConfirmationTemplateHtml(),
      bodyText: "Dear {{recipientName}}, Your meeting has been confirmed for {{meetingDate}} at {{meetingTime}}. Location: {{location}}. Teacher: {{teacherName}}.",
      variables: ["{{recipientName}}", "{{studentName}}", "{{meetingDate}}", "{{meetingTime}}", "{{location}}", "{{teacherName}}", "{{year}}", "{{schoolName}}"],
    },
    {
      name: "Behavior Notification",
      category: EmailTemplateCategory.BEHAVIOR_NOTIFICATION,
      subject: "Behavior Report - {{studentName}}",
      bodyHtml: getBehaviorNotificationTemplateHtml(),
      bodyText: "Dear {{parentName}}, A behavior report has been recorded for {{studentName}}. Type: {{behaviorType}}. Date: {{date}}. Please review and discuss with your child.",
      variables: ["{{parentName}}", "{{studentName}}", "{{behaviorType}}", "{{severity}}", "{{date}}", "{{description}}", "{{actionTaken}}", "{{severityClass}}", "{{year}}", "{{schoolName}}"],
    },
    {
      name: "Attendance Alert",
      category: EmailTemplateCategory.ATTENDANCE_ALERT,
      subject: "Attendance Alert - {{studentName}}",
      bodyHtml: getAttendanceAlertTemplateHtml(),
      bodyText: "Dear {{parentName}}, {{studentName}} was marked {{attendanceStatus}} on {{date}}. Total attendance: {{attendancePercentage}}%. Please ensure regular attendance.",
      variables: ["{{parentName}}", "{{studentName}}", "{{attendanceStatus}}", "{{date}}", "{{attendancePercentage}}", "{{year}}", "{{schoolName}}"],
    },
    {
      name: "General Announcement",
      category: EmailTemplateCategory.GENERAL_ANNOUNCEMENT,
      subject: "{{announcementTitle}}",
      bodyHtml: getGeneralAnnouncementTemplateHtml(),
      bodyText: "Dear {{recipientName}}, {{announcementBody}}. For more information, please visit the school portal.",
      variables: ["{{recipientName}}", "{{announcementTitle}}", "{{announcementBody}}", "{{date}}", "{{year}}", "{{schoolName}}"],
    },
    {
      name: "Password Reset",
      category: EmailTemplateCategory.PASSWORD_RESET,
      subject: "Password Reset Request",
      bodyHtml: getPasswordResetTemplateHtml(),
      bodyText: "Hello {{name}}, Your password has been reset. User ID: {{userId}}. New password: {{newPassword}}. Please login and change it immediately.",
      variables: ["{{name}}", "{{userId}}", "{{newPassword}}", "{{loginUrl}}", "{{year}}", "{{schoolName}}"],
    },
  ];

  try {
    for (const template of defaultTemplates) {
      await prisma.emailTemplate.upsert({
        where: { name: template.name },
        update: {
          subject: template.subject,
          bodyHtml: template.bodyHtml,
          bodyText: template.bodyText,
          variables: template.variables,
        },
        create: {
          ...template,
          isSystem: true,
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error initializing email templates:", error);
    return { success: false, error: "Failed to initialize templates" };
  }
}

/**
 * Get email template by category
 */
export async function getEmailTemplate(category: EmailTemplateCategory) {
  try {
    let template = await prisma.emailTemplate.findFirst({
      where: { category, isActive: true },
    });

    if (!template) {
      const initialized = await initializeEmailTemplates();
      if (initialized.success) {
        template = await prisma.emailTemplate.findFirst({
          where: { category, isActive: true },
        });
      }
    }

    if (!template) {
      return { success: false, error: "Template not found" };
    }

    return { success: true, template };
  } catch (error) {
    console.error("Get template error:", error);
    return { success: false, error: "Failed to get template" };
  }
}

/**
 * Get all email templates
 */
export async function getAllEmailTemplates(options?: { includeInactive?: boolean }) {
  try {
    const { includeInactive = false } = options || {};

    let templates = await prisma.emailTemplate.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { name: "asc" },
    });

    if (templates.length === 0) {
      const initialized = await initializeEmailTemplates();
      if (initialized.success) {
        templates = await prisma.emailTemplate.findMany({
          where: includeInactive ? {} : { isActive: true },
          orderBy: { name: "asc" },
        });
      }
    }

    return { success: true, templates };
  } catch (error) {
    console.error("Get all templates error:", error);
    return { success: false, error: "Failed to get templates" };
  }
}

/**
 * Update email template
 */
export async function updateEmailTemplate(
  templateId: number,
  data: Partial<EmailTemplateData> & { isSystem?: boolean }
) {
  try {
    const existing = await prisma.emailTemplate.findUnique({
      where: { id: templateId },
    });

    if (!existing) {
      return { success: false, error: "Template not found" };
    }

    if (existing.isSystem && !data.isSystem) {
      return { success: false, error: "Cannot modify system templates" };
    }

    const updated = await prisma.emailTemplate.update({
      where: { id: templateId },
      data: {
        ...data,
        isSystem: undefined, //* Prevent changing isSystem flag
      },
    });

    return { success: true, template: updated };
  } catch (error) {
    console.error("Update template error:", error);
    return { success: false, error: "Failed to update template" };
  }
}

/**
 * Create custom email template
 */
export async function createEmailTemplate(data: EmailTemplateData) {
  try {
    const template = await prisma.emailTemplate.create({
      data: {
        ...data,
        isSystem: false,
      },
    });

    return { success: true, template };
  } catch (error) {
    console.error("Create template error:", error);
    return { success: false, error: "Failed to create template" };
  }
}

/**
 * Delete email template (only non-system templates)
 */
export async function deleteEmailTemplate(templateId: number) {
  try {
    const existing = await prisma.emailTemplate.findUnique({
      where: { id: templateId },
    });

    if (!existing) {
      return { success: false, error: "Template not found" };
    }

    if (existing.isSystem) {
      return { success: false, error: "Cannot delete system templates" };
    }

    await prisma.emailTemplate.delete({
      where: { id: templateId },
    });

    return { success: true };
  } catch (error) {
    console.error("Delete template error:", error);
    return { success: false, error: "Failed to delete template" };
  }
}

/**
 * Render email template with variables
 */
export function renderEmailTemplate(
  template: { subject: string; bodyHtml: string; bodyText?: string | null },
  variables: EmailVariables
) {
  let subject = template.subject;
  let bodyHtml = template.bodyHtml;
  let bodyText = template.bodyText || "";

  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    subject = subject.replace(placeholder, value);
    bodyHtml = bodyHtml.replace(placeholder, value);
    bodyText = bodyText.replace(placeholder, value);
  });

  return { subject, bodyHtml, bodyText };
}

/**
 * Send email using template
 */
export async function sendTemplateEmail(
  templateId: number,
  recipient: string,
  variables: EmailVariables,
  metadata?: Record<string, unknown>
) {
  try {
    const template = await prisma.emailTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template || !template.isActive) {
      return { success: false, error: "Template not found or inactive" };
    }

    const [resolvedVariables, transporter, config] = await Promise.all([
      buildTemplateVariables(variables),
      createTransporter(),
      getEmailRuntimeConfig(),
    ]);
    const { subject, bodyHtml, bodyText } = renderEmailTemplate(template, resolvedVariables);

    //* Create email log
    const emailLog = await prisma.emailLog.create({
      data: {
        templateId,
        recipient,
        subject,
        status: EmailStatus.PENDING,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
      },
    });

    try {
      await transporter.sendMail({
        from: config.from,
        to: recipient,
        subject,
        html: bodyHtml,
        text: bodyText,
      });

      //* Update email log
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: EmailStatus.SENT,
          sentAt: new Date(),
        },
      });

      //* Update template usage
      await prisma.emailTemplate.update({
        where: { id: templateId },
        data: {
          lastUsedAt: new Date(),
          usageCount: { increment: 1 },
        },
      });

      return { success: true, emailLogId: emailLog.id };
    } catch (sendError) {
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: EmailStatus.FAILED,
          errorMessage: sendError instanceof Error ? sendError.message : "Unknown error",
        },
      });

      return { success: false, error: sendError instanceof Error ? sendError.message : "Failed to send email" };
    }
  } catch (error) {
    console.error("Send template email error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to send email" };
  }
}

/**
 * Broadcast email to all parents using a template
 */
export async function broadcastTemplateEmail(
  templateId: number,
  variables: EmailVariables,
  metadata?: Record<string, unknown>
) {
  try {
    const parents = await prisma.parent.findMany({
      where: { email: { not: null }, isProfileComplete: true },
      select: { 
        email: true, 
        name: true, 
        surname: true,
        students: {
          select: { name: true, surname: true }
        }
      },
    });

    const results = {
      total: parents.length,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const parent of parents) {
      if (!parent.email) continue;
      
      const studentNames = parent.students.map(s => `${s.name} ${s.surname}`).join(', ') || 'Your Child(ren)';
      
      const parentVariables = {
        ...variables,
        name: parent.name,
        parentName: `${parent.name} ${parent.surname}`,
        recipientName: `${parent.name} ${parent.surname}`,
        studentName: studentNames,
      };

      const result = await sendTemplateEmail(templateId, parent.email, parentVariables, metadata);
      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
        results.errors.push(`${parent.email}: ${result.error}`);
      }
    }

    return { success: true, ...results };
  } catch (error) {
    console.error("Broadcast template email error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to broadcast email" };
  }
}

//* =====================
//* TEMPLATE HTML HELPERS
//* =====================

function getWelcomeTemplateHtml() {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Sora', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .credentials { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
    .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to {{schoolName}}!</h1>
    </div>
    <div class="content">
      <p>Hello {{name}},</p>
      <p>Your account has been created successfully. Here are your login credentials:</p>
      <div class="credentials">
        <p><strong>User ID:</strong> {{loginId}}</p>
        <p><strong>Temporary Password:</strong> {{temporaryPassword}}</p>
        <p><strong>Role:</strong> {{role}}</p>
      </div>
      <p><strong>Important:</strong> Please change your password after your first login for security reasons.</p>
      <div style="text-align: center;">
        <a href="{{loginUrl}}" class="button">Login Now</a>
      </div>
    </div>
    <div class="footer">
      <p>&copy; {{year}} {{schoolName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

function getFeeReminderTemplateHtml() {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Sora', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; }
    .fee-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .amount { font-size: 32px; font-weight: bold; color: #f5576c; }
    .due-date { color: #666; margin-top: 10px; }
    .button { display: inline-block; padding: 15px 30px; background: #f5576c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💰 Fee Payment Reminder</h1>
    </div>
    <div class="content">
      <p>Dear {{parentName}},</p>
      <p>This is a friendly reminder about the upcoming fee payment for <strong>{{studentName}}</strong>.</p>
      <div class="fee-box">
        <p style="margin: 0; color: #666;">{{feeTitle}}</p>
        <p class="amount">{{currency}}{{amount}}</p>
        <p class="due-date">📅 Due: {{dueDate}}</p>
      </div>
      <p>Please ensure the payment is made before the due date to avoid any late fees.</p>
      <div style="text-align: center;">
        <a href="{{paymentUrl}}" class="button">Pay Now</a>
      </div>
      <p>If you have already made the payment, please disregard this reminder.</p>
    </div>
    <div class="footer">
      <p>&copy; {{year}} {{schoolName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

function getAssignmentNotificationTemplateHtml() {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Sora', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #5ee7df 0%, #b490ca 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; }
    .assignment-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #b490ca; }
    .due-date { color: #b490ca; font-weight: bold; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📚 New Assignment</h1>
    </div>
    <div class="content">
      <p>Dear {{parentName}},</p>
      <p>A new assignment has been posted for <strong>{{studentName}}</strong>.</p>
      <div class="assignment-box">
        <p style="margin: 0 0 10px 0;"><strong>Subject:</strong> {{subjectName}}</p>
        <p style="margin: 0 0 10px 0;"><strong>Assignment:</strong> {{assignmentTitle}}</p>
        <p style="margin: 0 0 10px 0;" class="due-date">📅 Due: {{dueDate}}</p>
        <p style="margin: 0;">{{description}}</p>
      </div>
      <p>Please ensure your child completes the assignment on time.</p>
    </div>
    <div class="footer">
      <p>&copy; {{year}} {{schoolName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

function getExamNotificationTemplateHtml() {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Sora', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; }
    .exam-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9a9e; }
    .exam-date { color: #ff9a9e; font-weight: bold; font-size: 18px; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📝 Upcoming Exam</h1>
    </div>
    <div class="content">
      <p>Dear {{parentName}},</p>
      <p>This is to inform you about an upcoming exam for <strong>{{studentName}}</strong>.</p>
      <div class="exam-box">
        <p style="margin: 0 0 10px 0;"><strong>Subject:</strong> {{subjectName}}</p>
        <p style="margin: 0 0 10px 0;"><strong>Exam:</strong> {{examTitle}}</p>
        <p style="margin: 0 0 10px 0;" class="exam-date">📅 Date: {{examDate}}</p>
        <p style="margin: 0;">⏰ Time: {{startTime}} - {{endTime}}</p>
      </div>
      <p>Please ensure your child is well prepared for the exam.</p>
      <p>Good luck! 🍀</p>
    </div>
    <div class="footer">
      <p>&copy; {{year}} {{schoolName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

function getMeetingRequestTemplateHtml() {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Sora', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; }
    .meeting-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .button { display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 5px; }
    .button-decline { background: #f44336; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🤝 Meeting Request</h1>
    </div>
    <div class="content">
      <p>Dear {{recipientName}},</p>
      <p>{{requesterName}} has requested a parent-teacher meeting to discuss <strong>{{studentName}}</strong>.</p>
      <div class="meeting-box">
        <p style="margin: 0 0 10px 0;"><strong>Purpose:</strong> {{purpose}}</p>
        <p style="margin: 0 0 10px 0;"><strong>📅 Date:</strong> {{meetingDate}}</p>
        <p style="margin: 0 0 10px 0;"><strong>⏰ Time:</strong> {{meetingTime}}</p>
        <p style="margin: 0;"><strong>📍 Location:</strong> {{location}}</p>
      </div>
      <p>Please confirm your availability for this meeting.</p>
      <div style="text-align: center;">
        <a href="{{confirmUrl}}" class="button">✓ Confirm</a>
        <a href="{{rescheduleUrl}}" class="button button-decline">✗ Reschedule</a>
      </div>
    </div>
    <div class="footer">
      <p>&copy; {{year}} {{schoolName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

function getMeetingReminderTemplateHtml() {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Sora', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #d299c2 0%, #fef9d7 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; }
    .meeting-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d299c2; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📅 Meeting Reminder</h1>
    </div>
    <div class="content">
      <p>Dear {{recipientName}},</p>
      <p>This is a friendly reminder about your upcoming parent-teacher meeting.</p>
      <div class="meeting-box">
        <p style="margin: 0 0 10px 0;"><strong>Student:</strong> {{studentName}}</p>
        <p style="margin: 0 0 10px 0;"><strong>Teacher:</strong> {{teacherName}}</p>
        <p style="margin: 0 0 10px 0;"><strong>📅 Date:</strong> {{meetingDate}}</p>
        <p style="margin: 0 0 10px 0;"><strong>⏰ Time:</strong> {{meetingTime}}</p>
        <p style="margin: 0;"><strong>📍 Location:</strong> {{location}}</p>
      </div>
      <p>We look forward to seeing you!</p>
    </div>
    <div class="footer">
      <p>&copy; {{year}} {{schoolName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

function getMeetingConfirmationTemplateHtml() {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Sora', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; }
    .meeting-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #66a6ff; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✓ Meeting Confirmed</h1>
    </div>
    <div class="content">
      <p>Dear {{recipientName}},</p>
      <p>Your parent-teacher meeting has been confirmed.</p>
      <div class="meeting-box">
        <p style="margin: 0 0 10px 0;"><strong>Student:</strong> {{studentName}}</p>
        <p style="margin: 0 0 10px 0;"><strong>Teacher:</strong> {{teacherName}}</p>
        <p style="margin: 0 0 10px 0;"><strong>📅 Date:</strong> {{meetingDate}}</p>
        <p style="margin: 0 0 10px 0;"><strong>⏰ Time:</strong> {{meetingTime}}</p>
        <p style="margin: 0;"><strong>📍 Location:</strong> {{location}}</p>
      </div>
      <p>We look forward to meeting with you!</p>
    </div>
    <div class="footer">
      <p>&copy; {{year}} {{schoolName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

function getBehaviorNotificationTemplateHtml() {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Sora', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f6d365 0%, #fda085 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; }
    .behavior-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .severity-high { color: #f44336; }
    .severity-medium { color: #ff9800; }
    .severity-low { color: #4CAF50; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Behavior Report</h1>
    </div>
    <div class="content">
      <p>Dear {{parentName}},</p>
      <p>A behavior report has been recorded for <strong>{{studentName}}</strong>.</p>
      <div class="behavior-box">
        <p style="margin: 0 0 10px 0;"><strong>Type:</strong> {{behaviorType}}</p>
        <p style="margin: 0 0 10px 0;"><strong>Severity:</strong> <span class="severity-{{severityClass}}">{{severity}}</span></p>
        <p style="margin: 0 0 10px 0;"><strong>Date:</strong> {{date}}</p>
        <p style="margin: 0 0 10px 0;"><strong>Description:</strong> {{description}}</p>
        <p style="margin: 0;"><strong>Action Taken:</strong> {{actionTaken}}</p>
      </div>
      <p>Please review this report and discuss it with your child.</p>
    </div>
    <div class="footer">
      <p>&copy; {{year}} {{schoolName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

function getAttendanceAlertTemplateHtml() {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Sora', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #a8c0ff 0%, #3f2b96 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; }
    .attendance-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .percentage { font-size: 48px; font-weight: bold; color: #3f2b96; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Attendance Alert</h1>
    </div>
    <div class="content">
      <p>Dear {{parentName}},</p>
      <p>This is to inform you about the attendance status of <strong>{{studentName}}</strong>.</p>
      <div class="attendance-box">
        <p style="margin: 0 0 10px 0;">Status on {{date}}:</p>
        <p style="margin: 0 0 20px 0; font-size: 24px;"><strong>{{attendanceStatus}}</strong></p>
        <p style="margin: 0;">Current Attendance Rate</p>
        <p class="percentage">{{attendancePercentage}}%</p>
      </div>
      <p>Regular attendance is important for academic success. Please ensure your child attends school regularly.</p>
    </div>
    <div class="footer">
      <p>&copy; {{year}} {{schoolName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

function getGeneralAnnouncementTemplateHtml() {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Sora', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; }
    .announcement-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📢 {{announcementTitle}}</h1>
    </div>
    <div class="content">
      <p>Dear {{recipientName}},</p>
      <div class="announcement-box">
        {{announcementBody}}
      </div>
      <p>For more information, please visit the school portal or contact the administration.</p>
      <p>Date: {{date}}</p>
    </div>
    <div class="footer">
      <p>&copy; {{year}} {{schoolName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

function getPasswordResetTemplateHtml() {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Sora', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; }
    .credentials { background: white; padding: 15px; border-left: 4px solid #f5576c; margin: 20px 0; }
    .warning { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Password Reset</h1>
    </div>
    <div class="content">
      <p>Hello {{name}},</p>
      <p>Your password has been reset. Here are your new credentials:</p>
      <div class="credentials">
        <p><strong>User ID:</strong> {{userId}}</p>
        <p><strong>New Password:</strong> {{newPassword}}</p>
      </div>
      <div class="warning">
        <p style="margin: 0;"><strong>⚠️ Important:</strong> Please login and change your password immediately for security reasons.</p>
      </div>
      <div style="text-align: center;">
        <a href="{{loginUrl}}" class="button" style="display: inline-block; padding: 15px 30px; background: #f5576c; color: white; text-decoration: none; border-radius: 5px;">Login Now</a>
      </div>
    </div>
    <div class="footer">
      <p>&copy; {{year}} {{schoolName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}
