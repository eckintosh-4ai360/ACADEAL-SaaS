/**
 * One-off script: Keep the school tenant on its subdomain and leave the
 * root acadeal.com domain available for the platform/base system.
 *
 * Usage:
 *   npm run fix:tenant-domains
 */

import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { Pool } from "pg";

const CONTROL_PLANE_TABLE = "platform_school_tenants";
const TARGET_SLUG = "woode-academy";

const SCHOOL_DOMAIN = "woodeacademy.acadeal.com";

// The canonical public URL for post-login redirects
const PUBLIC_APP_URL = `https://${SCHOOL_DOMAIN}`;

async function main() {
  const connectionString =
    process.env.CONTROL_PLANE_DATABASE_URL ||
    process.env.CONTROL_PLANE_DATABASE_URL_UNPOOLED;

  if (!connectionString) {
    console.error("❌ CONTROL_PLANE_DATABASE_URL is not set.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString });

  try {
    // Fetch current state
    const { rows } = await pool.query(
      `SELECT slug, domains, public_app_url FROM ${CONTROL_PLANE_TABLE} WHERE slug = $1`,
      [TARGET_SLUG]
    );

    if (rows.length === 0) {
      console.error(`❌ Tenant "${TARGET_SLUG}" not found in control plane.`);
      process.exit(1);
    }

    const current = rows[0];
    console.log(`\n📋 Current state for "${TARGET_SLUG}":`);
    console.log(`   domains:        ${JSON.stringify(current.domains)}`);
    console.log(`   public_app_url: ${current.public_app_url}`);

    // Remove platform-root aliases from the school tenant while preserving
    // any other custom school domains already registered.
    const existingDomains: string[] = current.domains ?? [];
    const mergedDomains = Array.from(
      new Set([
        ...existingDomains.filter(
          (domain) => !["acadeal.com", "www.acadeal.com"].includes(domain.toLowerCase())
        ),
        SCHOOL_DOMAIN,
      ])
    );

    // Update
    await pool.query(
      `UPDATE ${CONTROL_PLANE_TABLE}
       SET domains = $1,
           public_app_url = $2,
           updated_at = NOW()
       WHERE slug = $3`,
      [mergedDomains, PUBLIC_APP_URL, TARGET_SLUG]
    );

    console.log(`\n✅ Updated "${TARGET_SLUG}":`);
    console.log(`   domains:        ${JSON.stringify(mergedDomains)}`);
    console.log(`   public_app_url: ${PUBLIC_APP_URL}`);
    console.log(`\n⚡ Tenant cache will refresh within 15 seconds on next request.`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("❌ Fatal error:", e);
  process.exit(1);
});
