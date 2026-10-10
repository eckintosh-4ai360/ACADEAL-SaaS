import { headers } from "next/headers";
import {
  findTenantByHostname,
  getRequestHostname,
  resolveTenantContext,
} from "./tenant";

function trimToEmpty(value?: string | null) {
  return value?.trim() ?? "";
}

function withProtocol(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return `https://${url}`;
}

function extractHostname(value?: string | null) {
  const trimmed = trimToEmpty(value);
  if (!trimmed) return "";

  try {
    return new URL(withProtocol(trimmed)).hostname.toLowerCase();
  } catch {
    return trimmed.split("/")[0]?.split(":")[0]?.toLowerCase() ?? "";
  }
}

export function resolveAppBaseUrl() {
  const nextAuthUrl = trimToEmpty(process.env.NEXTAUTH_URL);
  const vercelUrl =
    trimToEmpty(process.env.VERCEL_URL) ||
    trimToEmpty(process.env.VERCEL_BRANCH_URL) ||
    trimToEmpty(process.env.VERCEL_PROJECT_PRODUCTION_URL);

  const isLocalhostUrl =
    nextAuthUrl.startsWith("http://localhost") ||
    nextAuthUrl.startsWith("https://localhost") ||
    nextAuthUrl.startsWith("http://127.0.0.1") ||
    nextAuthUrl.startsWith("https://127.0.0.1");

  if (process.env.NODE_ENV === "production") {
    if (nextAuthUrl && !isLocalhostUrl) {
      return nextAuthUrl.replace(/\/+$/, "");
    }

    if (vercelUrl) {
      return withProtocol(vercelUrl).replace(/\/+$/, "");
    }
  }

  if (nextAuthUrl) {
    return nextAuthUrl.replace(/\/+$/, "");
  }

  if (vercelUrl) {
    return withProtocol(vercelUrl).replace(/\/+$/, "");
  }

  return "http://localhost:3000";
}

/**
 * The base URL used to build links that leave the app — the login link inside
 * credential SMS and email, receipt links, payment callbacks.
 *
 * School links use the tenant's registered URL. Platform links stay on the
 * configured platform host. The request Host header is only consulted when
 * it matches one of those trusted cases: it is caller-supplied, and taking
 * it verbatim meant anyone who could trigger a credential send could point
 * the school's own SMS at a domain they controlled.
 */
export async function resolveCurrentAppBaseUrl() {
  let tenantContext: Awaited<ReturnType<typeof resolveTenantContext>> | null = null;
  let requestHostname = "";
  let requestHost = "";

  try {
    tenantContext = await resolveTenantContext();
  } catch {
    // Fall through to the environment configuration below.
  }

  try {
    const headersList = await headers();
    requestHost =
      trimToEmpty(headersList.get("x-forwarded-host")) ||
      trimToEmpty(headersList.get("host"));
    requestHostname = await getRequestHostname();

    const requestTenant = requestHostname
      ? await findTenantByHostname(requestHostname)
      : null;
    const configuredAppHostname = extractHostname(resolveAppBaseUrl());
    const isLocal =
      requestHostname === "localhost" || requestHostname === "127.0.0.1";

    // A platform request resolves to the default tenant for database access,
    // but its links must remain on the configured platform host.
    if (
      requestHost &&
      (isLocal ||
        (!requestTenant && requestHostname === configuredAppHostname))
    ) {
      const protocol =
        trimToEmpty(headersList.get("x-forwarded-proto")) ||
        (isLocal ? "http" : "https");

      return `${protocol}://${requestHost}`.replace(/\/+$/, "");
    }
  } catch {
    // Ignore request-scoped header failures and use the tenant/env fallback.
  }

  if (tenantContext?.tenant.publicAppUrl) {
    return tenantContext.tenant.publicAppUrl.replace(/\/+$/, "");
  }

  try {
    const headersList = await headers();
    const host =
      trimToEmpty(headersList.get("x-forwarded-host")) ||
      trimToEmpty(headersList.get("host"));

    const hostname = host.split(":")[0]?.toLowerCase() ?? "";
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
    const isTenantDomain = Boolean(
      tenantContext?.tenant.domains.some(
        (domain) => domain.toLowerCase() === hostname
      )
    );

    if (host && (isLocal || isTenantDomain)) {
      const protocol =
        trimToEmpty(headersList.get("x-forwarded-proto")) ||
        (isLocal ? "http" : "https");

      return `${protocol}://${host}`.replace(/\/+$/, "");
    }
  } catch {
    // Ignore request-scoped header failures and fall back to environment config.
  }

  return resolveAppBaseUrl();
}

