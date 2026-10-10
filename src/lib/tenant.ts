import { cookies, headers } from "next/headers";
import { decode as decodeAuthToken } from "next-auth/jwt";
import { listControlPlaneSchoolTenants } from "./control-plane";

export const TENANT_HINT_COOKIE_NAME = "sms_tenant";

//* NextAuth default cookie names; the secure variant is used over HTTPS.
const SESSION_COOKIE_NAMES = [
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
];

export class TenantResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantResolutionError";
  }
}

export type TenantDefinition = {
  id: string;
  slug: string;
  schoolName: string;
  domains: string[];
  loginCodes: string[];
  publicAppUrl: string | null;
  databaseUrl: string;
  directUrl: string | null;
  databaseUrlUnpooled: string | null;
  enabled: boolean;
};

export type TenantPublicDefinition = Pick<
  TenantDefinition,
  "id" | "slug" | "schoolName" | "domains" | "publicAppUrl"
>;

export type TenantResolutionSource =
  | "session"
  | "host"
  | "school_code"
  | "cookie"
  | "default";

export type TenantResolution = {
  tenant: TenantDefinition;
  source: TenantResolutionSource;
  hostname: string | null;
  hint: string | null;
};

type TenantRegistryInput = {
  id?: string;
  slug?: string;
  schoolName?: string;
  name?: string;
  domains?: string[];
  loginCodes?: string[];
  aliases?: string[];
  publicAppUrl?: string | null;
  databaseUrl?: string;
  directUrl?: string | null;
  databaseUrlUnpooled?: string | null;
  enabled?: boolean;
};

type TenantRegistryCache = {
  raw: string;
  fetchedAt: number;
  tenants: TenantDefinition[];
};

const TENANT_REGISTRY_CACHE_TTL_MS = Number(
  process.env.TENANT_REGISTRY_CACHE_TTL_MS ?? 15_000
);

const globalForTenants = globalThis as typeof globalThis & {
  __tenantRegistryCache?: TenantRegistryCache;
};

