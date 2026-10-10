function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function isMissingDatabaseColumnError(error: unknown) {
  if (typeof error === "object" && error !== null) {
    const code = (error as { code?: unknown }).code;

    if (code === "P2022") {
      return true;
    }
  }

  const message = getErrorMessage(error);
  return message.includes("does not exist in the current database");
}

export function isMissingDatabaseObjectError(error: unknown) {
  if (typeof error === "object" && error !== null) {
    const code = (error as { code?: unknown }).code;

    if (code === "P2021" || code === "P2022") {
      return true;
    }
  }

  const message = getErrorMessage(error);
  return (
    message.includes("does not exist in the current database") ||
    message.includes("does not exist") ||
    message.includes("relation \"Staff\" does not exist")
  );
}
