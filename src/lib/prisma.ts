import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { resolveTenantContext, type TenantDefinition } from "./tenant";

type Catchable = {
  catch: (onRejected: (error: unknown) => unknown) => unknown;
};

type PrismaRuntimeCache = {
  adapters: Map<string, PrismaPg>;
  clients: Map<string, PrismaClient>;
  clientSchemaSignatures: Map<string, string>;
  pools: Map<string, pg.Pool>;
  initializedConnections: Set<string>;
};

type RuntimeConnectionConfig = {
  cacheKey: string;
  connectionSource: string;
  connectionString: string;
  tenant: TenantDefinition;
};

type RuntimeFieldLike = {
  name?: string;
};

type RuntimeModelLike = {
  fields?: RuntimeFieldLike[] | Record<string, RuntimeFieldLike>;
};

type RuntimeDataModelLike = {
  models?: Record<string, RuntimeModelLike>;
};

const expectedDelegateNames = new Set(
  Prisma.dmmf.datamodel.models.map((model) => {
    return `${model.name.slice(0, 1).toLowerCase()}${model.name.slice(1)}`;
  })
);

const currentSchemaSignature = Prisma.dmmf.datamodel.models
  .map((model) => {
    const fieldList = model.fields
      .map((field) => field.name)
      .sort()
      .join(",");

    return `${model.name}:${fieldList}`;
  })
  .sort()
  .join("|");

const topLevelMethodNames = new Set([
  "$connect",
  "$disconnect",
  "$executeRaw",
  "$executeRawUnsafe",
  "$extends",
  "$on",
  "$queryRaw",
  "$queryRawUnsafe",
  "$transaction",
  "$use",
]);

const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

const globalForPrisma = globalThis as typeof globalThis & {
  __prismaRuntimeCache?: PrismaRuntimeCache;
};

function isCatchable(value: unknown): value is Catchable {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const maybeCatch = (value as { catch?: unknown }).catch;
  return typeof maybeCatch === "function";
}

function hasExpectedModelDelegates(client: PrismaClient) {
  const clientRecord = client as unknown as Record<string, unknown>;

  return Array.from(expectedDelegateNames).every((delegateName) => {
    const exists = typeof clientRecord[delegateName] !== "undefined";

    if (!exists) {
      console.warn(`[Prisma Runtime] Missing expected model delegate: ${delegateName}`);
    }

    return exists;
  });
}

function getClientSchemaSignature(client: PrismaClient) {
  const runtimeDataModel = (client as unknown as { _runtimeDataModel?: RuntimeDataModelLike })
    ._runtimeDataModel;

  if (!runtimeDataModel?.models) {
    return null;
  }

  const signatureParts: string[] = [];

  for (const model of Prisma.dmmf.datamodel.models) {
    const runtimeModel = runtimeDataModel.models[model.name];

    if (!runtimeModel?.fields) {
      return null;
    }

    const runtimeFieldNames = Array.isArray(runtimeModel.fields)
      ? runtimeModel.fields
          .map((field) => field.name)
          .filter((fieldName): fieldName is string => typeof fieldName === "string")
      : Object.entries(runtimeModel.fields).map(([fieldName, field]) => {
          return typeof field?.name === "string" ? field.name : fieldName;
        });

    signatureParts.push(`${model.name}:${runtimeFieldNames.sort().join(",")}`);
  }

  return signatureParts.sort().join("|");
}

function hasCompatibleSchema(client: PrismaClient, cacheKey: string) {
  if (!hasExpectedModelDelegates(client)) {
    return false;
  }

  const runtimeCache = getRuntimeCache();
  const cachedSignature = runtimeCache.clientSchemaSignatures.get(cacheKey);

  if (cachedSignature) {
    return cachedSignature === currentSchemaSignature;
  }

  const clientSignature = getClientSchemaSignature(client);

  if (!clientSignature) {
    console.warn(
      `[Prisma Runtime] Unable to inspect cached client schema for ${cacheKey}. Recreating Prisma client.`
    );
    return false;
  }

  if (clientSignature !== currentSchemaSignature) {
    console.warn(
      `[Prisma Runtime] Cached Prisma client schema is stale for ${cacheKey}. Recreating Prisma client.`
    );
    return false;
  }

  runtimeCache.clientSchemaSignatures.set(cacheKey, clientSignature);
  return true;
}

