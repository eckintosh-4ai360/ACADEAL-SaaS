import pg from "pg";
import type {
  ControlPlaneSchoolTenantInput,
  ControlPlaneSchoolTenantRecord,
} from "./control-plane";

const DEFAULT_SCHOOL_NAME = "Student Management System";
const DEFAULT_SCHOOL_SHORT_NAME = "SMS";
const DEFAULT_STUDENT_ID_INITIALS = "CTS";
const SYSTEM_SETTINGS_REGCLASS = 'public."SystemSettings"';
const SYSTEM_SETTINGS_TABLE_NAME = "SystemSettings";

const SYSTEM_SETTINGS_REQUIRED_COLUMNS = [
  {
    name: "schoolName",
    definition: `TEXT NOT NULL DEFAULT '${DEFAULT_SCHOOL_NAME}'`,
  },
  {
    name: "schoolShortName",
    definition: `TEXT NOT NULL DEFAULT '${DEFAULT_SCHOOL_SHORT_NAME}'`,
  },
  {
    name: "publicAppUrl",
    definition: "TEXT",
  },
  {
    name: "studentIdInitials",
    definition: `TEXT NOT NULL DEFAULT '${DEFAULT_STUDENT_ID_INITIALS}'`,
  },
  {
    name: "updatedAt",
    definition: "TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP",
  },
] as const;

type TenantDatabaseBootstrapOptions = {
  previous?: Pick<
    ControlPlaneSchoolTenantRecord,
    "slug" | "schoolName" | "publicAppUrl"
  > | null;
};

export type TenantDatabaseBootstrapResult = {
  databaseName: string;
  createdSettingsRow: boolean;
  updatedFields: string[];
};

type SystemSettingsRow = {
  id: number;
  schoolName: string | null;
  schoolShortName: string | null;
  publicAppUrl: string | null;
  studentIdInitials: string | null;
};

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, "\"\"")}"`;
}

async function ensureSystemSettingsColumns(client: pg.Client) {
  const columnsResult = await client.query<{ columnName: string }>(
    `
      SELECT column_name AS "columnName"
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1;
    `,
    [SYSTEM_SETTINGS_TABLE_NAME]
  );

  const existingColumns = new Set(
    columnsResult.rows.map((row) => row.columnName)
  );

  for (const column of SYSTEM_SETTINGS_REQUIRED_COLUMNS) {
    if (existingColumns.has(column.name)) {
      continue;
    }

    await client.query(
      `
        ALTER TABLE "SystemSettings"
        ADD COLUMN IF NOT EXISTS ${quoteIdentifier(column.name)} ${column.definition};
      `
    );
  }
}

function trimToEmpty(value?: string | null) {
  return value?.trim() ?? "";
}

function normalizePublicAppUrl(value?: string | null) {
  const trimmed = trimToEmpty(value);

  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\/+$/, "");
}

function getBootstrapConnectionString(input: ControlPlaneSchoolTenantInput) {
  return (
    trimToEmpty(input.directUrl) ||
    trimToEmpty(input.databaseUrlUnpooled) ||
    trimToEmpty(input.databaseUrl)
  );
}

function getWords(value: string) {
  return value.match(/[A-Za-z0-9]+/g) ?? [];
}

function deriveSchoolShortName(schoolName: string, slug: string) {
  const words = getWords(schoolName);

  if (words.length >= 2) {
    const initials = words
      .map((word) => word[0] ?? "")
      .join("")
      .toUpperCase();

    if (initials) {
      return initials.slice(0, 12);
    }
  }

  const compactName = words.join("").toUpperCase();
  if (compactName) {
    return compactName.slice(0, 12);
  }

  const compactSlug = slug.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return compactSlug.slice(0, 12) || DEFAULT_SCHOOL_SHORT_NAME;
}

function deriveStudentIdInitials(schoolName: string, slug: string) {
  const shortName = deriveSchoolShortName(schoolName, slug);
  const compactValue = shortName.replace(/[^A-Z0-9]/gi, "").toUpperCase();

  if (compactValue.length >= 3) {
    return compactValue.slice(0, 3);
  }

  const fallback = slug.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return (compactValue + fallback).slice(0, 3) || DEFAULT_STUDENT_ID_INITIALS;
}

function normalizeComparableText(value?: string | null) {
  return trimToEmpty(value);
}

function shouldSyncTextField(
  currentValue: string | null | undefined,
  desiredValue: string | null | undefined,
  candidates: Array<string | null | undefined>
) {
  const current = normalizeComparableText(currentValue);
  const desired = normalizeComparableText(desiredValue);

  if (current === desired) {
    return false;
  }

  return new Set(["", ...candidates.map((candidate) => normalizeComparableText(candidate))]).has(
    current
  );
}

