/**
 * Central authorization guard.
 *
 * Every API route handler and every exported server action must pass through
 * one of these before touching data. Server actions are dispatched by action
 * ID rather than by URL, so the route matrix in `src/proxy.ts` never sees them
 * — an action reached from a public page is completely ungated unless it
 * checks for itself. These helpers are that check.
 *
 * Two calling conventions:
 *   - `requireX()` throws `AuthorizationError`. Use in server actions, where
 *     the surrounding try/catch already converts thrown errors to a result.
 *   - `guardX()` returns a discriminated union. Use in route handlers, where
 *     the failure needs to become a specific HTTP status.
 */

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  userHasFeePermission,
  userHasFeeEditPermission,
  userHasRecordStudentsPermission,
} from "@/lib/user-permissions-server";
import type { FeePermissionKey } from "@/lib/user-permissions";

export type UserRole = "admin" | "teacher" | "student" | "parent";
export type AdminRole = "SUPER_ADMIN" | "ADMIN";

export type ActorContext = {
  id: string;
  loginId: string;
  username: string;
  name?: string | null;
  role: UserRole;
  adminRole?: AdminRole;
  tenantId: string;
  tenantSlug: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
};

export class AuthorizationError extends Error {
  readonly status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "AuthorizationError";
    this.status = status;
  }
}

export function isAuthorizationError(error: unknown): error is AuthorizationError {
  return error instanceof AuthorizationError;
}

function toActorContext(sessionUser: {
  id?: string;
  loginId?: string;
  username?: string;
  name?: string | null;
  role?: UserRole;
  adminRole?: AdminRole;
  tenantId?: string;
  tenantSlug?: string;
}): ActorContext {
  const role = sessionUser.role as UserRole;

  return {
    id: sessionUser.id || "",
    loginId: sessionUser.loginId || "",
    username: sessionUser.username || "",
    name: sessionUser.name ?? null,
    role,
    adminRole: sessionUser.adminRole,
    tenantId: sessionUser.tenantId || "",
    tenantSlug: sessionUser.tenantSlug || "",
    isAdmin: role === "admin",
    isSuperAdmin: role === "admin" && sessionUser.adminRole === "SUPER_ADMIN",
  };
}

/**
 * Resolves the current actor, or null when there is no valid session.
 * Prefer `requireSession` unless an anonymous caller is genuinely allowed.
 */
export async function getActor(): Promise<ActorContext | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role) {
    return null;
  }

  return toActorContext(session.user);
}

// ── Throwing variants — for server actions ──────────────────────────────────

export async function requireSession(): Promise<ActorContext> {
  const actor = await getActor();

  if (!actor) {
    throw new AuthorizationError("You must be signed in to do that.", 401);
  }

  return actor;
}

export async function requireRole(...roles: UserRole[]): Promise<ActorContext> {
  const actor = await requireSession();

  if (!roles.includes(actor.role)) {
    throw new AuthorizationError("You do not have permission to do that.", 403);
  }

  return actor;
}

export async function requireAdmin(): Promise<ActorContext> {
  return requireRole("admin");
}

export async function requireStaff(): Promise<ActorContext> {
  return requireRole("admin", "teacher");
}

export async function requireRecordStudentsAccess(): Promise<ActorContext> {
  const actor = await requireStaff();

  if (!(await userHasRecordStudentsPermission(actor))) {
    throw new AuthorizationError(
      "You do not have permission to record student admissions.",
      403
    );
  }

  return actor;
}

export async function requireFeeEditAccess(): Promise<ActorContext> {
  const actor = await requireStaff();

  if (!(await userHasFeeEditPermission(actor))) {
    throw new AuthorizationError(
      "You do not have permission to edit fee records.",
      403
    );
  }

  return actor;
}

export async function requireSuperAdmin(): Promise<ActorContext> {
  const actor = await requireAdmin();

  if (!actor.isSuperAdmin) {
    throw new AuthorizationError("Only super admins can do that.", 403);
  }

  return actor;
}

/**
 * Confirms the actor is the owner of `ownerId`, or an admin acting on someone
 * else's record. Use wherever an action takes a user ID from its caller.
 */
export async function requireSelfOrAdmin(ownerId: string): Promise<ActorContext> {
  const actor = await requireSession();

  if (actor.isAdmin || actor.id === ownerId) {
    return actor;
  }

  throw new AuthorizationError("You can only modify your own record.", 403);
}

/**
 * Confirms the actor may see a particular student's records.
 *
 * Staff see any student. A student sees only themselves. A guardian sees only
 * the children linked to their account — the link is re-read from the database
 * rather than trusted from the request, because the student ID here arrives
 * from the caller.
 */
export async function requireStudentAccess(
  studentId: string
): Promise<ActorContext> {
  const actor = await requireSession();

  if (!studentId) {
    throw new AuthorizationError("A student must be specified.", 400);
  }

  if (actor.role === "admin" || actor.role === "teacher") {
    return actor;
  }

  if (actor.role === "student") {
    const self = await prisma.student.findFirst({
      where: { id: studentId, username: actor.username },
      select: { id: true },
    });

    if (self) {
      return actor;
    }
  }

  if (actor.role === "parent") {
    const child = await prisma.student.findFirst({
      where: { id: studentId, parent: { username: actor.username } },
      select: { id: true },
    });

    if (child) {
      return actor;
    }
  }

  throw new AuthorizationError("You cannot view that student's records.", 403);
}

/**
 * Requires staff plus a specific fee permission.
 *
 * Admins hold every fee permission; teachers hold whatever is stored on their
 * profile. Students and guardians hold none, so this also keeps them out of
 * the finance actions entirely.
 */
export async function requireFeeAccess(
  permission: FeePermissionKey
): Promise<ActorContext> {
  const actor = await requireStaff();

  if (!(await userHasFeePermission(permission))) {
    throw new AuthorizationError(
      "You do not have permission to use this part of the finance module.",
      403
    );
  }

  return actor;
}

// ── Result variants — for route handlers ────────────────────────────────────

type GuardSuccess = { ok: true; actor: ActorContext };
type GuardFailure = { ok: false; response: NextResponse };
export type GuardResult = GuardSuccess | GuardFailure;

function guardFailure(message: string, status: number): GuardFailure {
  return {
    ok: false,
    response: NextResponse.json({ error: message }, { status }),
  };
}

export async function guardSession(): Promise<GuardResult> {
  const actor = await getActor();

  if (!actor) {
    return guardFailure("Unauthorized", 401);
  }

  return { ok: true, actor };
}

export async function guardRole(...roles: UserRole[]): Promise<GuardResult> {
  const result = await guardSession();

  if (!result.ok) {
    return result;
  }

  if (!roles.includes(result.actor.role)) {
    return guardFailure("Forbidden", 403);
  }

  return result;
}

export async function guardAdmin(): Promise<GuardResult> {
  return guardRole("admin");
}

export async function guardStaff(): Promise<GuardResult> {
  return guardRole("admin", "teacher");
}

export async function guardSuperAdmin(): Promise<GuardResult> {
  const result = await guardAdmin();

  if (!result.ok) {
    return result;
  }

  if (!result.actor.isSuperAdmin) {
    return guardFailure("Forbidden", 403);
  }

  return result;
}

/**
 * Converts a thrown `AuthorizationError` into the `ActionState` shape the
 * server actions in this codebase already return, so a denied action reads the
 * same as any other failure to the calling form.
 */
export function toActionFailure(error: unknown) {
  if (isAuthorizationError(error)) {
    return { success: false, error: true, message: error.message };
  }

  return null;
}
