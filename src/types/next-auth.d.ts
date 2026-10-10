import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      loginId: string;
      username: string;
      role: "admin" | "teacher" | "student" | "parent";
      adminRole?: "SUPER_ADMIN" | "ADMIN";
      tenantId: string;
      tenantSlug: string;
      schoolName?: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    loginId: string;
    username: string;
    role: "admin" | "teacher" | "student" | "parent";
    adminRole?: "SUPER_ADMIN" | "ADMIN";
    tenantId: string;
    tenantSlug: string;
    schoolName?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    loginId: string;
    role: "admin" | "teacher" | "student" | "parent";
    username: string;
    adminRole?: "SUPER_ADMIN" | "ADMIN";
    tenantId?: string;
    tenantSlug?: string;
    schoolName?: string;
  }
}

