import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isMissingDatabaseObjectError } from "@/lib/prisma-errors";
import {
  DEFAULT_USER_PERMISSIONS,
  canEditFeeRecords,
  canRecordFeePayments,
  getAllowedFeeTabs,
  normalizeUserPermissions,
  type FeePermissionKey,
  type FeeTabKey,
  type UserPermissions,
} from "@/lib/user-permissions";

type SessionUserLike = {
  adminRole?: string;
  id?: string;
  role?: string;
  username?: string;
};

export type FeeAccessContext = {
  allowedTabs: FeeTabKey[];
  canEditFeeRecords: boolean;
  canRecordFeePayments: boolean;
  hasModuleAccess: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  permissions: UserPermissions;
  role: string;
};

async function getTeacherPermissionsByUser(sessionUser: SessionUserLike) {
  if (sessionUser.role !== "teacher") {
    return { ...DEFAULT_USER_PERMISSIONS };
  }

  try {
    let teacher = null;

    if (sessionUser.id) {
      teacher = await prisma.teacher.findUnique({
        where: { id: sessionUser.id },
        select: {
          permissions: true,
          staffProfile: {
            select: { permissions: true },
          },
        },
      });
    }

    // Some existing sessions can have a valid username but an outdated token.sub/id.
    // Fall back to username lookup so permission checks keep working until the user reauthenticates.
    if (!teacher && sessionUser.username) {
      teacher = await prisma.teacher.findUnique({
        where: { username: sessionUser.username },
        select: {
          permissions: true,
          staffProfile: {
            select: { permissions: true },
          },
        },
      });
    }

    return normalizeUserPermissions(
      teacher?.staffProfile?.permissions ?? teacher?.permissions
    );
  } catch (error) {
    if (isMissingDatabaseObjectError(error)) {
      try {
        let legacyTeacher = null;

        if (sessionUser.id) {
          legacyTeacher = await prisma.teacher.findUnique({
            where: { id: sessionUser.id },
            select: { permissions: true },
          });
        }

        if (!legacyTeacher && sessionUser.username) {
          legacyTeacher = await prisma.teacher.findUnique({
            where: { username: sessionUser.username },
            select: { permissions: true },
          });
        }

        return normalizeUserPermissions(legacyTeacher?.permissions);
      } catch (fallbackError) {
        if (!isMissingDatabaseObjectError(fallbackError)) {
          throw fallbackError;
        }
      }

      return { ...DEFAULT_USER_PERMISSIONS };
    }

    throw error;
  }
}

async function getAdminPermissionsByUser(sessionUser: SessionUserLike) {
  if (sessionUser.role !== "admin") {
    return { ...DEFAULT_USER_PERMISSIONS };
  }

  try {
    let admin = null;

    if (sessionUser.id) {
      admin = await prisma.admin.findUnique({
        where: { id: sessionUser.id },
        select: {
          permissions: true,
          staffProfile: {
            select: { permissions: true },
          },
        },
      });
    }

    if (!admin && sessionUser.username) {
      admin = await prisma.admin.findUnique({
        where: { username: sessionUser.username },
        select: {
          permissions: true,
          staffProfile: {
            select: { permissions: true },
          },
        },
      });
    }

    return normalizeUserPermissions(
      admin?.staffProfile?.permissions ?? admin?.permissions
    );
  } catch (error) {
    if (isMissingDatabaseObjectError(error)) {
      try {
        let legacyAdmin = null;

        if (sessionUser.id) {
          legacyAdmin = await prisma.admin.findUnique({
            where: { id: sessionUser.id },
            select: { permissions: true },
          });
        }

        if (!legacyAdmin && sessionUser.username) {
          legacyAdmin = await prisma.admin.findUnique({
            where: { username: sessionUser.username },
            select: { permissions: true },
          });
        }

        return normalizeUserPermissions(legacyAdmin?.permissions);
      } catch (fallbackError) {
        if (!isMissingDatabaseObjectError(fallbackError)) {
          throw fallbackError;
        }
      }

      return { ...DEFAULT_USER_PERMISSIONS };
    }

    throw error;
  }
}

