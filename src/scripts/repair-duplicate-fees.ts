/**
 * Removes the duplicate fee rows left behind when a term bill's sync rewrote a
 * student's admission fee into a second copy of the school fee.
 *
 * updateTermBill and prepareTermFees rewrote every PENDING fee a student held
 * for the term, on the assumption that the term bill was the only thing that
 * could have put one there. Once admission fees started being stamped with the
 * same term, that assumption was wrong: the admission fee was retitled and
 * re-priced into a clone of the school fee. A student who had already paid
 * their school fee ends up showing it PAID alongside an identical PENDING row.
 *
 * What this does about it:
 *
 *  - Groups fees by student, term, year and title, and reports every group
 *    holding more than one row.
 *  - With --apply, deletes the extras that are provably untouched: PENDING,
 *    nothing paid against them, and no payment record pointing at them. The
 *    survivor is whichever row carries payments, then the largest paid amount,
 *    then the oldest.
 *  - Never deletes a row with payments or a non-zero paid amount. Those are
 *    listed as needing a human, and left exactly as they are.
 *
 * Deleting the clone does not lose the admission charge: with the row gone the
 * student no longer holds a fee under the admission item, so re-saving that
 * admission bill in Fees -> Admissions writes it back at the correct amount.
 * Do the delete first, then the re-save.
 *
 * Usage (dry run reports and changes nothing):
 *
 *   npx ts-node --compiler-options {\"module\":\"CommonJS\"} src/scripts/repair-duplicate-fees.ts
 *   ... --apply             delete the safe duplicates
 *   ... --tenant=<slug>     restrict to one school
 */

import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import pg from "pg";
import { listControlPlaneSchoolTenants, isControlPlaneConfigured } from "../lib/control-plane";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const DOUBLE_BILLED = args.includes("--double-billed");
const TENANT_FILTER = args.find((arg) => arg.startsWith("--tenant="))?.split("=")[1];

type DuplicateRow = {
  id: number;
  studentId: string;
  studentName: string;
  term: string;
  academicYear: string;
  title: string;
  amount: string;
  paidAmount: string;
  status: string;
  payments: string;
  createdAt: Date;
  rn: string;
};

/**
 * Every row in a group of two or more fees that share a student, term, year and
 * title, ranked so rn = 1 is the row worth keeping.
 */
const DUPLICATES_SQL = `
WITH ranked AS (
  SELECT
    f."id",
    f."studentId",
    s."name" || ' ' || s."surname" AS "studentName",
    f."term",
    f."academicYear",
    f."title",
    f."amount",
    f."paidAmount",
    f."status"::text AS "status",
    f."createdAt",
    (SELECT COUNT(*) FROM "FeePayment" p WHERE p."feeId" = f."id") AS payments,
    ROW_NUMBER() OVER (
      PARTITION BY f."studentId", f."term", f."academicYear", lower(btrim(f."title"))
      ORDER BY
        (SELECT COUNT(*) FROM "FeePayment" p WHERE p."feeId" = f."id") DESC,
        f."paidAmount" DESC,
        f."createdAt" ASC,
        f."id" ASC
    ) AS rn,
    COUNT(*) OVER (
      PARTITION BY f."studentId", f."term", f."academicYear", lower(btrim(f."title"))
    ) AS group_size
  FROM "Fee" f
  JOIN "Student" s ON s."id" = f."studentId"
)
SELECT * FROM ranked
WHERE group_size > 1
ORDER BY "studentName", "title", rn
`;

function money(value: string) {
  return Number(value).toFixed(2);
}

type DoubleBilledRow = {
  studentId: string;
  studentName: string;
  enrolled: Date;
  className: string;
  admissionFeeId: number;
  admissionAmount: string;
  admissionPaid: string;
  termFeeId: number;
  termTitle: string;
  termAmount: string;
  termPaid: string;
  termFeeCreated: Date;
  classBatchAt: Date | null;
};

