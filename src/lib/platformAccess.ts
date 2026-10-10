import {
  findTenantByHostname,
  getDefaultTenant,
  getRequestHostname,
} from "./tenant";

function normalizeHostname(value?: string | null) {
  const trimmed = value?.trim().toLowerCase() ?? "";
  if (!trimmed) return "";

  try {
    const parsed = new URL(
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`
    );
    return parsed.hostname;
  } catch {
    return trimmed.split("/")[0]?.split(":")[0] ?? "";
  }
}

function getConfiguredPlatformHostnames() {
  return new Set(
    [
      process.env.NEXTAUTH_URL,
      process.env.VERCEL_PROJECT_PRODUCTION_URL,
      process.env.VERCEL_URL,
    ]
      .map(normalizeHostname)
      .filter(Boolean)
  );
}

export type PlatformRequestContext = {
  hostname: string | null;
  defaultTenantSlug: string;
  matchedTenantSlug: string | null;
  isPlatformRequest: boolean;
  isSchoolSubdomainRequest: boolean;
};

export async function getPlatformRequestContext(options?: {
  hostname?: string | null;
}): Promise<PlatformRequestContext> {
  const hostname = options?.hostname?.trim() || (await getRequestHostname()) || null;

  const [defaultTenant, matchedTenant] = await Promise.all([
    getDefaultTenant(),
    hostname ? findTenantByHostname(hostname) : Promise.resolve(null),
  ]);

  const matchedTenantSlug = matchedTenant?.slug ?? null;
  const isConfiguredPlatformHost = getConfiguredPlatformHostnames().has(
    normalizeHostname(hostname)
  );
  const isPlatformRequest = !matchedTenant || isConfiguredPlatformHost;
  const isSchoolSubdomainRequest = Boolean(matchedTenant) && !isPlatformRequest;

  return {
    hostname,
    defaultTenantSlug: defaultTenant.slug,
    matchedTenantSlug,
    isPlatformRequest,
    isSchoolSubdomainRequest,
  };
}

export async function isPlatformRequest(options?: { hostname?: string | null }) {
  return (await getPlatformRequestContext(options)).isPlatformRequest;
}

export async function requirePlatformRequest(options?: {
  hostname?: string | null;
}) {
  const context = await getPlatformRequestContext(options);

  if (!context.isPlatformRequest) {
    throw new Error(
      "School onboarding is only available on the main platform site."
    );
  }

  return context;
}
