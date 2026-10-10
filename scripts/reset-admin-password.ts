/**
 * One-off script: Reset admin passwords on a specific tenant's DB to Admin@123.
 * Fetches the tenant's databaseUrl from the control plane registry,
 * then updates Admin + Staff tables in that tenant's DB.
 *
 * Usage:
 *   npm run reset:admin-pwd
 *
 * Set TARGET_SLUG or TARGET_DOMAIN env var to target a specific tenant.
 * If neither is set, all tenants are listed and you can pick one.
 */

import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
import { listControlPlaneSchoolTenants } from "../src/lib/control-plane";

const NEW_PASSWORD = "Admin@123";
const ADMIN_USERNAMES = ["admin", "superadmin"];

async function resetAdminOnTenant(databaseUrl: string, tenantSlug: string) {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);

    for (const username of ADMIN_USERNAMES) {
      const updatedAdmin = await prisma.admin.updateMany({
        where: { username },
        data: { password: hashedPassword },
      });

      const updatedStaff = await prisma.staff.updateMany({
        where: { username },
        data: { password: hashedPassword },
      });

      if (updatedAdmin.count === 0 && updatedStaff.count === 0) {
        console.log(`  ⚠️  No records found for "${username}".`);
      } else {
        console.log(
          `  ✅ "${username}" reset — admin: ${updatedAdmin.count}, staff: ${updatedStaff.count} updated.`
        );
      }
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

async function main() {
  console.log("🔍 Fetching tenants from control plane...\n");
  const tenants = await listControlPlaneSchoolTenants();

  if (tenants.length === 0) {
    console.error("❌ No tenants found in the control plane registry.");
    process.exit(1);
  }

  // Print all tenants for visibility
  console.log("📋 Registered tenants:");
  tenants.forEach((t, i) => {
    console.log(`  [${i + 1}] slug: "${t.slug}" | school: "${t.schoolName}" | domains: ${t.domains?.join(", ") || "none"}`);
  });
  console.log();

  // Filter by TARGET_SLUG or TARGET_DOMAIN env var, or default to all
  const targetSlug = process.env.TARGET_SLUG;
  const targetDomain = process.env.TARGET_DOMAIN;

  let targets = tenants;
  if (targetSlug) {
    targets = tenants.filter((t) => t.slug === targetSlug);
    if (targets.length === 0) {
      console.error(`❌ No tenant found with slug "${targetSlug}".`);
      process.exit(1);
    }
  } else if (targetDomain) {
    targets = tenants.filter((t) => t.domains?.includes(targetDomain));
    if (targets.length === 0) {
      console.error(`❌ No tenant found with domain "${targetDomain}".`);
      process.exit(1);
    }
  }

  console.log(`\n🔐 Resetting admin password to "Admin@123" on ${targets.length} control-plane tenant(s)...\n`);

  for (const tenant of targets) {
    console.log(`[${tenant.slug}] ${tenant.schoolName}`);
    const dbUrl = tenant.databaseUrl || tenant.databaseUrlUnpooled || tenant.directUrl;
    if (!dbUrl) {
      console.log(`  ⚠️  No database URL — skipping.\n`);
      continue;
    }
    await resetAdminOnTenant(dbUrl, tenant.slug);
    console.log();
  }

  // Also reset the direct DATABASE_URL (e.g. testing / dev DB)
  const directDbUrl = process.env.DATABASE_URL;
  if (directDbUrl) {
    console.log(`[direct DATABASE_URL] Resetting on: ${directDbUrl.split("@")[1]?.split("?")[0] ?? "DB"}`);
    await resetAdminOnTenant(directDbUrl, "direct");
    console.log();
  }

  console.log("✅ Done!");

}

main().catch((e) => {
  console.error("❌ Fatal error:", e);
  process.exit(1);
});
