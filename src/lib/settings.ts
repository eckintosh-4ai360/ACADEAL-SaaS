import type { SystemSettings } from "@prisma/client";
import { getTenantPrismaClient } from "./prisma";
import {
  clearDatabaseFailure,
  isTransientDatabaseError,
  markDatabaseFailure,
  shouldBypassDatabase,
} from "./db-resilience";
import { resolveTenantContext } from "./tenant";

export type SystemSettingsRuntime = Omit<
  SystemSettings,
  "id" | "createdAt" | "updatedAt"
> &
  Partial<Pick<SystemSettings, "id" | "createdAt" | "updatedAt">>;

const DEFAULT_SETTINGS: SystemSettingsRuntime = {
  schoolName: "Student Management System",
  schoolShortName: "SMS",
  schoolLogo: null,
  schoolStamp: null,
  primaryColor: "#3b82f6",
  secondaryColor: "#8b5cf6",
  accentColor: "#ec4899",
  schoolEmail: null,
  schoolPhone: null,
  schoolAddress: null,
  schoolWebsite: null,
  emailHost: null,
  emailPort: null,
  emailUser: null,
  emailPassword: null,
  smsProvider: "mnotify",
  smsApiKey: null,
  smsApiSecret: null,
  smsSenderId: null,
  whatsappAccessToken: null,
  whatsappPhoneNumberId: null,
  whatsappReceiptTemplateName: null,
  whatsappReceiptTemplateLanguage: "en_US",
  academicYear: "2024-2025",
  currency: "GHS",
  timezone: "GMT",
  dateFormat: "MM/DD/YYYY",
  currentTerm: "One",
  vacationDate: null,
  reopeningDate: null,
  totalAttendanceDays: 0,
  studentIdInitials: "CTS",
  publicAppUrl: null,
};

const SETTINGS_CACHE_TTL_MS = Number(
  process.env.SYSTEM_SETTINGS_CACHE_TTL_MS ?? 30_000
);
const TRANSIENT_SETTINGS_RETRY_DELAY_MS = Number(
  process.env.SYSTEM_SETTINGS_RETRY_DELAY_MS ?? 250
);

type SettingsShape = SystemSettingsRuntime;
type ThemeSettings = Pick<
  SettingsShape,
  "accentColor" | "primaryColor" | "schoolName" | "secondaryColor"
>;

const globalForSettings = globalThis as typeof globalThis & {
  __systemSettingsCache?: Record<
    string,
    {
      fetchedAt: number;
      value: SettingsShape;
    }
  >;
};

function getCachedSettings(cacheKey: string) {
  const cache = globalForSettings.__systemSettingsCache?.[cacheKey];

  if (!cache) {
    return null;
  }

  if (Date.now() - cache.fetchedAt > SETTINGS_CACHE_TTL_MS) {
    return null;
  }

  return cache.value;
}

function setCachedSettings(cacheKey: string, settings: SettingsShape) {
  globalForSettings.__systemSettingsCache = {
    ...(globalForSettings.__systemSettingsCache ?? {}),
    [cacheKey]: {
      value: settings,
      fetchedAt: Date.now(),
    },
  };
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isMissingDatabaseColumnError(error: unknown) {
  if (!error) return false;
  const errObj = error as { code?: string; message?: string };
  if (errObj.code === "42703") return true;

  const message = (errObj.message || String(error)).toLowerCase();

  return (
    message.includes("does not exist in the current database") ||
    (message.includes("column") && message.includes("does not exist")) ||
    message.includes("unknown field") ||
    message.includes("undefinedcolumn")
  );
}

async function fetchSettingsFromDatabase(cacheKey: string): Promise<SettingsShape> {
  const tenantContext = await resolveTenantContext();
  const prisma = await getTenantPrismaClient(tenantContext.tenant);

  //* Fetch fresh settings
  let settings = await prisma.systemSettings.findFirst();

  //* If no settings exist, create default
  if (!settings) {
    //* Only try to create if we are not in a build environment to avoid unnecessary write attempts
    if (process.env.NEXT_PHASE !== "phase-production-build") {
      settings = await prisma.systemSettings.create({
        data: {
          schoolName: tenantContext.tenant.schoolName || DEFAULT_SETTINGS.schoolName,
        },
      });
    } else {
      return {
        ...DEFAULT_SETTINGS,
        schoolName: tenantContext.tenant.schoolName || DEFAULT_SETTINGS.schoolName,
      };
    }
  }

  setCachedSettings(cacheKey, settings as SettingsShape);
  return settings as SettingsShape;
}

export async function getSystemSettings() {
  const tenantContext = await resolveTenantContext();
  const cacheKey = tenantContext.tenant.slug;
  const cachedSettings = getCachedSettings(cacheKey);

  if (cachedSettings) {
    return cachedSettings;
  }

  if (shouldBypassDatabase()) {
    return (
      globalForSettings.__systemSettingsCache?.[cacheKey]?.value ?? {
        ...DEFAULT_SETTINGS,
        schoolName: tenantContext.tenant.schoolName || DEFAULT_SETTINGS.schoolName,
      }
    );
  }

  try {
    const settings = await fetchSettingsFromDatabase(cacheKey);

    clearDatabaseFailure();
    return settings;
  } catch (error) {
    let resolvedError = error;

    if (isTransientDatabaseError(error)) {
      try {
        await wait(TRANSIENT_SETTINGS_RETRY_DELAY_MS);
        const settings = await fetchSettingsFromDatabase(cacheKey);
        clearDatabaseFailure();
        return settings;
      } catch (retryError) {
        resolvedError = retryError;
      }
    }

    const isTransientFailure = markDatabaseFailure(resolvedError);

    if (isTransientFailure) {
      console.warn("Using cached/default system settings after DB timeout.");
    } else if (isMissingDatabaseColumnError(resolvedError)) {
      console.warn(
        "SystemSettings schema is ahead of the current database; using cached/default settings until migrations are applied."
      );
    } else {
      console.error("Failed to fetch system settings from database:", resolvedError);
    }

    return (
      globalForSettings.__systemSettingsCache?.[cacheKey]?.value ?? {
        ...DEFAULT_SETTINGS,
        schoolName: tenantContext.tenant.schoolName || DEFAULT_SETTINGS.schoolName,
      }
    );
  }
}

//* Clear cache when settings are updated
export function clearSettingsCache() {
  globalForSettings.__systemSettingsCache = undefined;
}

//* Generate CSS variables from settings
export function generateThemeCSS(settings: ThemeSettings) {
  return `
    :root {
      --primary-color: ${settings.primaryColor};
      --secondary-color: ${settings.secondaryColor};
      --accent-color: ${settings.accentColor};
      --school-name: "${settings.schoolName}";
    }
  `;
}