function trimToEmpty(value?: string | null) {
  return value?.trim() ?? "";
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function normalizeCode(value?: string | null) {
  return trimToEmpty(value).toLowerCase();
}

function withProtocol(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return `https://${url}`;
}

function normalizeHostname(value?: string | null) {
  const trimmed = trimToEmpty(value).toLowerCase();

  if (!trimmed) {
    return "";
  }

  const withoutProtocol = trimmed.replace(/^https?:\/\//, "");
  const withoutPath = withoutProtocol.split("/")[0] ?? withoutProtocol;
  const withoutPort = withoutPath.split(":")[0] ?? withoutPath;

  return withoutPort.trim();
}

function extractHostname(value?: string | null) {
  const trimmed = trimToEmpty(value);

  if (!trimmed) {
    return "";
  }

  try {
    return normalizeHostname(new URL(withProtocol(trimmed)).hostname);
  } catch {
    return normalizeHostname(trimmed);
  }
}

function normalizePublicUrl(value?: string | null) {
  const trimmed = trimToEmpty(value);

  if (!trimmed) {
    return null;
  }

  return withProtocol(trimmed).replace(/\/+$/, "");
}

function matchesDomain(hostname: string, domainRule: string) {
  if (!hostname || !domainRule) {
    return false;
  }

  if (domainRule.startsWith("*.")) {
    const suffix = domainRule.slice(2);
    return hostname === suffix || hostname.endsWith(`.${suffix}`);
  }

  return hostname === domainRule;
}

function normalizeTenantEntry(
  entry: TenantRegistryInput,
  index: number
): TenantDefinition | null {
  if (entry.enabled === false) {
    return null;
  }

  const slug = normalizeCode(entry.slug);

  if (!slug) {
    throw new Error(`TENANT_DIRECTORY_JSON entry at index ${index} is missing a slug.`);
  }

  const schoolName =
    trimToEmpty(entry.schoolName) ||
    trimToEmpty(entry.name) ||
    slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (value) => value.toUpperCase());

  const publicAppUrl = normalizePublicUrl(entry.publicAppUrl);
  const domains = unique(
    [
      ...(entry.domains ?? []).map((value) => normalizeHostname(value)).filter(Boolean),
      extractHostname(publicAppUrl),
    ].filter(Boolean)
  );

  const loginCodes = unique(
    [slug, ...(entry.loginCodes ?? []), ...(entry.aliases ?? [])]
      .map((value) => normalizeCode(value))
      .filter(Boolean)
  );

  const databaseUrl = trimToEmpty(entry.databaseUrl);

  if (!databaseUrl) {
    throw new Error(`Tenant "${slug}" is missing databaseUrl in TENANT_DIRECTORY_JSON.`);
  }

  return {
    id: trimToEmpty(entry.id) || slug,
    slug,
    schoolName,
    domains,
    loginCodes,
    publicAppUrl,
    databaseUrl,
    directUrl: trimToEmpty(entry.directUrl) || null,
    databaseUrlUnpooled: trimToEmpty(entry.databaseUrlUnpooled) || null,
    enabled: true,
  };
}

function buildFallbackTenant(): TenantDefinition {
  const publicAppUrl = normalizePublicUrl(process.env.NEXTAUTH_URL || process.env.VERCEL_URL || null);
  const fallbackDomains = unique(
    [
      extractHostname(publicAppUrl),
      extractHostname(process.env.VERCEL_BRANCH_URL),
      extractHostname(process.env.VERCEL_PROJECT_PRODUCTION_URL),
      "localhost",
      "127.0.0.1",
    ].filter(Boolean)
  );

  return {
    id: normalizeCode(process.env.DEFAULT_TENANT_ID) || normalizeCode(process.env.DEFAULT_TENANT_SLUG) || "default",
    slug: normalizeCode(process.env.DEFAULT_TENANT_SLUG) || "default",
    schoolName:
      trimToEmpty(process.env.DEFAULT_SCHOOL_NAME) ||
      trimToEmpty(process.env.SCHOOL_NAME) ||
      "Student Management System",
    domains: fallbackDomains,
    loginCodes: unique(
      [
        normalizeCode(process.env.DEFAULT_TENANT_SLUG) || "default",
        normalizeCode(process.env.DEFAULT_SCHOOL_CODE),
      ].filter(Boolean)
    ),
    publicAppUrl,
    databaseUrl:
      trimToEmpty(process.env.DATABASE_URL) ||
      trimToEmpty(process.env.DATABASE_URL_UNPOOLED) ||
      trimToEmpty(process.env.DIRECT_URL),
    directUrl: trimToEmpty(process.env.DIRECT_URL) || null,
    databaseUrlUnpooled: trimToEmpty(process.env.DATABASE_URL_UNPOOLED) || null,
    enabled: true,
  };
}

function getEnvTenantRegistry(raw: string) {
  if (!raw) {
    return [buildFallbackTenant()];
  }

  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("TENANT_DIRECTORY_JSON must be a JSON array.");
  }

  const tenants = parsed
    .map((entry, index) => normalizeTenantEntry(entry as TenantRegistryInput, index))
    .filter((entry): entry is TenantDefinition => Boolean(entry));

  if (tenants.length === 0) {
    throw new Error("TENANT_DIRECTORY_JSON did not produce any enabled tenants.");
  }

  return tenants;
}

function mergeTenantRegistries(primary: TenantDefinition[], secondary: TenantDefinition[]) {
  const merged = new Map<string, TenantDefinition>();

  for (const tenant of primary) {
    merged.set(tenant.slug, tenant);
  }

  for (const tenant of secondary) {
    if (!merged.has(tenant.slug)) {
      merged.set(tenant.slug, tenant);
    }
  }

  return Array.from(merged.values());
}