export async function getCurrentTeacherPermissions(sessionUser?: SessionUserLike) {
  const activeSessionUser = sessionUser ?? ((await getServerSession(authOptions))?.user as SessionUserLike | undefined);

  if (!activeSessionUser) {
    return { ...DEFAULT_USER_PERMISSIONS };
  }

  return getTeacherPermissionsByUser(activeSessionUser);
}

export async function userHasRecordStudentsPermission(
  sessionUser?: SessionUserLike
) {
  const activeSessionUser = sessionUser ?? ((await getServerSession(authOptions))?.user as SessionUserLike | undefined);

  if (activeSessionUser?.role === "admin") {
    return true;
  }

  if (activeSessionUser?.role !== "teacher") {
    return false;
  }

  const permissions = await getTeacherPermissionsByUser(activeSessionUser);
  return permissions.recordStudents;
}

export async function userHasFeeEditPermission(
  sessionUser?: SessionUserLike
) {
  const activeSessionUser = sessionUser ?? ((await getServerSession(authOptions))?.user as SessionUserLike | undefined);

  if (!activeSessionUser) {
    return false;
  }

  if (activeSessionUser.role === "admin" && activeSessionUser.adminRole === "SUPER_ADMIN") {
    return true;
  }

  const permissions =
    activeSessionUser.role === "admin"
      ? await getAdminPermissionsByUser(activeSessionUser)
      : activeSessionUser.role === "teacher"
        ? await getTeacherPermissionsByUser(activeSessionUser)
        : { ...DEFAULT_USER_PERMISSIONS };

  return canEditFeeRecords(permissions);
}

export async function getCurrentFeeAccess(sessionUser?: SessionUserLike): Promise<FeeAccessContext> {
  const activeSessionUser = sessionUser ?? ((await getServerSession(authOptions))?.user as SessionUserLike | undefined);
  const role = activeSessionUser?.role || "";
  const isAdmin = role === "admin";
  const isSuperAdmin = isAdmin && activeSessionUser?.adminRole === "SUPER_ADMIN";

  if (isAdmin) {
    const canEditFeeRecordsForUser = await userHasFeeEditPermission(activeSessionUser);

    return {
      allowedTabs: [...getAllowedFeeTabs({
        ...DEFAULT_USER_PERMISSIONS,
        statement: true,
        prepareBill: true,
        admissions: true,
        paymentList: true,
        generateBill: true,
        arrearsPDF: true,
        schoolFees: true,
        receipt: true,
        viewDetail: true,
      })],
      canEditFeeRecords: canEditFeeRecordsForUser,
      canRecordFeePayments: true,
      hasModuleAccess: true,
      isAdmin,
      isSuperAdmin,
      permissions: {
        ...DEFAULT_USER_PERMISSIONS,
        editFeeRecords: canEditFeeRecordsForUser,
        statement: true,
        prepareBill: true,
        admissions: true,
        paymentList: true,
        generateBill: true,
        arrearsPDF: true,
        schoolFees: true,
        receipt: true,
        viewDetail: true,
      },
      role,
    };
  }

  const permissions = await getCurrentTeacherPermissions(activeSessionUser);
  const allowedTabs = role === "teacher" ? getAllowedFeeTabs(permissions) : [];

  return {
    allowedTabs,
    canEditFeeRecords: permissions.editFeeRecords,
    canRecordFeePayments: role === "teacher" && canRecordFeePayments(permissions),
    hasModuleAccess: allowedTabs.length > 0,
    isAdmin: false,
    isSuperAdmin: false,
    permissions,
    role,
  };
}

export async function userHasFeePermission(
  requiredPermission: FeePermissionKey,
  sessionUser?: SessionUserLike
) {
  const access = await getCurrentFeeAccess(sessionUser);

  if (access.isAdmin) {
    return true;
  }

  return Boolean(access.permissions[requiredPermission]);
}
