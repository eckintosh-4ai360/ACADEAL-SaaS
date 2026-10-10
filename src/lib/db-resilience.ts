const DB_FAILURE_COOLDOWN_MS = Number(
  process.env.DB_FAILURE_COOLDOWN_MS ?? 30_000
);

type DbFailureState = {
  lastFailureAt: number | null;
};

const globalForDbResilience = globalThis as typeof globalThis & {
  __dbFailureState?: DbFailureState;
};

function getState(): DbFailureState {
  if (!globalForDbResilience.__dbFailureState) {
    globalForDbResilience.__dbFailureState = {
      lastFailureAt: null,
    };
  }

  return globalForDbResilience.__dbFailureState;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.toLowerCase();
  }

  return String(error).toLowerCase();
}

export function isTransientDatabaseError(error: unknown) {
  const message = getErrorMessage(error);

  return [
    "connection terminated due to connection timeout",
    "connection terminated unexpectedly",
    "can't reach database server",
    "timed out fetching a new connection from the connection pool",
    "server closed the connection unexpectedly",
    "socket hang up",
    "econnreset",
    "etimedout",
  ].some((fragment) => message.includes(fragment));
}

export function markDatabaseFailure(error: unknown) {
  if (!isTransientDatabaseError(error)) {
    return false;
  }

  getState().lastFailureAt = Date.now();
  return true;
}

export function clearDatabaseFailure() {
  getState().lastFailureAt = null;
}

export function shouldBypassDatabase() {
  const lastFailureAt = getState().lastFailureAt;

  if (lastFailureAt === null) {
    return false;
  }

  return Date.now() - lastFailureAt < DB_FAILURE_COOLDOWN_MS;
}