function getRuntimeCache() {
  if (!globalForPrisma.__prismaRuntimeCache) {
    globalForPrisma.__prismaRuntimeCache = {
      adapters: new Map<string, PrismaPg>(),
      clients: new Map<string, PrismaClient>(),
      clientSchemaSignatures: new Map<string, string>(),
      pools: new Map<string, pg.Pool>(),
      initializedConnections: new Set<string>(),
    };
  }

  return globalForPrisma.__prismaRuntimeCache;
}

function resolveConnectionString(tenant: TenantDefinition) {
  const raw = (
    tenant.databaseUrl.trim() ||
    tenant.databaseUrlUnpooled?.trim() ||
    tenant.directUrl?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.DATABASE_URL_UNPOOLED?.trim() ||
    process.env.DIRECT_URL?.trim() ||
    ""
  );

  if (!raw) return "";

  return raw
    .replace(/([?&])channel_binding=[^&]*&?/g, "$1")
    .replace(/sslmode=require/g, "sslmode=verify-full")
    .replace(/[?&]$/, "");
}

function getRuntimeConnectionConfig(tenant: TenantDefinition): RuntimeConnectionConfig {
  const connectionString = resolveConnectionString(tenant);

  if (!connectionString) {
    throw new Error(
      `No database connection string is configured for tenant "${tenant.slug}". ` +
        `Add databaseUrl to TENANT_DIRECTORY_JSON or define DATABASE_URL for the default tenant.`
    );
  }

  return {
    cacheKey: connectionString,
    connectionSource: `tenant:${tenant.slug}`,
    connectionString,
    tenant,
  };
}

function createPool(config: RuntimeConnectionConfig) {
  return new pg.Pool({
    connectionString: config.connectionString,
    max: Number(process.env.PG_POOL_MAX ?? 20),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS ?? 15_000),
    query_timeout: Number(process.env.PG_QUERY_TIMEOUT_MS ?? 30_000),
    statement_timeout: Number(process.env.PG_STATEMENT_TIMEOUT_MS ?? 30_000),
  });
}

function getOrCreatePool(config: RuntimeConnectionConfig) {
  const runtimeCache = getRuntimeCache();
  const existingPool = runtimeCache.pools.get(config.cacheKey);

  if (existingPool) {
    return existingPool;
  }

  const pool = createPool(config);
  runtimeCache.pools.set(config.cacheKey, pool);
  return pool;
}

function getOrCreateAdapter(config: RuntimeConnectionConfig) {
  const runtimeCache = getRuntimeCache();
  const existingAdapter = runtimeCache.adapters.get(config.cacheKey);

  if (existingAdapter) {
    return existingAdapter;
  }

  const adapter = new PrismaPg(getOrCreatePool(config));
  runtimeCache.adapters.set(config.cacheKey, adapter);
  return adapter;
}

/**
 * Password hashes are stripped from every query result by default.
 *
 * The risk this closes is `include`, which returns every scalar on the related
 * model. A page that writes `include: { parent: true }` and hands the result
 * to a client component ships bcrypt hashes to the browser, and that pattern
 * appears across the dashboard.
 *
 * Prisma discards a global omit whenever a query supplies its own `select`, so
 * the handful of places that genuinely need the hash — sign-in, password
 * reset, staff profile sync — keep working unchanged because they all select
 * the field explicitly. Anything that needs it in future must do the same,
 * which makes reading a password hash a deliberate act rather than a default.
 */
const GLOBAL_OMIT = {
  admin: { password: true },
  teacher: { password: true },
  student: { password: true },
  parent: { password: true },
  staff: { password: true },
} as const;

function createPrismaClient(config: RuntimeConnectionConfig): PrismaClient {
  //* Cast back to the plain client type. The omit is a runtime guarantee; if
  //* it were in the type as well, every helper that accepts a PrismaClient
  //* would need to be re-typed against the narrowed shape.
  return new PrismaClient({
    adapter: getOrCreateAdapter(config),
    omit: GLOBAL_OMIT,
  }) as unknown as PrismaClient;
}