export async function verifyAndBootstrapTenantDatabase(
  input: ControlPlaneSchoolTenantInput,
  options: TenantDatabaseBootstrapOptions = {}
): Promise<TenantDatabaseBootstrapResult> {
  const connectionString = getBootstrapConnectionString(input);

  if (!connectionString) {
    throw new Error("Tenant database URL is missing.");
  }

  const desiredPublicAppUrl = normalizePublicAppUrl(input.publicAppUrl);
  const desiredShortName = deriveSchoolShortName(input.schoolName, input.slug);
  const desiredStudentIdInitials = deriveStudentIdInitials(
    input.schoolName,
    input.slug
  );
  const previousSchoolName = options.previous?.schoolName ?? null;
  const previousPublicAppUrl = normalizePublicAppUrl(
    options.previous?.publicAppUrl ?? null
  );
  const previousShortName = options.previous
    ? deriveSchoolShortName(options.previous.schoolName, options.previous.slug)
    : null;
  const previousStudentIdInitials = options.previous
    ? deriveStudentIdInitials(options.previous.schoolName, options.previous.slug)
    : null;

  const client = new pg.Client({
    application_name: "acadeal-school-onboarding",
    connectionString,
    connectionTimeoutMillis: Number(
      process.env.TENANT_BOOTSTRAP_PG_CONNECTION_TIMEOUT_MS ?? 15_000
    ),
    query_timeout: Number(process.env.TENANT_BOOTSTRAP_PG_QUERY_TIMEOUT_MS ?? 30_000),
    statement_timeout: Number(
      process.env.TENANT_BOOTSTRAP_PG_STATEMENT_TIMEOUT_MS ?? 30_000
    ),
  });

  try {
    await client.connect();

    const verificationResult = await client.query<{
      databaseName: string;
      settingsTableName: string | null;
    }>(
      `
        SELECT
          current_database() AS "databaseName",
          to_regclass($1) AS "settingsTableName";
      `,
      [SYSTEM_SETTINGS_REGCLASS]
    );

    const verificationRow = verificationResult.rows[0];
    const databaseName = verificationRow?.databaseName || "unknown";

    if (!verificationRow?.settingsTableName) {
      throw new Error(
        `Connected to "${databaseName}", but the SystemSettings table was not found. Run Prisma migrations for that school database before onboarding it.`
      );
    }

    await ensureSystemSettingsColumns(client);

    const settingsResult = await client.query<SystemSettingsRow>(`
      SELECT
        id,
        "schoolName",
        "schoolShortName",
        "publicAppUrl",
        "studentIdInitials"
      FROM "SystemSettings"
      ORDER BY id ASC
      LIMIT 1;
    `);

    const existingSettings = settingsResult.rows[0];

    if (!existingSettings) {
      await client.query(
        `
          INSERT INTO "SystemSettings" (
            "schoolName",
            "schoolShortName",
            "publicAppUrl",
            "studentIdInitials",
            "updatedAt"
          )
          VALUES ($1, $2, $3, $4, NOW());
        `,
        [
          input.schoolName,
          desiredShortName,
          desiredPublicAppUrl,
          desiredStudentIdInitials,
        ]
      );

      return {
        databaseName,
        createdSettingsRow: true,
        updatedFields: [
          "schoolName",
          "schoolShortName",
          "publicAppUrl",
          "studentIdInitials",
        ],
      };
    }

    const updates: Array<{ column: keyof Omit<SystemSettingsRow, "id">; value: string | null }> =
      [];

    if (
      shouldSyncTextField(existingSettings.schoolName, input.schoolName, [
        DEFAULT_SCHOOL_NAME,
        previousSchoolName,
      ])
    ) {
      updates.push({ column: "schoolName", value: input.schoolName });
    }

    if (
      shouldSyncTextField(existingSettings.schoolShortName, desiredShortName, [
        DEFAULT_SCHOOL_SHORT_NAME,
        previousShortName,
      ])
    ) {
      updates.push({ column: "schoolShortName", value: desiredShortName });
    }

    if (
      shouldSyncTextField(existingSettings.publicAppUrl, desiredPublicAppUrl, [
        previousPublicAppUrl,
      ])
    ) {
      updates.push({ column: "publicAppUrl", value: desiredPublicAppUrl });
    }

    if (
      shouldSyncTextField(existingSettings.studentIdInitials, desiredStudentIdInitials, [
        DEFAULT_STUDENT_ID_INITIALS,
        previousStudentIdInitials,
      ])
    ) {
      updates.push({
        column: "studentIdInitials",
        value: desiredStudentIdInitials,
      });
    }

    if (updates.length > 0) {
      const setClauses = updates.map(
        (update, index) => `"${update.column}" = $${index + 2}`
      );

      await client.query(
        `
          UPDATE "SystemSettings"
          SET ${setClauses.join(", ")}, "updatedAt" = NOW()
          WHERE id = $1;
        `,
        [existingSettings.id, ...updates.map((update) => update.value)]
      );
    }

    return {
      databaseName,
      createdSettingsRow: false,
      updatedFields: updates.map((update) => update.column),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Tenant database verification failed: ${message}`);
  } finally {
    await client.end().catch(() => undefined);
  }
}
