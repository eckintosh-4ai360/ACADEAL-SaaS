import nodemailer from "nodemailer";
import prisma from "./prisma";
import { resolveCurrentAppBaseUrl } from "./app-url";

type EmailRuntimeConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  schoolName: string;
  baseUrl: string;
  year: string;
};

function trimToEmpty(value: string | null | undefined) {
  return value?.trim() || "";
}

function withoutTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export async function getEmailRuntimeConfig(): Promise<EmailRuntimeConfig> {
  let settings:
    | {
        emailHost: string | null;
        emailPort: number | null;
        emailUser: string | null;
        emailPassword: string | null;
        publicAppUrl: string | null;
        schoolName: string | null;
      }
    | null = null;

  try {
    settings = await prisma.systemSettings.findFirst({
      select: {
        emailHost: true,
        emailPort: true,
        emailUser: true,
        emailPassword: true,
        publicAppUrl: true,
        schoolName: true,
      },
    });
  } catch (error) {
    console.warn("Falling back to environment variables for email settings:", error);
  }

  const host = trimToEmpty(settings?.emailHost) || trimToEmpty(process.env.EMAIL_HOST);
  const port = Number(settings?.emailPort || process.env.EMAIL_PORT || 587);
  const user = trimToEmpty(settings?.emailUser) || trimToEmpty(process.env.EMAIL_USER);
  const pass = trimToEmpty(settings?.emailPassword) || trimToEmpty(process.env.EMAIL_PASSWORD);

  if (!host || !user || !pass) {
    throw new Error("Email settings are incomplete. Configure SMTP host, username, and password.");
  }

  const baseUrl = withoutTrailingSlash(
    trimToEmpty(settings?.publicAppUrl) ||
      (await resolveCurrentAppBaseUrl())
  );

  return {
    host,
    port,
    secure: port === 465,
    user,
    pass,
    from: user,
    schoolName: trimToEmpty(settings?.schoolName) || "Student Management System",
    baseUrl,
    year: String(new Date().getFullYear()),
  };
}

//* Create reusable transporter
export async function createTransporter() {
  const config = await getEmailRuntimeConfig();

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}