function getOrCreatePrismaClient(config: RuntimeConnectionConfig) {
  const runtimeCache = getRuntimeCache();
  const existingClient = runtimeCache.clients.get(config.cacheKey);

  if (existingClient && hasCompatibleSchema(existingClient, config.cacheKey)) {
    return existingClient;
  }

  const client = createPrismaClient(config);
  runtimeCache.clients.set(config.cacheKey, client);
  runtimeCache.clientSchemaSignatures.set(config.cacheKey, currentSchemaSignature);

  if (!isBuildPhase && !runtimeCache.initializedConnections.has(config.cacheKey)) {
    console.log(
      `[Prisma Runtime] Initializing client for tenant "${config.tenant.slug}" using ${config.connectionSource}`
    );
    runtimeCache.initializedConnections.add(config.cacheKey);
  }

  return client;
}

function getBuildFallbackValue(modelProp: PropertyKey) {
  const methodName = String(modelProp).toLowerCase();

  if (methodName.includes("many")) return [];
  if (methodName.includes("count")) return 0;
  if (methodName.includes("findunique") || methodName.includes("findfirst")) return null;
  return null;
}

async function getActivePrismaClient() {
  const tenantContext = await resolveTenantContext();
  return getOrCreatePrismaClient(getRuntimeConnectionConfig(tenantContext.tenant));
}

export async function getTenantPrismaClient(tenant?: TenantDefinition) {
  if (tenant) {
    return getOrCreatePrismaClient(getRuntimeConnectionConfig(tenant));
  }

  return getActivePrismaClient();
}

async function invokeModelMethod(modelName: string, modelProp: PropertyKey, args: unknown[]) {
  const client = await getActivePrismaClient();
  const clientRecord = client as unknown as Record<string, unknown>;
  const delegate = clientRecord[modelName];

  if (typeof delegate !== "object" || delegate === null) {
    throw new Error(
      `Prisma delegate "${modelName}" is unavailable. Regenerate the Prisma client and restart the Next.js server so the runtime picks up the latest schema.`
    );
  }

  const delegateRecord = delegate as Record<PropertyKey, unknown>;
  const method = delegateRecord[modelProp];

  if (typeof method !== "function") {
    return method;
  }

  try {
    const result = (method as (...params: unknown[]) => unknown).apply(delegate, args);

    if (isBuildPhase && isCatchable(result)) {
      return result.catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[Prisma Build Fallback] ${modelName}.${String(modelProp)}: ${message}`);
        return getBuildFallbackValue(modelProp);
      });
    }

    return result;
  } catch (error) {
    if (isBuildPhase) {
      console.warn(`[Prisma Build Fallback Sync] ${modelName}.${String(modelProp)}`);
      return getBuildFallbackValue(modelProp);
    }

    throw error;
  }
}

async function invokeTopLevelMethod(prop: string, args: unknown[]) {
  const client = await getActivePrismaClient();
  const clientRecord = client as unknown as Record<string, unknown>;
  const method = clientRecord[prop];

  if (typeof method !== "function") {
    return method;
  }

  if (prop === "$transaction" && Array.isArray(args[0])) {
    throw new Error(
      'Tenant-aware Prisma does not support array-style `$transaction([...])`. Use callback form: `prisma.$transaction(async (tx) => { ... })`.'
    );
  }

  return (method as (...params: unknown[]) => unknown).apply(client, args);
}

const prismaTarget = {} as PrismaClient;

export const prisma = new Proxy(prismaTarget, {
  get(_target, prop) {
    if (prop === Symbol.toStringTag) {
      return "PrismaClient";
    }

    if (typeof prop === "string" && expectedDelegateNames.has(prop)) {
      return new Proxy(
        {},
        {
          get(_modelTarget, modelProp) {
            if (typeof modelProp === "symbol") {
              return undefined;
            }

            return (...args: unknown[]) => invokeModelMethod(prop, modelProp, args);
          },
        }
      );
    }

    if (typeof prop === "string" && topLevelMethodNames.has(prop)) {
      return (...args: unknown[]) => invokeTopLevelMethod(prop, args);
    }

    return undefined;
  },
}) as PrismaClient;

export default prisma;
