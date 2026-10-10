"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "./auth";
import {
  clearControlPlaneSchoolTenantCache,
  createControlPlaneSchoolTenant,
  deleteControlPlaneSchoolTenant,
  getControlPlaneSchoolTenantById,
  isControlPlaneConfigured,
  type ControlPlaneSchoolTenantInput,
  updateControlPlaneSchoolTenant,
} from "./control-plane";
import { requirePlatformRequest } from "./platformAccess";
import { clearSettingsCache } from "./settings";
import { clearTenantRegistryCache } from "./tenant";
import { verifyAndBootstrapTenantDatabase } from "./tenantDatabaseBootstrap";

type ControlPlaneActionResult = {
  success: boolean;
  error: boolean;
  message: string;
};

const tenantFormSchema = z.object({
  id: z.string().optional(),
  slug: z
    .string()
    .trim()
    .min(2, "Slug must be at least 2 characters.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug can only use lowercase letters, numbers, and hyphens."),
  schoolName: z.string().trim().min(2, "School name is required."),
  domainsText: z.string().trim().optional().default(""),
  loginCodesText: z.string().trim().optional().default(""),
  publicAppUrl: z.string().trim().optional().default(""),
  databaseUrl: z.string().trim().optional().default(""),
  directUrl: z.string().trim().optional().default(""),
  databaseUrlUnpooled: z.string().trim().optional().default(""),
  enabled: z.boolean(),
});

function trimToEmpty(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCode(value: string) {
  return value.trim().toLowerCase();
}

function normalizeHostname(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "";

  const withoutProtocol = trimmed.replace(/^https?:\/\//, "");
  const withoutPath = withoutProtocol.split("/")[0] ?? withoutProtocol;
  const withoutPort = withoutPath.split(":")[0] ?? withoutPath;
  return withoutPort.trim();
}

function withProtocol(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return `https://${url}`;
}

function normalizePublicAppUrl(value: string) {
  if (!value.trim()) {
    return null;
  }

  return withProtocol(value.trim()).replace(/\/+$/, "");
}

function extractHostname(value: string | null) {
  if (!value) {
    return "";
  }

  try {
    return normalizeHostname(new URL(value).hostname);
  } catch {
    return normalizeHostname(value);
  }
}

function parseList(value: string, normalizer: (item: string) => string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,]+/)
        .map((item) => normalizer(item))
        .filter(Boolean)
    )
  );
}

async function requirePlatformAdmin() {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    session.user.role !== "admin" ||
    session.user.adminRole !== "SUPER_ADMIN"
  ) {
    throw new Error("Only super admins can manage school onboarding.");
  }

  await requirePlatformRequest();
}

function parseTenantFormData(
  formData: FormData,
  options: { mode: "create" | "update" }
) {
  const parsed = tenantFormSchema.safeParse({
    id: trimToEmpty(formData.get("id")) || undefined,
    slug: normalizeCode(trimToEmpty(formData.get("slug"))),
    schoolName: trimToEmpty(formData.get("schoolName")),
    domainsText: trimToEmpty(formData.get("domainsText")),
    loginCodesText: trimToEmpty(formData.get("loginCodesText")),
    publicAppUrl: trimToEmpty(formData.get("publicAppUrl")),
    databaseUrl: trimToEmpty(formData.get("databaseUrl")),
    directUrl: trimToEmpty(formData.get("directUrl")),
    databaseUrlUnpooled: trimToEmpty(formData.get("databaseUrlUnpooled")),
    enabled: formData.get("enabled") === "on",
  });

  if (!parsed.success) {
    return {
      success: false as const,
      message:
        parsed.error.issues[0]?.message || "Please review the school onboarding form.",
    };
  }

  const publicAppUrl = normalizePublicAppUrl(parsed.data.publicAppUrl);
  const domains = Array.from(
    new Set(
      [
        ...parseList(parsed.data.domainsText, normalizeHostname),
        extractHostname(publicAppUrl),
      ].filter(Boolean)
    )
  );

  const loginCodes = Array.from(
    new Set(
      [
        parsed.data.slug,
        ...parseList(parsed.data.loginCodesText, normalizeCode),
      ].filter(Boolean)
    )
  );

  if (domains.length === 0) {
    return {
      success: false as const,
      message: "Add at least one school domain or a public app URL.",
    };
  }

  if (options.mode === "create" && !parsed.data.databaseUrl) {
    return {
      success: false as const,
      message: "Database URL is required when creating a school.",
    };
  }

  return {
    success: true as const,
    id: parsed.data.id,
    input: {
      slug: parsed.data.slug,
      schoolName: parsed.data.schoolName,
      domains,
      loginCodes,
      publicAppUrl,
      databaseUrl: parsed.data.databaseUrl,
      directUrl: parsed.data.directUrl || null,
      databaseUrlUnpooled: parsed.data.databaseUrlUnpooled || null,
      enabled: parsed.data.enabled,
    },
  };
}

