import { NextAuthOptions, type User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getTenantPrismaClient } from "./prisma";
import { resolveClientIp, resolveRequestPath, writeAuditLog } from "./audit";
import { headers } from "next/headers";
import { checkLockout, recordFailedAttempt, resetAttempts } from "./loginLockout";
import { resolveTenantContext } from "./tenant";
import { findStaffAccountByLoginId } from "./staff";
import { resolveCurrentAppBaseUrl } from "./app-url";

// Match login IDs and emails without requiring exact casing from the user.
const exactIdentifierMatch = (value: string) => ({
  equals: value,
  mode: "insensitive" as const,
});

const adminAuthSelect = {
  id: true,
  staffId: true,
  username: true,
  password: true,
  name: true,
  role: true,
};

const teacherAuthSelect = {
  id: true,
  staffId: true,
  username: true,
  password: true,
  name: true,
  surname: true,
};

const studentAuthSelect = {
  id: true,
  studentId: true,
  username: true,
  password: true,
  name: true,
  surname: true,
};

const parentAuthSelect = {
  id: true,
  parentUserId: true,
  username: true,
  password: true,
  name: true,
  surname: true,
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        schoolCode: { label: "School Code", type: "text" },
        userId: { label: "User ID", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.userId || !credentials?.password) {
            return null;
          }

          const identifier = credentials.userId.trim();
          const headersList = await headers();
          const ipAddress = resolveClientIp(headersList) || "unknown";
          const requestPath = resolveRequestPath(headersList) || "/login";
          const authStartedAt = Date.now();
          const tenantContext = await resolveTenantContext({
            schoolCode: credentials.schoolCode,
            //* Signing in is the one moment the caller establishes which
            //* tenant they belong to, so a leftover session must not decide it.
            ignoreSession: true,
          });
          const tenantPrisma = await getTenantPrismaClient(tenantContext.tenant);

          if (!identifier) {
            return null;
          }

          // 1. Check if account is locked
          const lockout = await checkLockout(identifier, tenantPrisma);
          if (lockout.locked) {
            await writeAuditLog({
              action: "auth.login",
              category: "authentication",
              status: "FAILURE",
              source: "next_auth",
              path: requestPath,
              ipAddress,
              durationMs: Date.now() - authStartedAt,
              actor: {
                loginId: identifier,
                name: identifier,
                role: "unknown",
              },
              entity: {
                type: "user_session",
                label: "login",
              },
              summary: `Blocked login attempt for ${identifier}`,
              metadata: {
                reason: "account_locked",
                remainingMinutes: lockout.remainingMinutes,
                tenantSlug: tenantContext.tenant.slug,
              },
            });
            throw new Error(`ACCOUNT_LOCKED:${lockout.remainingMinutes}`);
          }

          const sharedAdminAccount = await findStaffAccountByLoginId(tenantPrisma, {
            loginId: identifier,
            staffType: "ADMIN",
          });

          if (sharedAdminAccount?.admin) {
            if (await bcrypt.compare(credentials.password, sharedAdminAccount.password)) {
              await resetAttempts(identifier, tenantPrisma);
              return {
                id: sharedAdminAccount.admin.id,
                loginId: sharedAdminAccount.staffId,
                username: sharedAdminAccount.username,
                name: sharedAdminAccount.name,
                role: "admin",
                adminRole:
                  sharedAdminAccount.adminRole || sharedAdminAccount.admin.role,
                tenantId: tenantContext.tenant.id,
                tenantSlug: tenantContext.tenant.slug,
                schoolName: tenantContext.tenant.schoolName,
              };
            }
          }

          //? Check in Admin table by staff ID
          const admin = await tenantPrisma.admin.findFirst({
            where: {
              OR: [
                { staffId: exactIdentifierMatch(identifier) },
                { username: exactIdentifierMatch(identifier) },
              ],
            },
            select: adminAuthSelect,
          });

          if (admin) {
             if (await bcrypt.compare(credentials.password, admin.password)) {
                await resetAttempts(identifier, tenantPrisma);
                return {
                  id: admin.id,
                  loginId: admin.staffId,
                  username: admin.username,
                  name: admin.name,
                  role: "admin",
                  adminRole: admin.role,
                  tenantId: tenantContext.tenant.id,
                  tenantSlug: tenantContext.tenant.slug,
                  schoolName: tenantContext.tenant.schoolName,
                };
             }
          }

          const sharedTeacherAccount = await findStaffAccountByLoginId(tenantPrisma, {
            loginId: identifier,
            staffType: "TEACHER",
          });

          if (sharedTeacherAccount?.teacher) {
            if (await bcrypt.compare(credentials.password, sharedTeacherAccount.password)) {
              await resetAttempts(identifier, tenantPrisma);
              return {
                id: sharedTeacherAccount.teacher.id,
                loginId: sharedTeacherAccount.staffId,
                username: sharedTeacherAccount.username,
                name:
                  `${sharedTeacherAccount.name} ${sharedTeacherAccount.surname || ""}`.trim(),
                role: "teacher",
                tenantId: tenantContext.tenant.id,
                tenantSlug: tenantContext.tenant.slug,
                schoolName: tenantContext.tenant.schoolName,
              };
            }
          }

          //? Check in Teacher table by staff ID
          const teacher = await tenantPrisma.teacher.findFirst({
            where: {
              OR: [
                { staffId: exactIdentifierMatch(identifier) },
                { username: exactIdentifierMatch(identifier) },
              ],
            },
            select: teacherAuthSelect,
          });

          if (teacher) {
            if (await bcrypt.compare(credentials.password, teacher.password)) {
                await resetAttempts(identifier, tenantPrisma);
                return {
                  id: teacher.id,
                  loginId: teacher.staffId,
                  username: teacher.username,
                  name: teacher.name + " " + teacher.surname,
                  role: "teacher",
                  tenantId: tenantContext.tenant.id,
                  tenantSlug: tenantContext.tenant.slug,
                  schoolName: tenantContext.tenant.schoolName,
                };
            }
          }

          //? Check in Student table by student ID
          const student = await tenantPrisma.student.findFirst({
            where: {
              studentId: exactIdentifierMatch(identifier),
            },
            select: studentAuthSelect,
          });

          if (student) {
            if (await bcrypt.compare(credentials.password, student.password)) {
                await resetAttempts(identifier, tenantPrisma);
                return {
                  id: student.id,
                  loginId: student.studentId,
                  username: student.username,
                  name: student.name + " " + student.surname,
                  role: "student",
                  tenantId: tenantContext.tenant.id,
                  tenantSlug: tenantContext.tenant.slug,
                  schoolName: tenantContext.tenant.schoolName,
                };
            }
          }

          //? Check in Parent table by parent ID
          const parent = await tenantPrisma.parent.findFirst({
            where: { parentUserId: exactIdentifierMatch(identifier) },
            select: parentAuthSelect,
          });

          if (parent) {
            if (await bcrypt.compare(credentials.password, parent.password)) {
                await resetAttempts(identifier, tenantPrisma);
                return {
                  id: parent.id,
                  loginId: parent.parentUserId || "",
                  username: parent.username,
                  name: parent.name + " " + parent.surname,
                  role: "parent",
                  tenantId: tenantContext.tenant.id,
                  tenantSlug: tenantContext.tenant.slug,
                  schoolName: tenantContext.tenant.schoolName,
                };
            }
          }

          // 2. If we reach here, password match failed (or user not found)
          await recordFailedAttempt(identifier, tenantPrisma);
          await writeAuditLog({
            action: "auth.login",
            category: "authentication",
            status: "FAILURE",
            source: "next_auth",
            path: requestPath,
            ipAddress,
            durationMs: Date.now() - authStartedAt,
            actor: {
              loginId: identifier,
              name: identifier,
              role: "unknown",
            },
            entity: {
              type: "user_session",
              label: "login",
            },
            summary: `Failed sign-in attempt for ${identifier}`,
            metadata: {
              reason: "invalid_credentials",
              tenantSlug: tenantContext.tenant.slug,
            },
          });
          return null;
        } catch (error: unknown) {
          if (
            error instanceof Error &&
            error.message &&
            error.message.startsWith("ACCOUNT_LOCKED")
          ) {
            throw error;
          }
          console.error("Auth authorize error details:", error);

          try {
            const headersList = await headers();
            const identifier = credentials?.userId?.trim();
            writeAuditLog({
              action: "auth.login",
              category: "authentication",
              status: "FAILURE",
              source: "next_auth",
              path: resolveRequestPath(headersList) || "/login",
              ipAddress: resolveClientIp(headersList) || "unknown",
              actor: identifier
                ? {
                    loginId: identifier,
                    name: identifier,
                    role: "unknown",
                  }
                : null,
              entity: {
                type: "user_session",
                label: "login",
              },
              summary: identifier
                ? `Login failed due to a server error for ${identifier}`
                : "Login failed due to a server error",
              metadata: {
                reason: "server_error",
                error:
                  error instanceof Error ? error.message : "Unknown authentication error",
              },
            }).catch((auditErr) => {
              console.error("Background audit log error:", auditErr);
            });
          } catch (logErr) {
            console.error("Failed to prepare audit log in catch block:", logErr);
          }

          throw new Error(
            error instanceof Error ? error.message : "Login failed due to a server-side error."
          );
        }
      },
    }),
  ],
  callbacks: {
    // NextAuth's default redirect resolves `baseUrl` from NEXTAUTH_URL, which
    // is pinned to the primary production domain — on a tenant subdomain that
    // silently bounces the post-login redirect onto the wrong host. Resolve
    // the tenant-validated origin instead (never a raw, unchecked Host header).
    async redirect({ url, baseUrl }) {
      let allowedOrigin = baseUrl;

      try {
        allowedOrigin = new URL(await resolveCurrentAppBaseUrl()).origin;
      } catch {
        // Keep the default baseUrl if tenant/host resolution fails.
      }

      try {
        const target = new URL(url, allowedOrigin);
        if (target.origin === allowedOrigin) {
          return target.toString();
        }
      } catch {
        // Fall through to the bare origin below.
      }

      return allowedOrigin;
    },
    async jwt({ token, user }) {
      if (user) {
        token.loginId = user.loginId;
        token.role = user.role;
        token.username = user.username;
        token.adminRole = user.adminRole;
        token.tenantId = user.tenantId;
        token.tenantSlug = user.tenantSlug;
        token.schoolName = user.schoolName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.id = token.sub || "";
        session.user.loginId = token.loginId || "";
        session.user.username = token.username;
        session.user.adminRole = token.adminRole;
        session.user.tenantId = token.tenantId || "";
        session.user.tenantSlug = token.tenantSlug || "";
        session.user.schoolName = token.schoolName;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  events: {
    async signIn({ user }) {
      try {
        const signedInUser = user as User;
        const headersList = await headers();
        await writeAuditLog({
          action: "auth.login",
          category: "authentication",
          source: "next_auth",
          path: resolveRequestPath(headersList) || "/login",
          ipAddress: resolveClientIp(headersList) || "unknown",
          actor: {
            id: signedInUser.id || "unknown",
            loginId: signedInUser.loginId || null,
            name: signedInUser.name || signedInUser.username,
            role: signedInUser.role || "unknown",
          },
          entity: {
            type: "user_session",
            id: signedInUser.id || "unknown",
            label: "login",
          },
          summary: `${signedInUser.name || signedInUser.username || "User"} signed in`,
          metadata: {
            authProvider: "credentials",
            tenantSlug: signedInUser.tenantSlug,
          },
        });
      } catch (error) {
        console.error("Error logging sign-in event:", error);
      }
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 60, // 30 minutes of inactivity before auto-logout
  },
  secret: process.env.NEXTAUTH_SECRET,
};

//? Check for NEXTAUTH_SECRET at runtime
if (!process.env.NEXTAUTH_SECRET && process.env.NODE_ENV === 'production') {
  console.error("CRITICAL CONFIG ERROR: NEXTAUTH_SECRET is not defined in production environment!");
}