/**
 * Students holding an admission fee and a term fee for the same term.
 *
 * The two are alternatives: the admission fee is what a new student pays to
 * join and it covers the term, while the term bill is what continuing students
 * carry. Holding both means one of them was added by a bug.
 *
 * Which to drop follows from when the student enrolled. `classBatchAt` is the
 * oldest term fee anyone in their class holds — the moment Prepare Bill was run
 * for that class. A student enrolled before it was there to be billed in that
 * batch and is continuing, so the admission fee is the wrong one. A student
 * enrolled after it arrived later and should be carrying the admission fee
 * alone, so the term fee is the wrong one.
 */
const DOUBLE_BILLED_SQL = `
WITH term_fee AS (
  SELECT f.*, s."classId"
    FROM "Fee" f
    JOIN "Student" s ON s."id" = f."studentId"
   WHERE f."title" NOT ILIKE 'Admission Fee%'
),
class_batch AS (
  SELECT "classId", MIN("createdAt") AS batch_at
    FROM term_fee
   GROUP BY "classId"
)
SELECT
  s."id"                AS "studentId",
  s."name" || ' ' || s."surname" AS "studentName",
  s."createdAt"         AS enrolled,
  cl."name"             AS "className",
  a."id"                AS "admissionFeeId",
  a."amount"            AS "admissionAmount",
  a."paidAmount"        AS "admissionPaid",
  t."id"                AS "termFeeId",
  t."title"             AS "termTitle",
  t."amount"            AS "termAmount",
  t."paidAmount"        AS "termPaid",
  t."createdAt"         AS "termFeeCreated",
  cb.batch_at           AS "classBatchAt"
FROM "Student" s
JOIN "Class" cl ON cl."id" = s."classId"
JOIN "Fee" a ON a."studentId" = s."id" AND a."title" ILIKE 'Admission Fee%'
JOIN term_fee t ON t."studentId" = s."id" AND t."term" = a."term" AND t."academicYear" = a."academicYear"
LEFT JOIN class_batch cb ON cb."classId" = s."classId"
ORDER BY cl."name", s."name"
`;

async function repairDoubleBilled(client: pg.PoolClient) {
  const { rows } = await client.query<DoubleBilledRow>(DOUBLE_BILLED_SQL);

  console.log("");
  if (rows.length === 0) {
    console.log("  No student holds both an admission fee and a term fee.");
    return;
  }

  //* A student carrying two term fees (an arrears row beside the bill) pairs
  //* with their admission fee twice, so rows are pairings, not students.
  const affectedStudents = new Set(rows.map((row) => row.studentId));
  console.log(
    `  ${affectedStudents.size} student(s) hold both an admission fee and a term fee` +
      ` (${rows.length} pairing(s)).`
  );
  console.log("");

  const dropAdmission: DoubleBilledRow[] = [];
  const dropTerm: DoubleBilledRow[] = [];
  const review: DoubleBilledRow[] = [];

  for (const row of rows) {
    const admissionPaid = Number(row.admissionPaid) > 0;
    const termPaid = Number(row.termPaid) > 0;

    if (admissionPaid && termPaid) {
      review.push(row);
      continue;
    }

    //* Money already taken decides it on its own; otherwise enrollment does.
    const continuing = termPaid
      ? true
      : admissionPaid
        ? false
        : row.classBatchAt !== null && row.enrolled <= row.classBatchAt;

    if (continuing) {
      dropAdmission.push(row);
    } else {
      dropTerm.push(row);
    }
  }

  const describe = (row: DoubleBilledRow, drop: "admission" | "term") =>
    `  ${row.studentName} (${row.className}, enrolled ${row.enrolled.toISOString().slice(0, 10)})\n` +
    `      admission #${row.admissionFeeId} ${money(row.admissionAmount)} paid ${money(row.admissionPaid)}` +
    `${drop === "admission" ? "   <- drop" : "   keep"}\n` +
    `      ${row.termTitle} #${row.termFeeId} ${money(row.termAmount)} paid ${money(row.termPaid)}` +
    `${drop === "term" ? "   <- drop" : "   keep"}`;

  if (dropTerm.length > 0) {
    console.log(`  NEW ADMISSIONS — enrolled after their class was billed, so the term fee is wrong (${dropTerm.length}):`);
    for (const row of dropTerm) console.log(describe(row, "term"));
    console.log("");
  }

  if (dropAdmission.length > 0) {
    console.log(`  CONTINUING STUDENTS — enrolled before their class was billed, so the admission fee is wrong (${dropAdmission.length}):`);
    for (const row of dropAdmission.slice(0, 10)) console.log(describe(row, "admission"));
    if (dropAdmission.length > 10) {
      console.log(`      ... and ${dropAdmission.length - 10} more of the same shape`);
    }
    console.log("");
  }

  if (review.length > 0) {
    console.log(`  NEEDS REVIEW — money paid against both rows (${review.length}):`);
    for (const row of review) console.log(describe(row, "term").replace(/<- drop/g, "?"));
    console.log("");
  }

  //* The same admission fee can appear in several pairings; delete it once.
  const toDelete = Array.from(
    new Set([
      ...dropTerm.filter((row) => Number(row.termPaid) === 0).map((row) => row.termFeeId),
      ...dropAdmission
        .filter((row) => Number(row.admissionPaid) === 0)
        .map((row) => row.admissionFeeId),
    ])
  );

  if (!DOUBLE_BILLED) {
    console.log(`  Pass --double-billed to act on these (${toDelete.length} row(s) would be deleted).`);
    return;
  }

  if (toDelete.length === 0) {
    console.log("  Nothing safe to delete here.");
    return;
  }

  if (!APPLY) {
    console.log(`  would delete ${toDelete.length} row(s).`);
    return;
  }

  const result = await client.query(`DELETE FROM "Fee" WHERE "id" = ANY($1::int[]) AND "paidAmount" = 0`, [
    toDelete,
  ]);
  console.log(`  Deleted ${result.rowCount} row(s).`);
}