function toActionErrorMessage(error: unknown) {
  const maybeError = error as { code?: string; detail?: string; message?: string };

  if (maybeError.code === "23505") {
    return "A school with this slug already exists in the control plane.";
  }

  return maybeError.message || "Something went wrong while saving the school.";
}

function invalidateControlPlaneViews() {
  clearControlPlaneSchoolTenantCache();
  clearTenantRegistryCache();
  clearSettingsCache();
  revalidatePath("/dashboard/platform/schools");
}

export async function createSchoolTenantAction(
  formData: FormData
): Promise<ControlPlaneActionResult> {
  try {
    await requirePlatformAdmin();

    if (!isControlPlaneConfigured()) {
      return {
        success: false,
        error: true,
        message:
          "Add CONTROL_PLANE_DATABASE_URL in Vercel before using school onboarding.",
      };
    }

    const parsed = parseTenantFormData(formData, { mode: "create" });
    if (!parsed.success) {
      return { success: false, error: true, message: parsed.message };
    }

    const bootstrapResult = await verifyAndBootstrapTenantDatabase(parsed.input);

    await createControlPlaneSchoolTenant({
      ...parsed.input,
      databaseUrl: parsed.input.databaseUrl,
    });

    invalidateControlPlaneViews();

    return {
      success: true,
      error: false,
      message: `Added ${parsed.input.schoolName} to the control plane and verified ${bootstrapResult.databaseName}.`,
    };
  } catch (error) {
    return {
      success: false,
      error: true,
      message: toActionErrorMessage(error),
    };
  }
}

export async function updateSchoolTenantAction(
  formData: FormData
): Promise<ControlPlaneActionResult> {
  try {
    await requirePlatformAdmin();

    if (!isControlPlaneConfigured()) {
      return {
        success: false,
        error: true,
        message:
          "Add CONTROL_PLANE_DATABASE_URL in Vercel before using school onboarding.",
      };
    }

    const parsed = parseTenantFormData(formData, { mode: "update" });
    if (!parsed.success || !parsed.id) {
      return {
        success: false,
        error: true,
        message: parsed.success ? "School ID is missing." : parsed.message,
      };
    }

    const existing = await getControlPlaneSchoolTenantById(parsed.id);
    if (!existing) {
      return {
        success: false,
        error: true,
        message: "School tenant not found.",
      };
    }

    const input: ControlPlaneSchoolTenantInput = {
      ...parsed.input,
      databaseUrl: parsed.input.databaseUrl || existing.databaseUrl,
      directUrl:
        parsed.input.directUrl === null ? existing.directUrl : parsed.input.directUrl,
      databaseUrlUnpooled:
        parsed.input.databaseUrlUnpooled === null
          ? existing.databaseUrlUnpooled
          : parsed.input.databaseUrlUnpooled,
    };

    const bootstrapResult = await verifyAndBootstrapTenantDatabase(input, {
      previous: existing,
    });

    await updateControlPlaneSchoolTenant(parsed.id, input);

    invalidateControlPlaneViews();

    return {
      success: true,
      error: false,
      message: `Updated ${input.schoolName} and verified ${bootstrapResult.databaseName}.`,
    };
  } catch (error) {
    return {
      success: false,
      error: true,
      message: toActionErrorMessage(error),
    };
  }
}

export async function deleteSchoolTenantAction(
  id: string
): Promise<ControlPlaneActionResult> {
  try {
    await requirePlatformAdmin();

    if (!isControlPlaneConfigured()) {
      return {
        success: false,
        error: true,
        message:
          "Add CONTROL_PLANE_DATABASE_URL in Vercel before using school onboarding.",
      };
    }

    const existing = await getControlPlaneSchoolTenantById(id);
    if (!existing) {
      return {
        success: false,
        error: true,
        message: "School tenant not found.",
      };
    }

    await deleteControlPlaneSchoolTenant(id);

    invalidateControlPlaneViews();

    return {
      success: true,
      error: false,
      message: `Deleted ${existing.schoolName} from the control plane.`,
    };
  } catch (error) {
    return {
      success: false,
      error: true,
      message: toActionErrorMessage(error),
    };
  }
}