function mapControlPlaneTenantToDefinition(
  tenant: Awaited<ReturnType<typeof listControlPlaneSchoolTenants>>[number]
): TenantDefinition {
  return {
    id: tenant.id,
    slug: normalizeCode(tenant.slug),
    schoolName: tenant.schoolName,
    domains: unique(tenant.domains.map((domain) => normalizeHostname(domain)).filter(Boolean)),
    loginCodes: unique(
      [tenant.slug, ...tenant.loginCodes].map((code) => normalizeCode(code)).filter(Boolean)
    ),
    publicAppUrl: normalizePublicUrl(tenant.publicAppUrl),
    databaseUrl: trimToEmpty(tenant.databaseUrl),
    directUrl: trimToEmpty(tenant.directUrl) || null,
    databaseUrlUnpooled: trimToEmpty(tenant.databaseUrlUnpooled) || null,
    enabled: tenant.enabled,
  };
}

async function getRequestHeadersSafely() {
  try {
    return await headers();
  } catch {
    return null;
  }
}

async function getRequestCookiesSafely() {
  try {
    return await cookies();
  } catch {
    return null;
  }
}

async function loadTenantRegistry() {
  const raw = trimToEmpty(process.env.TENANT_DIRECTORY_JSON);
  const cached = globalForTenants.__tenantRegistryCache;

  if (
    cached &&
    cached.raw === raw &&
    Date.now() - cached.fetchedAt <= TENANT_REGISTRY_CACHE_TTL_MS
  ) {
    return cached.tenants;
  }

  const envTenants = getEnvTenantRegistry(raw);
  let tenants = envTenants;

  try {
    const controlPlaneRecords = await listControlPlaneSchoolTenants();
    const disabledControlPlaneSlugs = new Set(
      controlPlaneRecords
        .filter((tenant) => !tenant.enabled)
        .map((tenant) => normalizeCode(tenant.slug))
        .filter(Boolean)
    );
    const filteredEnvTenants = envTenants.filter(
      (tenant) => !disabledControlPlaneSlugs.has(tenant.slug)
    );
    const controlPlaneTenants = controlPlaneRecords
      .filter((tenant) => tenant.enabled)
      .map((tenant) => mapControlPlaneTenantToDefinition(tenant));

    if (controlPlaneTenants.length > 0) {
      tenants = mergeTenantRegistries(controlPlaneTenants, filteredEnvTenants);
    } else {
      tenants = filteredEnvTenants;
    }
  } catch (error) {
    console.error("Falling back to environment tenant registry after control-plane lookup failed:", error);
  }

  if (tenants.length === 0) {
    tenants = [buildFallbackTenant()];
  }

  globalForTenants.__tenantRegistryCache = {
    raw,
    fetchedAt: Date.now(),
    tenants,
  };

  return tenants;
}

export function clearTenantRegistryCache() {
  globalForTenants.__tenantRegistryCache = undefined;
}

export async function listTenants() {
  return loadTenantRegistry();
}

export async function getDefaultTenant() {
  const requestedSlug = normalizeCode(process.env.DEFAULT_TENANT_SLUG);
  const tenants = await loadTenantRegistry();

  return tenants.find((tenant) => tenant.slug === requestedSlug) ?? tenants[0];
}

export function getTenantPublicProfile(tenant: TenantDefinition): TenantPublicDefinition {
  return {
    id: tenant.id,
    slug: tenant.slug,
    schoolName: tenant.schoolName,
    domains: tenant.domains,
    publicAppUrl: tenant.publicAppUrl,
  };
}

export async function findTenantByHostname(hostname?: string | null) {
  const normalizedHostname = normalizeHostname(hostname);

  if (!normalizedHostname) {
    return null;
  }

  const tenants = await loadTenantRegistry();

  return (
    tenants.find((tenant) =>
      tenant.domains.some((domainRule) => matchesDomain(normalizedHostname, domainRule))
    ) ?? null
  );
}

export async function findTenantBySchoolCode(value?: string | null) {
  const normalizedCode = normalizeCode(value);

  if (!normalizedCode) {
    return null;
  }

  const tenants = await loadTenantRegistry();

  return (
    tenants.find(
      (tenant) =>
        tenant.slug === normalizedCode || tenant.loginCodes.includes(normalizedCode)
    ) ?? null
  );
}