async function repairTenant(connectionString: string) {
  const pool = new pg.Pool({ connectionString, max: 1 });
  const client = await pool.connect();

  try {
    const { rows } = await client.query<DuplicateRow>(DUPLICATES_SQL);

    if (rows.length === 0) {
      console.log("  No duplicate fee rows.");
      return;
    }

    const extras = rows.filter((row) => Number(row.rn) > 1);
    const safe = extras.filter(
      (row) => row.status === "PENDING" && Number(row.paidAmount) === 0 && Number(row.payments) === 0
    );
    const safeIds = new Set(safe.map((row) => row.id));
    const unsafe = extras.filter((row) => !safeIds.has(row.id));

    const groups = new Set(
      rows.map((row) => `${row.studentId}|${row.term}|${row.academicYear}|${row.title.toLowerCase()}`)
    );

    console.log(`  ${groups.size} duplicated group(s), ${rows.length} row(s) total.`);
    console.log("");

    let lastKey = "";
    for (const row of rows) {
      const key = `${row.studentId}|${row.title}`;
      if (key !== lastKey) {
        console.log(`  ${row.studentName} — "${row.title}" (${row.term} ${row.academicYear})`);
        lastKey = key;
      }
      const keep = Number(row.rn) === 1;
      const disposition = keep
        ? "KEEP"
        : safeIds.has(row.id)
          ? APPLY
            ? "DELETE"
            : "would delete"
          : "NEEDS REVIEW";
      console.log(
        `      #${row.id}  ${money(row.amount)}  paid ${money(row.paidAmount)}  ${row.status}` +
          `  payments=${row.payments}  ${row.createdAt.toISOString().slice(0, 16)}  ${disposition}`
      );
    }

    console.log("");
    console.log(`  ${safe.length} row(s) safe to delete, ${unsafe.length} needing review.`);

    if (unsafe.length > 0) {
      console.log("  Rows marked NEEDS REVIEW carry payments or a paid amount and were left alone.");
    }

    if (safe.length > 0 && APPLY) {
      const result = await client.query(`DELETE FROM "Fee" WHERE "id" = ANY($1::int[])`, [
        safe.map((row) => row.id),
      ]);
      console.log(`  Deleted ${result.rowCount} row(s).`);
    }

    await repairDoubleBilled(client);
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  console.log("=== Duplicate Fee Repair ===");
  console.log(APPLY ? "MODE: apply (rows will be deleted)" : "MODE: dry run (nothing will be deleted)");
  if (TENANT_FILTER) console.log(`Tenant filter: ${TENANT_FILTER}`);
  console.log("");

  if (!isControlPlaneConfigured()) {
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
    console.log("Dry run complete. Re-run with --apply to delete the safe duplicates.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
