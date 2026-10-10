import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { markDatabaseFailure, shouldBypassDatabase } from "@/lib/db-resilience";
import { isMissingDatabaseObjectError } from "@/lib/prisma-errors";
import { GRADE_NAMES } from "@/lib/utils";
import { normalizeUserPermissions } from "@/lib/user-permissions";

type SessionUserPayload = {
  email?: string | null;
  id?: string;
  img?: string | null;
  loginId?: string;
  name?: string | null;
  role?: string;
  username?: string;
};

type TeacherProfileRecord = {
  email: string | null;
  id: string;
  img: string | null;
  name: string;
  permissions?: unknown;
  phone: string | null;
  staffId: string;
  staffProfile?: {
    email: string | null;
    img: string | null;
    name: string;
    permissions?: unknown;
    phone: string | null;
    staffId: string;
    surname: string | null;
    username: string;
  } | null;
  surname: string;
  username: string;
};

type AdminProfileRecord = {
  email: string | null;
  id: string;
  img: string | null;
  name: string;
  permissions?: unknown;
  phone: string | null;
  staffId: string;
  staffProfile?: {
    email: string | null;
    img: string | null;
    name: string;
    permissions?: unknown;
    phone: string | null;
    staffId: string;
    username: string;
  } | null;
  username: string;
};

function getUserType(role: string): "STUDENT" | "TEACHER" | "PARENT" | "ADMIN" {
  if (role === "teacher") return "TEACHER";
  if (role === "parent") return "PARENT";
  if (role === "admin") return "ADMIN";
  return "STUDENT";
}