export async function getTenantHint() {
  const cookieStore = await getRequestCookiesSafely();
  return normalizeCode(cookieStore?.get(TENANT_HINT_COOKIE_NAME)?.value);
}

/**
 * Reads the tenant recorded in the caller's signed session token.
 *
 * The token is decoded here rather than going through `getServerSession` so
 * that this module stays free of a dependency on `authOptions`, which imports
 * this file in turn.
 */
export async function getSessionTenantSlug(): Promise<string | null> {
  const secret = process.env.NEXTAUTH_SECRET;

  if (!secret) {
    return null;
  }

  const cookieStore = await getRequestCookiesSafely();

  if (!cookieStore) {
    return null;
  }

  for (const cookieName of SESSION_COOKIE_NAMES) {
    const raw = cookieStore.get(cookieName)?.value;

    if (!raw) {
      continue;
    }

    try {
      const token = await decodeAuthToken({ token: raw, secret });
      const slug = normalizeCode(
        typeof token?.tenantSlug === "string" ? token.tenantSlug : ""
      );

      if (slug) {
        return slug;
      }
    } catch {
      //* An unreadable or expired token is treated as no session at all.
    }
  }

  return null;
}

export async function getRequestHostname() {
  const headersList = await getRequestHeadersSafely();
  const forwardedHost = headersList?.get("x-forwarded-host");
  const host = headersList?.get("host");

  return normalizeHostname(forwardedHost || host);
}

export async function resolveTenantContext(options?: {
  hostname?: string | null;
  schoolCode?: string | null;
  allowCookieFallback?: boolean;
  /**
   * Skips the session lookup. Only the sign-in path sets this: at that point
   * the caller is proving which tenant they belong to, and any cookie left
   * over from a previous account must not override the school code they typed.
   */
  ignoreSession?: boolean;
}): Promise<TenantResolution> {
  const hostname = normalizeHostname(options?.hostname) || (await getRequestHostname()) || null;

  //* An authenticated caller is pinned to the tenant recorded in their signed
  //* token, ahead of every request-controlled signal below.
  //*
  //* Host and cookie are both attacker-supplied — `x-forwarded-host` can be
  //* set on the request, and `sms_tenant` is handed out by an open endpoint.
  //* Because one NEXTAUTH_SECRET signs tokens for every school, letting either
  //* of those pick the database meant a session minted at one school could
  //* drive queries against another school's data with its own role intact.
  if (!options?.ignoreSession) {
    const sessionSlug = await getSessionTenantSlug();

    if (sessionSlug) {
      const sessionTenant = await findTenantBySchoolCode(sessionSlug);

      if (!sessionTenant) {
        //* Fail closed. Falling through to the host or the default tenant here
        //* would drop a holder of a stale session onto someone else's database.
        throw new TenantResolutionError(
          `Your session is for a school that is no longer available ("${sessionSlug}"). Sign in again.`
        );
      }

      return {
        tenant: sessionTenant,
        source: "session",
        hostname,
        hint: sessionSlug,
      };
    }
  }

  if (hostname) {
    const hostTenant = await findTenantByHostname(hostname);

    if (hostTenant) {
      return {
        tenant: hostTenant,
        source: "host",
        hostname,
        hint: null,
      };
    }
  }

  const schoolCode = normalizeCode(options?.schoolCode);

  if (schoolCode) {
    const schoolTenant = await findTenantBySchoolCode(schoolCode);

    if (schoolTenant) {
      return {
        tenant: schoolTenant,
        source: "school_code",
        hostname,
        hint: schoolCode,
      };
    }
  }

  if (options?.allowCookieFallback !== false) {
    const tenantHint = await getTenantHint();

    if (tenantHint) {
      const hintedTenant = await findTenantBySchoolCode(tenantHint);

      if (hintedTenant) {
        return {
          tenant: hintedTenant,
          source: "cookie",
          hostname,
          hint: tenantHint,
        };
      }
    }
  }

  return {
    tenant: await getDefaultTenant(),
    source: "default",
    hostname,
    hint: null,
  };
}
