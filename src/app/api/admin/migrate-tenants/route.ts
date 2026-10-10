import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isPlatformRequest } from "@/lib/platformAccess";
import {
  listControlPlaneSchoolTenants,
  getControlPlaneSchoolTenantById,
} from "@/lib/control-plane";
import {
  applyTenantMigrations,
  type MigrationResult,
} from "@/lib/tenant-migrations";

/**
 * POST /api/admin/migrate-tenants
 *
 * Body (JSON):
 *   { tenantId?: string }   — omit to migrate ALL tenants
 *
 * Security: super-admin on the platform domain only.
 */
export async function POST(req: NextRequest) {
  // ── Auth guard ──────────────────────────────────────────────────────
  const platformRequest = await isPlatformRequest();
  const session = await getServerSession(authOptions);

  if (
    !platformRequest ||
    !session ||
    session.user.role !== "admin" ||
    session.user.adminRole !== "SUPER_ADMIN"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Resolve which tenants to migrate ───────────────────────────────
  let body: { tenantId?: string } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine — means "all tenants"
  }

  let tenants: { slug: string; databaseUrl: string; directUrl: string | null; databaseUrlUnpooled: string | null }[] = [];

  if (body.tenantId) {
    const record = await getControlPlaneSchoolTenantById(body.tenantId);
    if (!record) {
      return NextResponse.json(
        { error: `Tenant "${body.tenantId}" not found.` },
        { status: 404 }
      );
    }
    tenants = [record];
  } else {
    tenants = await listControlPlaneSchoolTenants();
  }

  if (tenants.length === 0) {
    return NextResponse.json({
      message: "No tenants found in the control-plane registry.",
      results: [] as MigrationResult[],
    });
  }

  // ── Run migrations (sequentially to avoid overwhelming Neon limits) ─
  const results: MigrationResult[] = [];

  for (const tenant of tenants) {
    const connectionString =
      tenant.databaseUrl ||
      tenant.databaseUrlUnpooled ||
      tenant.directUrl ||
      "";

    if (!connectionString) {
      results.push({
        tenantSlug: tenant.slug,
        success: false,
        appliedMigrations: [],
        skippedMigrations: [],
        error: "No database connection string configured for this tenant.",
      });
      continue;
    }

    const result = await applyTenantMigrations(connectionString, tenant.slug);
    results.push(result);
  }

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.length - successCount;

  return NextResponse.json({
    message: `Migrations complete. ${successCount} succeeded, ${failCount} failed.`,
    results,
  });
}

/**
 * GET /api/admin/migrate-tenants
 *
 * Returns the list of pending migrations for each tenant (dry-run check).
 * Same auth guard as POST.
 */
export async function GET() {
  const platformRequest = await isPlatformRequest();
  const session = await getServerSession(authOptions);

  if (
    !platformRequest ||
    !session ||
    session.user.role !== "admin" ||
    session.user.adminRole !== "SUPER_ADMIN"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { TENANT_MIGRATIONS } = await import("@/lib/tenant-migrations");

  return NextResponse.json({
    migrations: TENANT_MIGRATIONS.map((m) => m.name),
  });
}
