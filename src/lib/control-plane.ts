import { randomUUID } from "crypto";
import { Pool } from "@neondatabase/serverless";
import {
  PLANS,
  deriveBillingState,
  isPlanTier,
  type PaymentMethod,
  type PlanTier,
} from "./plans";

export type ControlPlaneSchoolTenantRecord = {
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
  //* ── Billing ───────────────────────────────
  planTier: PlanTier;
  paidThrough: string | null;
  trialEndsAt: string | null;
  closed: boolean;
  billingNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ControlPlaneSchoolTenantInput = {
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

type ControlPlaneCache = {
  fetchedAt: number;
  tenants: ControlPlaneSchoolTenantRecord[];
};

const CONTROL_PLANE_TABLE_NAME = "platform_school_tenants";
const CONTROL_PLANE_PAYMENTS_TABLE_NAME = "platform_school_payments";

//* Every column read back into a tenant record. Kept in one place so the list,
//* lookup, insert and update paths cannot drift apart.
const TENANT_COLUMNS = `
  id,
  slug,
  school_name,
  domains,
  login_codes,
  public_app_url,
  database_url,
  direct_url,
  database_url_unpooled,
  enabled,
  plan_tier,
  paid_through,
  trial_ends_at,
  closed,
  billing_notes,
  created_at,
  updated_at
`;
const CONTROL_PLANE_CACHE_TTL_MS = Number(
  process.env.CONTROL_PLANE_CACHE_TTL_MS ?? 15_000
);

const globalForControlPlane = globalThis as typeof globalThis & {
  __controlPlanePool?: Pool;
  __controlPlaneSchemaPromise?: Promise<void>;
  __controlPlaneSchoolTenantCache?: ControlPlaneCache;
};

function trimToEmpty(value?: string | null) {
  return value?.trim() ?? "";
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

function getControlPlaneConnectionString() {
  const raw = (
    trimToEmpty(process.env.CONTROL_PLANE_DATABASE_URL) ||
    trimToEmpty(process.env.CONTROL_PLANE_DATABASE_URL_UNPOOLED) ||
    trimToEmpty(process.env.CONTROL_PLANE_DIRECT_URL)
  );

  if (!raw) return "";

  return raw
    .replace(/([?&])channel_binding=[^&]*&?/g, "$1")
    .replace(/sslmode=require/g, "sslmode=verify-full")
    .replace(/[?&]$/, "");
}

export function isControlPlaneConfigured() {
  return Boolean(getControlPlaneConnectionString());
}

function getControlPlanePool() {
  const connectionString = getControlPlaneConnectionString();

  if (!connectionString) {
    throw new Error(
      "CONTROL_PLANE_DATABASE_URL is not configured. Add it in Vercel before using school onboarding."
    );
  }

  if (!globalForControlPlane.__controlPlanePool) {
    globalForControlPlane.__controlPlanePool = new Pool({
      connectionString,
      max: Number(process.env.CONTROL_PLANE_PG_POOL_MAX ?? 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: Number(
        process.env.CONTROL_PLANE_PG_CONNECTION_TIMEOUT_MS ?? 15_000
      ),
      query_timeout: Number(process.env.CONTROL_PLANE_PG_QUERY_TIMEOUT_MS ?? 30_000),
      statement_timeout: Number(
        process.env.CONTROL_PLANE_PG_STATEMENT_TIMEOUT_MS ?? 30_000
      ),
    });
  }

  return globalForControlPlane.__controlPlanePool;
}

async function ensureControlPlaneSchema() {
  if (!isControlPlaneConfigured()) {
    return;
  }

  if (!globalForControlPlane.__controlPlaneSchemaPromise) {
    globalForControlPlane.__controlPlaneSchemaPromise = (async () => {
      const pool = getControlPlanePool();
      await pool.query(`
          CREATE TABLE IF NOT EXISTS ${CONTROL_PLANE_TABLE_NAME} (
            id TEXT PRIMARY KEY,
            slug TEXT NOT NULL UNIQUE,
            school_name TEXT NOT NULL,
            domains TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
            login_codes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
            public_app_url TEXT,
            database_url TEXT NOT NULL,
            direct_url TEXT,
            database_url_unpooled TEXT,
            enabled BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `);
      await pool.query(`
          CREATE INDEX IF NOT EXISTS ${CONTROL_PLANE_TABLE_NAME}_enabled_idx
          ON ${CONTROL_PLANE_TABLE_NAME} (enabled);
        `);
      await pool.query(`
          CREATE INDEX IF NOT EXISTS ${CONTROL_PLANE_TABLE_NAME}_updated_at_idx
          ON ${CONTROL_PLANE_TABLE_NAME} (updated_at DESC);
        `);

      //* Billing columns are added separately so control planes created before
      //* subscriptions existed pick them up without a manual migration.
      //* Existing schools default to ENTERPRISE with no paid-through date and
      //* are grandfathered by the backfill below, never locked out on deploy.
      await pool.query(`
          ALTER TABLE ${CONTROL_PLANE_TABLE_NAME}
            ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'ENTERPRISE',
            ADD COLUMN IF NOT EXISTS paid_through TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS closed BOOLEAN NOT NULL DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS billing_notes TEXT;
        `);

      //* Grandfather anything onboarded before billing existed: a far-future
      //* paid-through date so no current customer is suspended by this deploy.
      //* Only touches rows that have never had a billing date set.
      await pool.query(`
          UPDATE ${CONTROL_PLANE_TABLE_NAME}
          SET paid_through = TIMESTAMPTZ '2099-12-31 00:00:00+00',
              billing_notes = COALESCE(
                billing_notes,
                'Grandfathered on subscription rollout.'
              )
          WHERE paid_through IS NULL
            AND trial_ends_at IS NULL
            AND closed = FALSE;
        `);

      await pool.query(`
          CREATE TABLE IF NOT EXISTS ${CONTROL_PLANE_PAYMENTS_TABLE_NAME} (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL
              REFERENCES ${CONTROL_PLANE_TABLE_NAME} (id) ON DELETE CASCADE,
            plan_tier TEXT NOT NULL,
            method TEXT NOT NULL,
            amount_pesewas INTEGER NOT NULL,
            currency TEXT NOT NULL DEFAULT 'GHS',
            period_start TIMESTAMPTZ NOT NULL,
            period_end TIMESTAMPTZ NOT NULL,
            receipt_reference TEXT,
            recorded_by TEXT,
            note TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `);

      //* Reconcile a payments table created by an earlier build. CREATE TABLE
      //* IF NOT EXISTS leaves an existing table untouched, so a control plane
      //* that ran the gateway-era schema still has its original columns.
      await pool.query(`
          ALTER TABLE ${CONTROL_PLANE_PAYMENTS_TABLE_NAME}
            ADD COLUMN IF NOT EXISTS receipt_reference TEXT;
        `);

      //* Guarded by column existence so this is a no-op on a fresh database.
      //* Deliberately non-destructive: old columns are carried across and then
      //* left in place rather than dropped, since this runs against a live
      //* control plane whose contents are not known here. They are nullable
      //* and unused, so they cost nothing beyond a little clutter.
      await pool.query(`
          DO $$
          BEGIN
            --* Carry across any references recorded under the old names.
            IF EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = '${CONTROL_PLANE_PAYMENTS_TABLE_NAME}'
                AND column_name = 'paystack_reference'
            ) THEN
              UPDATE ${CONTROL_PLANE_PAYMENTS_TABLE_NAME}
              SET receipt_reference = paystack_reference
              WHERE receipt_reference IS NULL
                AND paystack_reference IS NOT NULL;
            END IF;

            IF EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = '${CONTROL_PLANE_PAYMENTS_TABLE_NAME}'
                AND column_name = 'reference'
            ) THEN
              UPDATE ${CONTROL_PLANE_PAYMENTS_TABLE_NAME}
              SET receipt_reference = reference
              WHERE receipt_reference IS NULL
                AND reference IS NOT NULL;
            END IF;

            --* 'source' distinguished gateway from manual payments. With no
            --* gateway nothing sets it, so NOT NULL would reject every insert.
            IF EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = '${CONTROL_PLANE_PAYMENTS_TABLE_NAME}'
                AND column_name = 'source'
                AND is_nullable = 'NO'
            ) THEN
              ALTER TABLE ${CONTROL_PLANE_PAYMENTS_TABLE_NAME}
                ALTER COLUMN source DROP NOT NULL;
            END IF;
          END $$;
        `);

      //* Named index rather than an inline UNIQUE so fresh and migrated
      //* databases end up with the same constraint. ON CONFLICT infers from it.
      await pool.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS
            ${CONTROL_PLANE_PAYMENTS_TABLE_NAME}_receipt_reference_key
          ON ${CONTROL_PLANE_PAYMENTS_TABLE_NAME} (receipt_reference);
        `);
      await pool.query(`
          CREATE INDEX IF NOT EXISTS ${CONTROL_PLANE_PAYMENTS_TABLE_NAME}_tenant_idx
          ON ${CONTROL_PLANE_PAYMENTS_TABLE_NAME} (tenant_id, created_at DESC);
        `);
    })().catch((error) => {
      globalForControlPlane.__controlPlaneSchemaPromise = undefined;
      throw error;
    });
  }

  await globalForControlPlane.__controlPlaneSchemaPromise;
}

function toIsoStringOrNull(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return null;
}

function mapRowToSchoolTenantRecord(
  row: Record<string, unknown>
): ControlPlaneSchoolTenantRecord {
  return {
    id: String(row.id),
    slug: String(row.slug),
    schoolName: String(row.school_name),
    domains: Array.isArray(row.domains)
      ? row.domains.map((value) => String(value))
      : [],
    loginCodes: Array.isArray(row.login_codes)
      ? row.login_codes.map((value) => String(value))
      : [],
    publicAppUrl:
      typeof row.public_app_url === "string" ? row.public_app_url : null,
    databaseUrl: String(row.database_url),
    directUrl: typeof row.direct_url === "string" ? row.direct_url : null,
    databaseUrlUnpooled:
      typeof row.database_url_unpooled === "string"
        ? row.database_url_unpooled
        : null,
    enabled: Boolean(row.enabled),
    planTier: isPlanTier(row.plan_tier) ? row.plan_tier : "ENTERPRISE",
    paidThrough: toIsoStringOrNull(row.paid_through),
    trialEndsAt: toIsoStringOrNull(row.trial_ends_at),
    closed: Boolean(row.closed),
    billingNotes:
      typeof row.billing_notes === "string" ? row.billing_notes : null,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at),
  };
}

export function clearControlPlaneSchoolTenantCache() {
  globalForControlPlane.__controlPlaneSchoolTenantCache = undefined;
}

export async function listControlPlaneSchoolTenants() {
  if (!isControlPlaneConfigured()) {
    return [];
  }

  const cached = globalForControlPlane.__controlPlaneSchoolTenantCache;
  if (cached && Date.now() - cached.fetchedAt <= CONTROL_PLANE_CACHE_TTL_MS) {
    return cached.tenants;
  }

  await ensureControlPlaneSchema();

  const result = await getControlPlanePool().query(`
    SELECT ${TENANT_COLUMNS}
    FROM ${CONTROL_PLANE_TABLE_NAME}
    ORDER BY school_name ASC, slug ASC;
  `);

  const tenants = result.rows.map((row) => mapRowToSchoolTenantRecord(row));
  globalForControlPlane.__controlPlaneSchoolTenantCache = {
    fetchedAt: Date.now(),
    tenants,
  };

  return tenants;
}

export async function getControlPlaneSchoolTenantById(id: string) {
  if (!isControlPlaneConfigured()) {
    return null;
  }

  await ensureControlPlaneSchema();

  const result = await getControlPlanePool().query(
    `
      SELECT ${TENANT_COLUMNS}
      FROM ${CONTROL_PLANE_TABLE_NAME}
      WHERE id = $1
      LIMIT 1;
    `,
    [id]
  );

  return result.rows[0] ? mapRowToSchoolTenantRecord(result.rows[0]) : null;
}

export async function findControlPlaneSchoolTenantByHostname(
  hostname?: string | null
) {
  const normalizedHostname = normalizeHostname(hostname);

  if (!normalizedHostname || !isControlPlaneConfigured()) {
    return null;
  }

  const tenants = await listControlPlaneSchoolTenants();

  return (
    tenants.find((tenant) =>
      tenant.domains.some((domainRule) =>
        matchesDomain(normalizedHostname, normalizeHostname(domainRule))
      )
    ) ?? null
  );
}

export async function createControlPlaneSchoolTenant(
  input: ControlPlaneSchoolTenantInput
) {
  await ensureControlPlaneSchema();

  const id = randomUUID();

  const result = await getControlPlanePool().query(
    `
      INSERT INTO ${CONTROL_PLANE_TABLE_NAME} (
        id,
        slug,
        school_name,
        domains,
        login_codes,
        public_app_url,
        database_url,
        direct_url,
        database_url_unpooled,
        enabled
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING ${TENANT_COLUMNS};
    `,
    [
      id,
      input.slug,
      input.schoolName,
      input.domains,
      input.loginCodes,
      input.publicAppUrl,
      input.databaseUrl,
      input.directUrl,
      input.databaseUrlUnpooled,
      input.enabled,
    ]
  );

  clearControlPlaneSchoolTenantCache();
  return mapRowToSchoolTenantRecord(result.rows[0]);
}

export async function updateControlPlaneSchoolTenant(
  id: string,
  input: ControlPlaneSchoolTenantInput
) {
  await ensureControlPlaneSchema();

  const result = await getControlPlanePool().query(
    `
      UPDATE ${CONTROL_PLANE_TABLE_NAME}
      SET
        slug = $2,
        school_name = $3,
        domains = $4,
        login_codes = $5,
        public_app_url = $6,
        database_url = $7,
        direct_url = $8,
        database_url_unpooled = $9,
        enabled = $10,
        updated_at = NOW()
      WHERE id = $1
      RETURNING ${TENANT_COLUMNS};
    `,
    [
      id,
      input.slug,
      input.schoolName,
      input.domains,
      input.loginCodes,
      input.publicAppUrl,
      input.databaseUrl,
      input.directUrl,
      input.databaseUrlUnpooled,
      input.enabled,
    ]
  );

  clearControlPlaneSchoolTenantCache();
  return result.rows[0] ? mapRowToSchoolTenantRecord(result.rows[0]) : null;
}

export async function deleteControlPlaneSchoolTenant(id: string) {
  await ensureControlPlaneSchema();
  await getControlPlanePool().query(
    `
      DELETE FROM ${CONTROL_PLANE_TABLE_NAME}
      WHERE id = $1;
    `,
    [id]
  );
  clearControlPlaneSchoolTenantCache();
}

function getConnectionDisplayHost(value?: string | null) {
  const connectionString = trimToEmpty(value);

  if (!connectionString) {
    return null;
  }

  try {
    const parsed = new URL(connectionString);
    return parsed.hostname || connectionString.slice(0, 32);
  } catch {
    return connectionString.slice(0, 32);
  }
}

export function summarizeControlPlaneSchoolTenant(
  tenant: ControlPlaneSchoolTenantRecord
) {
  const billing = getTenantBillingState(tenant);

  return {
    id: tenant.id,
    slug: tenant.slug,
    schoolName: tenant.schoolName,
    domains: tenant.domains,
    loginCodes: tenant.loginCodes,
    publicAppUrl: tenant.publicAppUrl,
    enabled: tenant.enabled,
    databaseHost: getConnectionDisplayHost(tenant.databaseUrl),
    hasDirectUrl: Boolean(tenant.directUrl),
    hasUnpooledUrl: Boolean(tenant.databaseUrlUnpooled),
    planTier: tenant.planTier,
    planLabel: PLANS[tenant.planTier].label,
    studentCap: PLANS[tenant.planTier].studentCap,
    paidThrough: tenant.paidThrough,
    trialEndsAt: tenant.trialEndsAt,
    billingStatus: billing.status,
    hasAccess: billing.hasAccess,
    daysRemaining: billing.daysRemaining,
    billingNotes: tenant.billingNotes,
    updatedAt: tenant.updatedAt,
  };
}

//* ─────────────────────────────────────────────
//*  Billing
//* ─────────────────────────────────────────────

/**
 * Billing state for a tenant, derived from its dates plus the operator kill
 * switch. A school disabled by hand has no access regardless of what it paid.
 */
export function getTenantBillingState(
  tenant: ControlPlaneSchoolTenantRecord,
  now?: Date
) {
  const state = deriveBillingState({
    planTier: tenant.planTier,
    paidThrough: tenant.paidThrough ? new Date(tenant.paidThrough) : null,
    trialEndsAt: tenant.trialEndsAt ? new Date(tenant.trialEndsAt) : null,
    enabled: tenant.enabled,
    closed: tenant.closed,
    now,
  });

  if (!tenant.enabled) {
    return { ...state, hasAccess: false };
  }

  return state;
}

export type ControlPlaneSchoolBillingInput = {
  planTier: PlanTier;
  paidThrough: Date | null;
  trialEndsAt: Date | null;
  closed: boolean;
  billingNotes: string | null;
};

/** Set a school's plan directly. Operator action, always audited by the caller. */
export async function updateControlPlaneSchoolBilling(
  id: string,
  input: ControlPlaneSchoolBillingInput
) {
  await ensureControlPlaneSchema();

  const result = await getControlPlanePool().query(
    `
      UPDATE ${CONTROL_PLANE_TABLE_NAME}
      SET
        plan_tier = $2,
        paid_through = $3,
        trial_ends_at = $4,
        closed = $5,
        billing_notes = $6,
        updated_at = NOW()
      WHERE id = $1
      RETURNING ${TENANT_COLUMNS};
    `,
    [
      id,
      input.planTier,
      input.paidThrough,
      input.trialEndsAt,
      input.closed,
      input.billingNotes,
    ]
  );

  clearControlPlaneSchoolTenantCache();
  return result.rows[0] ? mapRowToSchoolTenantRecord(result.rows[0]) : null;
}

export type ControlPlaneSchoolPaymentRecord = {
  id: string;
  tenantId: string;
  planTier: PlanTier;
  method: PaymentMethod;
  amountPesewas: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  receiptReference: string | null;
  recordedBy: string | null;
  note: string | null;
  createdAt: string;
};

function mapRowToPaymentRecord(
  row: Record<string, unknown>
): ControlPlaneSchoolPaymentRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    planTier: isPlanTier(row.plan_tier) ? row.plan_tier : "STARTER",
    method: String(row.method) as PaymentMethod,
    amountPesewas: Number(row.amount_pesewas),
    currency: String(row.currency ?? "GHS"),
    periodStart: toIsoStringOrNull(row.period_start) ?? "",
    periodEnd: toIsoStringOrNull(row.period_end) ?? "",
    receiptReference:
      typeof row.receipt_reference === "string" ? row.receipt_reference : null,
    recordedBy: typeof row.recorded_by === "string" ? row.recorded_by : null,
    note: typeof row.note === "string" ? row.note : null,
    createdAt: toIsoStringOrNull(row.created_at) ?? "",
  };
}

export type RecordSchoolPaymentInput = {
  tenantId: string;
  planTier: PlanTier;
  method: PaymentMethod;
  amountPesewas: number;
  periodStart: Date;
  periodEnd: Date;
  //* Your receipt or transaction number. UNIQUE in the database, so entering
  //* the same receipt twice is rejected instead of granting double the time.
  receiptReference?: string | null;
  recordedBy?: string | null;
  note?: string | null;
};

export type RecordSchoolPaymentResult = {
  //* False when that receipt reference had already been recorded.
  applied: boolean;
  payment: ControlPlaneSchoolPaymentRecord | null;
  tenant: ControlPlaneSchoolTenantRecord | null;
};

/**
 * Record a payment and extend the school's access in one transaction. This is
 * the single path by which any school gains time — cash, mobile money, bank
 * transfer or a complimentary grant all land here.
 *
 * paid_through moves to the later of its current value and the new period end,
 * so renewing early adds time instead of shortening it.
 */
export async function recordControlPlaneSchoolPayment(
  input: RecordSchoolPaymentInput
): Promise<RecordSchoolPaymentResult> {
  await ensureControlPlaneSchema();

  const client = await getControlPlanePool().connect();

  try {
    await client.query("BEGIN");

    const paymentResult = await client.query(
      `
        INSERT INTO ${CONTROL_PLANE_PAYMENTS_TABLE_NAME} (
          id, tenant_id, plan_tier, method, amount_pesewas,
          currency, period_start, period_end, receipt_reference,
          recorded_by, note
        )
        VALUES ($1,$2,$3,$4,$5,'GHS',$6,$7,$8,$9,$10)
        ON CONFLICT (receipt_reference) DO NOTHING
        RETURNING *;
      `,
      [
        randomUUID(),
        input.tenantId,
        input.planTier,
        input.method,
        input.amountPesewas,
        input.periodStart,
        input.periodEnd,
        input.receiptReference ?? null,
        input.recordedBy ?? null,
        input.note ?? null,
      ]
    );

    //* Receipt already recorded: reject rather than granting time twice.
    if (paymentResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return { applied: false, payment: null, tenant: null };
    }

    const tenantResult = await client.query(
      `
        UPDATE ${CONTROL_PLANE_TABLE_NAME}
        SET
          plan_tier = $2,
          paid_through = GREATEST(
            COALESCE(paid_through, TIMESTAMPTZ 'epoch'),
            $3::TIMESTAMPTZ
          ),
          trial_ends_at = NULL,
          closed = FALSE,
          updated_at = NOW()
        WHERE id = $1
        RETURNING ${TENANT_COLUMNS};
      `,
      [input.tenantId, input.planTier, input.periodEnd]
    );

    await client.query("COMMIT");
    clearControlPlaneSchoolTenantCache();

    return {
      applied: true,
      payment: mapRowToPaymentRecord(paymentResult.rows[0]),
      tenant: tenantResult.rows[0]
        ? mapRowToSchoolTenantRecord(tenantResult.rows[0])
        : null,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listControlPlaneSchoolPayments(tenantId: string) {
  await ensureControlPlaneSchema();

  const result = await getControlPlanePool().query(
    `
      SELECT *
      FROM ${CONTROL_PLANE_PAYMENTS_TABLE_NAME}
      WHERE tenant_id = $1
      ORDER BY created_at DESC;
    `,
    [tenantId]
  );

  return result.rows.map((row) => mapRowToPaymentRecord(row));
}

export async function getControlPlaneStatus() {
  if (!isControlPlaneConfigured()) {
    return {
      configured: false,
      connectionHost: null as string | null,
      tenantCount: 0,
    };
  }

  const tenants = await listControlPlaneSchoolTenants();

  return {
    configured: true,
    connectionHost: getConnectionDisplayHost(getControlPlaneConnectionString()),
    tenantCount: tenants.length,
  };
}