//* Send welcome email
export async function sendWelcomeEmail(
  email: string,
  name: string,
  loginId: string,
  temporaryPassword: string,
  role: string
) {
  try {
    const [transporter, config] = await Promise.all([
      createTransporter(),
      getEmailRuntimeConfig(),
    ]);
    const loginUrl = `${config.baseUrl}/login`;

    const mailOptions = {
      from: config.from,
      to: email,
      subject: `Welcome to ${config.schoolName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Sora:wght@100..800&display=swap');
            body { font-family: 'Sora'; line-height: 1.6; color: #333; }
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
              <h1>Welcome!</h1>
            </div>
            <div class="content">
              <p>Hello ${name},</p>
              <p>Your account has been created successfully. Here are your login credentials:</p>
              <div class="credentials">
                <p><strong>User ID:</strong> ${loginId}</p>
                <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
                <p><strong>Role:</strong> ${role}</p>
              </div>
              <p><strong>Important:</strong> Please change your password after your first login for security reasons.</p>
              <div style="text-align: center;">
                <a href="${loginUrl}" class="button">Login Now</a>
              </div>
            </div>
            <div class="footer">
              <p>&copy; ${config.year} ${config.schoolName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("Email sending error:", error);
    return { success: false, error: "Failed to send email" };
  }
}

//* Send general notification email
export async function sendNotificationEmail(
  email: string,
  subject: string,
  message: string
) {
  try {
    const [transporter, config] = await Promise.all([
      createTransporter(),
      getEmailRuntimeConfig(),
    ]);

    const mailOptions = {
      from: config.from,
      to: email,
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Sora:wght@100..800&display=swap');
            body { font-family: 'Sora'; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${subject}</h1>
            </div>
            <div class="content">
              ${message}
            </div>
            <div class="footer">
              <p>&copy; ${config.year} ${config.schoolName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("Email sending error:", error);
    return { success: false, error: "Failed to send email" };
  }
}

//* Send parent + student credentials email (called right after student creation)
export async function sendParentCredentialsEmail(params: {
  parentEmail: string;
  parentName: string;
  parentUserId: string;
  parentPassword: string;
  students: { studentName: string; studentId: string; password: string }[];
}) {
  try {
    const [transporter, config] = await Promise.all([
      createTransporter(),
      getEmailRuntimeConfig(),
    ]);

    const loginUrl = `${config.baseUrl}/login`;

    const studentRows = params.students
      .map(
        (s) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151">${s.studentName}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace;color:#667eea">${s.studentId}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace;color:#374151">${s.password}</td>
        </tr>`
      )
      .join("");

    const mailOptions = {
      from: `"${config.schoolName}" <${config.from}>`,
      to: params.parentEmail,
      subject: `Your Account Credentials — ${config.schoolName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Sora:wght@100..800&display=swap');
            body { font-family: 'Sora', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background: #f3f4f6; }
            .wrapper { max-width: 620px; margin: 32px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
            .hdr { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 36px 32px; text-align: center; }
            .hdr h1 { margin: 0 0 4px; font-size: 26px; font-weight: 700; }
            .hdr p { margin: 0; opacity: 0.85; font-size: 14px; }
            .bdy { padding: 32px; }
            .sec-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 12px; }
            .cred-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px; }
            .cred-row { padding: 7px 0; border-bottom: 1px dashed #e5e7eb; }
            .cred-row:last-child { border-bottom: none; }
            .cred-label { color: #6b7280; font-size: 13px; display: inline-block; width: 110px; }
            .cred-val { font-family: monospace; font-size: 14px; font-weight: 700; color: #667eea; }
            table.st { width: 100%; border-collapse: collapse; margin-bottom: 24px; border: 1px solid #e5e7eb; }
            table.st thead { background: #667eea; color: white; }
            table.st thead th { padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
            .alert { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 14px 18px; margin-bottom: 24px; font-size: 13px; color: #92400e; }
            .btn { display: block; width: fit-content; margin: 0 auto 28px; padding: 14px 36px; background: linear-gradient(135deg, #667eea, #764ba2); color: white !important; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; }
            .ftr { text-align: center; padding: 20px 32px; color: #9ca3af; font-size: 12px; border-top: 1px solid #f3f4f6; }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="hdr">
              <h1>Welcome to ${config.schoolName}!</h1>
              <p>Your account is ready. Here are your login credentials.</p>
            </div>
            <div class="bdy">
              <p>Dear <strong>${params.parentName}</strong>,</p>
              <p>Your parent account and your child's student account have been set up on the <strong>${config.schoolName}</strong> portal. Please save these credentials securely.</p>

              <div class="sec-title">Your Parent Login</div>
              <div class="cred-box">
                <div class="cred-row">
                  <span class="cred-label">Parent ID</span>
                  <span class="cred-val">${params.parentUserId}</span>
                </div>
                <div class="cred-row">
                  <span class="cred-label">Password</span>
                  <span class="cred-val">${params.parentPassword}</span>
                </div>
              </div>

              <div class="sec-title">Student Credentials</div>
              <table class="st">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Student ID</th>
                    <th>Password</th>
                  </tr>
                </thead>
                <tbody>
                  ${studentRows}
                </tbody>
              </table>

              <div class="alert">
                ⚠️ <strong>Important:</strong> Please log in and change your password immediately after your first login. Keep these credentials confidential.
              </div>

              <a href="${loginUrl}" class="btn">Login to Portal →</a>
            </div>
            <div class="ftr">
              &copy; ${config.year} ${config.schoolName}. All rights reserved.<br>
              This is an automated message. Please do not reply to this email.
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Credentials sent to ${params.parentEmail}`);
    return { success: true };
  } catch (error) {
    console.error("[EMAIL] sendParentCredentialsEmail error:", error);
    return { success: false, error: "Failed to send credentials email" };
  }
}
