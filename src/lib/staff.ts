import { Prisma, type AdminRole, type PrismaClient, type UserSex } from "@prisma/client";
import { isMissingDatabaseObjectError } from "./prisma-errors";

type DbClient = PrismaClient | Prisma.TransactionClient;
type StaffKind = "ADMIN" | "TEACHER";

export type StaffProfilePayload = {
  adminRole?: AdminRole | null;
  address?: string | null;
  birthday?: Date | null;
  email?: string | null;
  img?: string | null;
  name: string;
  password: string;
  permissions?: unknown;
  phone?: string | null;
  sex?: UserSex | null;
  staffId: string;
  staffType: StaffKind;
  surname?: string | null;
  username: string;
};

function withPermissionsInput(value: unknown) {
  if (value === undefined) {
    return {};
  }

  return {
    permissions:
      value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue),
  };
}

function buildStaffWriteData(payload: StaffProfilePayload) {
  return {
    staffId: payload.staffId,
    username: payload.username,
    password: payload.password,
    name: payload.name,
    surname: payload.surname ?? null,
    email: payload.email ?? null,
    phone: payload.phone ?? null,
    address: payload.address ?? null,
    img: payload.img ?? null,
    sex: payload.sex ?? null,
    birthday: payload.birthday ?? null,
    staffType: payload.staffType,
    adminRole: payload.staffType === "ADMIN" ? payload.adminRole ?? null : null,
    ...withPermissionsInput(payload.permissions),
  };
}

export async function upsertStaffProfile(
  db: DbClient,
  payload: StaffProfilePayload
) {
  try {
    return await db.staff.upsert({
      where: { staffId: payload.staffId },
      update: buildStaffWriteData(payload),
      create: buildStaffWriteData(payload),
    });
  } catch (error) {
    if (isMissingDatabaseObjectError(error)) {
      return null;
    }

    throw error;
  }
}

export async function deleteStaffProfile(
  db: DbClient,
  params: { staffId?: string | null; staffProfileId?: string | null }
) {
  try {
    if (params.staffProfileId) {
      await db.staff.deleteMany({
        where: { id: params.staffProfileId },
      });
      return;
    }

    if (params.staffId) {
      await db.staff.deleteMany({
        where: { staffId: params.staffId },
      });
    }
  } catch (error) {
    if (isMissingDatabaseObjectError(error)) {
      return;
    }

    throw error;
  }
}

export async function findStaffAccountByLoginId(
  db: DbClient,
  params: { loginId: string; staffType: StaffKind }
) {
  try {
    return await db.staff.findFirst({
      where: {
        staffType: params.staffType,
        OR: [
          {
            staffId: {
              equals: params.loginId,
              mode: "insensitive",
            },
          },
          {
            username: {
              equals: params.loginId,
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        id: true,
        staffId: true,
        username: true,
        password: true,
        name: true,
        surname: true,
        adminRole: true,
        admin: {
          select: {
            id: true,
            role: true,
          },
        },
        teacher: {
          select: {
            id: true,
          },
        },
      },
    });
  } catch (error) {
    if (isMissingDatabaseObjectError(error)) {
      return null;
    }

    throw error;
  }
}
