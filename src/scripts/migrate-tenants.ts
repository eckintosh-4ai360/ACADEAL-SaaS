import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env.local and .env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { listControlPlaneSchoolTenants, isControlPlaneConfigured } from "../lib/control-plane";
import { applyTenantMigrations } from "../lib/tenant-migrations";

async function main() {
  console.log("=== Tenant Database Migration Utility ===");

  if (!isControlPlaneConfigured()) {
    console.error("ERROR: Control plane database is not configured in environment variables.");
    console.error("Please set CONTROL_PLANE_DATABASE_URL.");
    process.exit(1);
  }

  try {
    console.log("Fetching tenants from control plane registry...");
    const tenants = await listControlPlaneSchoolTenants();

    if (tenants.length === 0) {
      console.log("No tenants found in the control plane registry.");
      return;
    }

    console.log(`Found ${tenants.length} tenant(s). Running migrations...`);
    console.log("--------------------------------------------------");

    let overallSuccess = true;

    for (const tenant of tenants) {
      console.log(`\n[Tenant: ${tenant.slug}] (${tenant.schoolName})`);
      const connectionString = tenant.databaseUrl || tenant.databaseUrlUnpooled || tenant.directUrl || "";

      if (!connectionString) {
        console.error("  -> SKIP: No database connection string configured for this tenant.");
        overallSuccess = false;
        continue;
      }

      console.log("  Applying migrations...");
      const result = await applyTenantMigrations(connectionString, tenant.slug);

      if (result.success) {
        console.log(`  -> SUCCESS!`);
        if (result.appliedMigrations.length > 0) {
          console.log(`     Applied: ${result.appliedMigrations.join(", ")}`);
        } else {
          console.log("     No new migrations to apply.");
        }
        if (result.skippedMigrations.length > 0) {
          console.log(`     Already Applied (Skipped): ${result.skippedMigrations.length} migration(s)`);
        }
      } else {
        console.error(`  -> FAILED: ${result.error}`);
        overallSuccess = false;
      }
    }

    console.log("\n--------------------------------------------------");
    if (overallSuccess) {
      console.log("All tenant database migrations completed successfully!");
    } else {
      console.error("Some tenant database migrations failed. Please check the logs above.");
      process.exit(1);
    }
  } catch (error) {
    console.error("An unexpected error occurred during migration:", error);
    process.exit(1);
  }
}

main();
