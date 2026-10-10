/**
 * Repairs Fee rows that no filter on the Fees table can reach.
 *
 * The table asks for the canonical term ("One", "Two", "Three"). Fees written
 * before the writers were fixed carry whatever the settings page held —
 * "Third Term" — or, for anything added through Add Fee, no term at all. Such a
 * fee exists, is owed, and renders nowhere, which reads to a user as the
 * student having no fees.
 *
 * Two repairs, with different confidence:
 *
 *  - Non-canonical terms ("Third Term" -> "Three") are a rename. The term is
 *    known; only its spelling was wrong. Always safe.
 *  - Empty terms are a guess: nothing in the row says which term it belonged
 *    to. Filling them with the tenant's current term is only right if those
 *    fees were raised this term, so it is opt-in behind --fill-empty and
 *    reports what it would touch first.
 *
 * Usage (dry run prints the plan and changes nothing):
 *
 *   npx ts-node --compiler-options {\"module\":\"CommonJS\"} src/scripts/repair-fee-terms.ts
 *   ... --apply                    write the safe term renames
 *   ... --apply --fill-empty       also stamp fees that carry no term
 *   ... --tenant=<slug>            restrict to one school
 */

import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import pg from "pg";
import { listControlPlaneSchoolTenants, isControlPlaneConfigured } from "../lib/control-plane";
import { CANONICAL_TERMS, normalizeTermValue } from "../lib/termUtils";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const FILL_EMPTY = args.includes("--fill-empty");
const TENANT_FILTER = args.find((arg) => arg.startsWith("--tenant="))?.split("=")[1];

const CANONICAL = new Set<string>(CANONICAL_TERMS);

type FeeGroup = { term: string; academicYear: string; count: number };

async function readFeeGroups(client: pg.PoolClient): Promise<FeeGroup[]> {
  const { rows } = await client.query<{ term: string; academicYear: string; count: string }>(
    `SELECT "term", "academicYear", COUNT(*) AS count
       FROM "Fee"
      GROUP BY "term", "academicYear"
      ORDER BY COUNT(*) DESC`
  );

  return rows.map((row) => ({
    term: row.term,
    academicYear: row.academicYear,
    count: Number(row.count),
  }));
}

async function readSettings(client: pg.PoolClient) {
  const { rows } = await client.query<{ currentTerm: string; academicYear: string }>(
    `SELECT "currentTerm", "academicYear" FROM "SystemSettings" ORDER BY "id" ASC LIMIT 1`
  );

  return rows[0] ?? null;
}

async function repairTenant(connectionString: string) {
  const pool = new pg.Pool({ connectionString, max: 1 });
  const client = await pool.connect();

  try {
    const [groups, settings] = await Promise.all([readFeeGroups(client), readSettings(client)]);

    if (groups.length === 0) {
      console.log("  No fee records.");
      return;
    }

    console.log("  Fee rows by term / academic year:");
    for (const group of groups) {
      const term = group.term === "" ? "(empty)" : group.term;
      const year = group.academicYear === "" ? "(empty)" : group.academicYear;
      const flag = group.term === "" ? "  <- no term" : CANONICAL.has(group.term) ? "" : "  <- unreachable";
      console.log(`    ${String(group.count).padStart(6)}  term=${term}  year=${year}${flag}`);
    }

    //* Group by the canonical value so "Third Term" and "term 3" collapse into
    //* one UPDATE per target rather than one per spelling.
    const renames = new Map<string, string[]>();
    for (const group of groups) {
      if (group.term === "" || CANONICAL.has(group.term)) continue;
      const canonical = normalizeTermValue(group.term);
      const bucket = renames.get(canonical) ?? [];
      if (!bucket.includes(group.term)) {
        bucket.push(group.term);
      }
      renames.set(canonical, bucket);
    }

    const emptyTermRows = groups
      .filter((group) => group.term === "")
      .reduce((sum, group) => sum + group.count, 0);

    if (renames.size === 0 && emptyTermRows === 0) {
      console.log("  Nothing to repair.");
      return;
    }

    for (const [canonical, spellings] of renames) {
      const { rows } = await client.query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM "Fee" WHERE "term" = ANY($1::text[])`,
        [spellings]
      );
      const count = Number(rows[0]?.count ?? 0);
      console.log(`  ${APPLY ? "RENAME" : "would rename"} ${count} row(s): ${spellings.join(", ")} -> ${canonical}`);

      if (APPLY) {
        await client.query(`UPDATE "Fee" SET "term" = $1 WHERE "term" = ANY($2::text[])`, [
          canonical,
          spellings,
        ]);
      }
    }

    if (emptyTermRows > 0) {
      if (!settings) {
        console.log(`  ${emptyTermRows} row(s) carry no term, and this school has no settings row to take one from. Skipped.`);
      } else if (!FILL_EMPTY) {
        const target = normalizeTermValue(settings.currentTerm);
        console.log(`  ${emptyTermRows} row(s) carry no term. Pass --fill-empty to stamp them ${target} / ${settings.academicYear}.`);
      } else {
        const target = normalizeTermValue(settings.currentTerm);
        console.log(`  ${APPLY ? "STAMP" : "would stamp"} ${emptyTermRows} row(s) with term=${target} year=${settings.academicYear}`);

        if (APPLY) {
          await client.query(
            `UPDATE "Fee"
                SET "term" = $1,
                    "academicYear" = CASE WHEN "academicYear" = '' THEN $2 ELSE "academicYear" END
              WHERE "term" = ''`,
            [target, settings.academicYear]
          );
        }
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  console.log("=== Fee Term Repair ===");
  console.log(APPLY ? "MODE: apply (rows will be written)" : "MODE: dry run (nothing will be written)");
  if (TENANT_FILTER) console.log(`Tenant filter: ${TENANT_FILTER}`);
  console.log("");

  if (!isControlPlaneConfigured()) {
    //* Single-database deployments have no registry to walk.
    const connectionString = process.env.DATABASE_URL || "";
    if (!connectionString) {
      console.error("Neither CONTROL_PLANE_DATABASE_URL nor DATABASE_URL is set.");
      process.exit(1);
    }

    console.log("[DATABASE_URL]");
    await repairTenant(connectionString);
    return;
  }

  const tenants = await listControlPlaneSchoolTenants();
  const selected = TENANT_FILTER ? tenants.filter((t) => t.slug === TENANT_FILTER) : tenants;

  if (selected.length === 0) {
    console.log(TENANT_FILTER ? `No tenant matches slug '${TENANT_FILTER}'.` : "No tenants registered.");
    return;
  }

  for (const tenant of selected) {
    console.log(`\n[${tenant.slug}] ${tenant.schoolName}`);
    const connectionString =
      tenant.databaseUrl || tenant.databaseUrlUnpooled || tenant.directUrl || "";

    if (!connectionString) {
      console.error("  SKIP: no database connection string configured.");
      continue;
    }

    try {
      await repairTenant(connectionString);
    } catch (err) {
      console.error(`  FAILED: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log("");
  if (!APPLY) {
    console.log("Dry run complete. Re-run with --apply to write the changes.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