function buildFallbackProfile(sessionUser: SessionUserPayload) {
  const role = sessionUser?.role || "student";
  const userType = getUserType(role);
  const fullName = typeof sessionUser?.name === "string" ? sessionUser.name.trim() : "";
  const [firstName = "", ...rest] = fullName.split(/\s+/).filter(Boolean);
  const surname = role === "admin" ? "" : rest.join(" ");

  return {
    id: sessionUser?.id || "",
    name: role === "admin" ? fullName || "Administrator" : firstName || fullName || "User",
    surname,
    email: sessionUser?.email || null,
    phone: null,
    loginId: sessionUser?.loginId || "",
    username: sessionUser?.username || "",
    img: sessionUser?.img || null,
    userType,
    className: null,
    gradeLevel: null,
    gradeLabel: null,
    degraded: true,
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = session.user as SessionUserPayload;
    const userRole = sessionUser.role || "student";
    const username = sessionUser.username;
    const fallbackProfile = buildFallbackProfile(sessionUser);

    if (shouldBypassDatabase()) {
      return NextResponse.json(fallbackProfile);
    }

    let userData = null;
    const userType: "STUDENT" | "TEACHER" | "PARENT" | "ADMIN" = getUserType(userRole);

    if (userRole === "student") {
      const student = await prisma.student.findUnique({
        where: { username },
        select: {
          id: true,
          name: true,
          surname: true,
          email: true,
          phone: true,
          studentId: true,
          username: true,
          img: true,
          class: {
            select: {
              name: true,
            },
          },
          grade: {
            select: {
              level: true,
            },
          },
        },
      });
      userData = student
        ? {
            id: student.id,
            name: student.name,
            surname: student.surname,
            email: student.email,
            phone: student.phone,
            username: student.username,
            img: student.img,
            loginId: student.studentId,
            className: student.class.name,
            gradeLevel: student.grade.level,
            gradeLabel:
              GRADE_NAMES[student.grade.level] ?? `Grade ${student.grade.level}`,
          }
        : null;
    } else if (userRole === "teacher") {
      let teacher: TeacherProfileRecord | null = null;

      try {
        teacher = await prisma.teacher.findUnique({
          where: { username },
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
            phone: true,
            staffId: true,
            username: true,
            img: true,
            permissions: true,
            staffProfile: {
              select: {
                name: true,
                surname: true,
                email: true,
                phone: true,
                staffId: true,
                username: true,
                img: true,
                permissions: true,
              },
            },
          },
        });
      } catch (error) {
        if (!isMissingDatabaseObjectError(error)) {
          throw error;
        }

        teacher = await prisma.teacher.findUnique({
          where: { username },
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
            phone: true,
            staffId: true,
            username: true,
            img: true,
          },
        });
      }

      userData = teacher
        ? {
            id: teacher.id,
            name: "staffProfile" in teacher ? teacher.staffProfile?.name ?? teacher.name : teacher.name,
            surname: "staffProfile" in teacher ? teacher.staffProfile?.surname ?? teacher.surname : teacher.surname,
            email: "staffProfile" in teacher ? teacher.staffProfile?.email ?? teacher.email : teacher.email,
            phone: "staffProfile" in teacher ? teacher.staffProfile?.phone ?? teacher.phone : teacher.phone,
            username: "staffProfile" in teacher ? teacher.staffProfile?.username ?? teacher.username : teacher.username,
            img: "staffProfile" in teacher ? teacher.staffProfile?.img ?? teacher.img : teacher.img,
            loginId: "staffProfile" in teacher ? teacher.staffProfile?.staffId ?? teacher.staffId : teacher.staffId,
            permissions: normalizeUserPermissions(
              "staffProfile" in teacher
                ? teacher.staffProfile?.permissions ??
                    ("permissions" in teacher ? teacher.permissions : null)
                : "permissions" in teacher
                  ? teacher.permissions
                  : null
            ),
          }
        : null;
    } else if (userRole === "parent") {
      const parent = await prisma.parent.findUnique({
        where: { username },
        select: {
          id: true,
          name: true,
          surname: true,
          email: true,
          phone: true,
          parentUserId: true,
          username: true,
        },
      });
      userData = parent
        ? {
            ...parent,
            loginId: parent.parentUserId || "",
          }
        : null;
    } else if (userRole === "admin") {
      let admin: AdminProfileRecord | null = null;

      try {
        admin = await prisma.admin.findUnique({
          where: { username },
          select: {
            id: true,
            staffId: true,
            username: true,
            name: true,
            email: true,
            phone: true,
            img: true,
            permissions: true,
            staffProfile: {
              select: {
                staffId: true,
                username: true,
                name: true,
                email: true,
                phone: true,
                img: true,
                permissions: true,
              },
            },
          },
        });
      } catch (error) {
        if (!isMissingDatabaseObjectError(error)) {
          throw error;
        }

        admin = await prisma.admin.findUnique({
          where: { username },
          select: {
            id: true,
            staffId: true,
            username: true,
            name: true,
            email: true,
            phone: true,
            img: true,
            permissions: true,
          },
        });
      }

      if (admin) {
        userData = {
          id: admin.id,
          staffId: "staffProfile" in admin ? admin.staffProfile?.staffId ?? admin.staffId : admin.staffId,
          username: "staffProfile" in admin ? admin.staffProfile?.username ?? admin.username : admin.username,
          name: "staffProfile" in admin ? admin.staffProfile?.name ?? admin.name : admin.name,
          email: "staffProfile" in admin ? admin.staffProfile?.email ?? admin.email : admin.email,
          phone: "staffProfile" in admin ? admin.staffProfile?.phone ?? admin.phone : admin.phone,
          img: "staffProfile" in admin ? admin.staffProfile?.img ?? admin.img : admin.img,
          loginId: "staffProfile" in admin ? admin.staffProfile?.staffId ?? admin.staffId : admin.staffId,
          permissions: normalizeUserPermissions(
            "staffProfile" in admin ? admin.staffProfile?.permissions ?? admin.permissions : admin.permissions
          ),
          surname: "", //* Admin only has 'name' in schema
        };
      }
    }

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...userData,
      userType,
    });
  } catch (error) {
    if (markDatabaseFailure(error)) {
      const session = await getServerSession(authOptions);

      if (session?.user) {
        return NextResponse.json(
          buildFallbackProfile(session.user as SessionUserPayload)
        );
      }
    }

    console.error("Error fetching user profile:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

