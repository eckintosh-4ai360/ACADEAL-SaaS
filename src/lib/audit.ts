import { randomUUID } from "crypto";
import prisma from "./prisma";

export type AuditLogStatusValue = "SUCCESS" | "FAILURE";

export interface AuditActor {
  id?: string | null;
  loginId?: string | null;
  name?: string | null;
  role?: string | null;
}

export interface AuditEntity {
  type?: string | null;
  id?: string | number | null;
  label?: string | null;
}

export interface WriteAuditLogInput {
  action: string;
  category: string;
  summary?: string | null;
  status?: AuditLogStatusValue;
  source?: string | null;
  path?: string | null;
  ipAddress?: string | null;
  requestId?: string | null;
  durationMs?: number | null;
  createdAt?: Date;
  actor?: AuditActor | null;
  entity?: AuditEntity | null;
  metadata?: Record<string, unknown> | null;
}

type HeaderLookup = {
  get(name: string): string | null;
};

type SerializableValue =
  | string
  | number
  | boolean
  | null
  | SerializableValue[]
  | { [key: string]: SerializableValue };

const DEFAULT_SUMMARY_FALLBACK = "Audited action recorded";
const DEFAULT_SOURCE = "server_action";
const MAX_STRING_LENGTH = 300;
const MAX_ARRAY_LENGTH = 25;
const MAX_OBJECT_KEYS = 25;
const MAX_DEPTH = 4;

function truncateString(value: string) {
  if (value.length <= MAX_STRING_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_STRING_LENGTH - 1)}...`;
}

function sanitizeMetadataValue(
  value: unknown,
  depth = 0
): SerializableValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return truncateString(value);
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: truncateString(value.message),
    };
  }

  if (depth >= MAX_DEPTH) {
    return "[truncated]";
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_LENGTH)
      .map((item) => sanitizeMetadataValue(item, depth + 1))
      .filter((item): item is SerializableValue => item !== undefined);
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).slice(
      0,
      MAX_OBJECT_KEYS
    );
    const sanitizedObject: Record<string, SerializableValue> = {};

    for (const [key, item] of entries) {
      const sanitized = sanitizeMetadataValue(item, depth + 1);
      if (sanitized !== undefined) {
        sanitizedObject[key] = sanitized;
      }
    }

    return sanitizedObject;
  }

  return truncateString(String(value));
}

function sanitizeMetadata(
  metadata?: Record<string, unknown> | null
): Record<string, SerializableValue> | null {
  if (!metadata) {
    return null;
  }

  const sanitized = sanitizeMetadataValue(metadata);
  if (!sanitized || Array.isArray(sanitized) || typeof sanitized !== "object") {
    return null;
  }

  return sanitized;
}

function logfmtValue(value: string | number | boolean) {
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (/^[A-Za-z0-9._:/-]+$/.test(value)) {
    return value;
  }

  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function buildCanonicalAuditLine(params: {
  requestId: string;
  action: string;
  category: string;
  status: AuditLogStatusValue;
  summary: string;
  source: string;
  path?: string | null;
  ipAddress?: string | null;
  durationMs?: number | null;
  actor?: AuditActor | null;
  entity?: AuditEntity | null;
  metadata?: Record<string, SerializableValue> | null;
  createdAt: Date;
}) {
  const metadataKeys = params.metadata
    ? Object.keys(params.metadata).sort().join(",")
    : null;

  const pairs: Array<[string, string | number | boolean | null | undefined]> = [
    ["action", params.action],
    ["actor_id", params.actor?.id ?? null],
    ["actor_login_id", params.actor?.loginId ?? null],
    ["actor_name", params.actor?.name ?? null],
    ["actor_role", params.actor?.role ?? null],
    ["category", params.category],
    ["created_at", params.createdAt.toISOString()],
    ["duration_ms", params.durationMs ?? null],
    ["entity_id", params.entity?.id != null ? String(params.entity.id) : null],
    ["entity_label", params.entity?.label ?? null],
    ["entity_type", params.entity?.type ?? null],
    ["ip_address", params.ipAddress ?? null],
    ["metadata_keys", metadataKeys],
    ["path", params.path ?? null],
    ["request_id", params.requestId],
    ["source", params.source],
    ["status", params.status],
    ["summary", params.summary],
  ];

  const formattedPairs = pairs
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${logfmtValue(value as string | number | boolean)}`);

  return `canonical-audit-log ${formattedPairs.join(" ")}`;
}

export function resolveClientIp(headersLike: HeaderLookup) {
  const forwardedFor = headersLike.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  return headersLike.get("x-real-ip") || headersLike.get("cf-connecting-ip");
}

export function resolveRequestPath(headersLike: HeaderLookup) {
  const headerValue =
    headersLike.get("next-url") ||
    headersLike.get("x-invoke-path") ||
    headersLike.get("referer");

  if (!headerValue) {
    return null;
  }

  try {
    if (headerValue.startsWith("/")) {
      return headerValue;
    }

    return new URL(headerValue).pathname;
  } catch {
    return headerValue;
  }
}

export async function writeAuditLog({
  action,
  category,
  summary,
  status = "SUCCESS",
  source = DEFAULT_SOURCE,
  path = null,
  ipAddress = null,
  requestId,
  durationMs = null,
  createdAt,
  actor = null,
  entity = null,
  metadata = null,
}: WriteAuditLogInput) {
  try {
    const prismaRecord = prisma as unknown as Record<string, unknown>;

    if (!prismaRecord.auditLog) {
      console.warn(
        "Prisma AuditLog model not found in client. Run 'npx prisma generate' and apply the latest migration."
      );
      return;
    }

    const eventTime = createdAt ?? new Date();
    const resolvedRequestId = requestId?.trim() || randomUUID();
    const resolvedSource = source?.trim() || DEFAULT_SOURCE;
    const sanitizedMetadata = sanitizeMetadata(metadata);
    const resolvedSummary =
      summary?.trim() || `${action.replace(/\./g, " ")} ${status.toLowerCase()}` || DEFAULT_SUMMARY_FALLBACK;
    const canonicalLine = buildCanonicalAuditLine({
      requestId: resolvedRequestId,
      action,
      category,
      status,
      summary: resolvedSummary,
      source: resolvedSource,
      path,
      ipAddress,
      durationMs,
      actor,
      entity,
      metadata: sanitizedMetadata,
      createdAt: eventTime,
    });

    console.info(canonicalLine);

    await prisma.auditLog.create({
      data: {
        requestId: resolvedRequestId,
        action,
        category,
        status,
        actorId: actor?.id ?? null,
        actorLoginId: actor?.loginId ?? null,
        actorName: actor?.name ?? null,
        actorRole: actor?.role ?? null,
        entityType: entity?.type ?? null,
        entityId: entity?.id != null ? String(entity.id) : null,
        entityLabel: entity?.label ?? null,
        source: resolvedSource,
        path,
        ipAddress,
        summary: resolvedSummary,
        metadata: sanitizedMetadata ?? undefined,
        canonicalLine,
        durationMs,
        createdAt: eventTime,
      },
    });
  } catch (error) {
    console.error("Error writing audit log:", error);
  }
}
