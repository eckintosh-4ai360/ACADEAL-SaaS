import prisma from "./prisma";

/**
 * Database-backed request throttle.
 *
 * The previous implementation was an in-memory Map: it reset on every deploy,
 * was not shared between serverless instances, and never evicted entries. The
 * counters live in the LoginAttempt table instead, under a namespaced
 * identifier, so a limit holds across instances and restarts. That table
 * already exists and is already keyed by a unique string, so this needs no
 * migration.
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 5;

export type RateLimitResult = {
  limited: boolean;
  retryAfterSeconds: number;
};

function namespacedKey(namespace: string, key: string) {
  return `rl:${namespace}:${key}`.toLowerCase().slice(0, 191);
}

export async function checkRateLimit(
  key: string,
  options?: { namespace?: string; max?: number; windowMs?: number }
): Promise<RateLimitResult> {
  const namespace = options?.namespace ?? "default";
  const max = options?.max ?? MAX_REQUESTS;
  const windowMs = options?.windowMs ?? WINDOW_MS;
  const identifier = namespacedKey(namespace, key);
  const now = new Date();

  try {
    const existing = await prisma.loginAttempt.findUnique({
      where: { identifier },
      select: { failedCount: true, lastAttempt: true },
    });

    //* A window that has already elapsed starts over rather than accumulating.
    const windowExpired =
      !existing || now.getTime() - existing.lastAttempt.getTime() > windowMs;

    if (windowExpired) {
      await prisma.loginAttempt.upsert({
        where: { identifier },
        update: { failedCount: 1, lastAttempt: now, lockedUntil: null },
        create: { identifier, failedCount: 1, lastAttempt: now },
      });

      return { limited: false, retryAfterSeconds: 0 };
    }

    if (existing.failedCount >= max) {
      const elapsed = now.getTime() - existing.lastAttempt.getTime();
      return {
        limited: true,
        retryAfterSeconds: Math.max(1, Math.ceil((windowMs - elapsed) / 1000)),
      };
    }

    await prisma.loginAttempt.update({
      where: { identifier },
      data: { failedCount: { increment: 1 } },
    });

    return { limited: false, retryAfterSeconds: 0 };
  } catch (error) {
    //* A throttle that cannot reach the database must not take the endpoint
    //* down with it; the endpoint's own auth checks still apply.
    console.error("Rate limit check failed; allowing request:", error);
    return { limited: false, retryAfterSeconds: 0 };
  }
}

export async function clearRateLimit(namespace: string, key: string) {
  try {
    await prisma.loginAttempt.delete({
      where: { identifier: namespacedKey(namespace, key) },
    });
  } catch {
    // Nothing recorded for this key.
  }
}
