import type { PrismaClient } from "@prisma/client";
import prisma from "./prisma";

const MAX_FAILED_ATTEMPTS = 5;
const MAX_LOCKOUT_MINUTES = 15;

/**
 * Lockout length grows with the number of failures past the threshold: 1, 2,
 * 4, 8, then capped at 15 minutes.
 *
 * A flat 15-minute lock is a denial-of-service handle — staff IDs are not
 * secret, so anyone could keep a specific teacher or administrator locked out
 * indefinitely with five wrong guesses every quarter hour. Backing off still
 * makes online guessing hopeless while keeping the cost of a malicious lock
 * low for the person being targeted.
 */
function lockoutMinutesFor(failedCount: number) {
  const overage = Math.max(0, failedCount - MAX_FAILED_ATTEMPTS);
  return Math.min(MAX_LOCKOUT_MINUTES, 2 ** overage);
}

/**
 * Checks if a user is currently locked out.
 * Returns information about the lockout status and remaining time.
 */
type LockoutClient = Pick<PrismaClient, "loginAttempt">;

function resolveLockoutClient(client?: LockoutClient) {
  return client ?? prisma;
}

export async function checkLockout(identifier: string, client?: LockoutClient) {
  const lockoutClient = resolveLockoutClient(client);
  const loginAttempt = await lockoutClient.loginAttempt.findUnique({
    where: { identifier: identifier.toLowerCase() },
  });

  if (!loginAttempt || !loginAttempt.lockedUntil) {
    return { locked: false };
  }

  const now = new Date();
  if (now < loginAttempt.lockedUntil) {
    const remainingMs = loginAttempt.lockedUntil.getTime() - now.getTime();
    const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
    return { 
      locked: true, 
      remainingMinutes 
    };
  }

  // Lockout expired - we don't clear it here, resetAttempts will handle it on success,
  // or recordFailedAttempt will handle it on next failure.
  return { locked: false };
}

/**
 * Records a failed login attempt. 
 * If attempts exceed threshold, sets the lockout timestamp.
 */
export async function recordFailedAttempt(identifier: string, client?: LockoutClient) {
  const lockoutClient = resolveLockoutClient(client);
  const id = identifier.toLowerCase();
  const now = new Date();
  
  const loginAttempt = await lockoutClient.loginAttempt.upsert({
    where: { identifier: id },
    update: {
      failedCount: { increment: 1 },
      lastAttempt: now,
    },
    create: {
      identifier: id,
      failedCount: 1,
      lastAttempt: now,
    },
  });

  if (loginAttempt.failedCount >= MAX_FAILED_ATTEMPTS) {
    const minutes = lockoutMinutesFor(loginAttempt.failedCount);
    const lockedUntil = new Date(now.getTime() + minutes * 60 * 1000);
    await lockoutClient.loginAttempt.update({
      where: { identifier: id },
      data: { lockedUntil },
    });
    return { locked: true, remainingMinutes: minutes };
  }

  return { locked: false };
}

/**
 * Resets failed attempts for an identifier. 
 * Called upon successful login.
 */
export async function resetAttempts(identifier: string, client?: LockoutClient) {
  const lockoutClient = resolveLockoutClient(client);
  try {
    await lockoutClient.loginAttempt.delete({
      where: { identifier: identifier.toLowerCase() },
    });
  } catch {
    // Ignore if record doesn't exist
  }
}
