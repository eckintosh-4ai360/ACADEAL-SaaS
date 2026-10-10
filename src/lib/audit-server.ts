import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import {
  resolveClientIp,
  resolveRequestPath,
  writeAuditLog,
  type WriteAuditLogInput,
} from "./audit";

type ServerAuditInput = WriteAuditLogInput;

export async function writeServerAuditLog(input: ServerAuditInput) {
  const [session, headersList] = await Promise.all([
    getServerSession(authOptions),
    headers(),
  ]);

  return writeAuditLog({
    ...input,
    actor:
      input.actor ??
      (session?.user
        ? {
            id: session.user.id || null,
            loginId: session.user.loginId || null,
            name: session.user.name || null,
            role: session.user.role || null,
          }
        : null),
    path: input.path ?? resolveRequestPath(headersList),
    ipAddress: input.ipAddress ?? resolveClientIp(headersList),
    source: input.source ?? "server_action",
  });
}
