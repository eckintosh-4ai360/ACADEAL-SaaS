-- CreateEnum
CREATE TYPE "AuditLogStatus" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" "AuditLogStatus" NOT NULL DEFAULT 'SUCCESS',
    "actorId" TEXT,
    "actorLoginId" TEXT,
    "actorName" TEXT,
    "actorRole" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "entityLabel" TEXT,
    "source" TEXT NOT NULL DEFAULT 'server_action',
    "path" TEXT,
    "ipAddress" TEXT,
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "canonicalLine" TEXT NOT NULL,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_category_createdAt_idx" ON "AuditLog"("category", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_status_createdAt_idx" ON "AuditLog"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorLoginId_createdAt_idx" ON "AuditLog"("actorLoginId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_requestId_idx" ON "AuditLog"("requestId");

-- Backfill existing login/activity history into the new canonical audit stream.
INSERT INTO "AuditLog" (
    "id",
    "requestId",
    "action",
    "category",
    "status",
    "actorId",
    "actorLoginId",
    "actorName",
    "actorRole",
    "entityType",
    "entityId",
    "entityLabel",
    "source",
    "path",
    "ipAddress",
    "summary",
    "metadata",
    "canonicalLine",
    "createdAt"
)
SELECT
    'activitylog-' || "id"::TEXT,
    'legacy-activity-log-' || "id"::TEXT,
    CASE
        WHEN LOWER(COALESCE("action", '')) = 'login' THEN 'auth.login'
        ELSE 'activity.legacy'
    END,
    CASE
        WHEN LOWER(COALESCE("action", '')) = 'login' THEN 'authentication'
        ELSE 'legacy'
    END,
    'SUCCESS'::"AuditLogStatus",
    "userId",
    NULL,
    "userName",
    "role",
    'user_session',
    "userId",
    "userName",
    'legacy_migration',
    NULL,
    COALESCE("ipAddress", 'unknown'),
    CASE
        WHEN LOWER(COALESCE("action", '')) = 'login' THEN COALESCE("userName", 'Unknown user') || ' signed in'
        ELSE COALESCE("action", 'Legacy activity log')
    END,
    jsonb_build_object(
        'legacyActivityLogId', "id",
        'legacyAction', "action"
    ),
    CONCAT(
        'canonical-audit-log action=',
        CASE
            WHEN LOWER(COALESCE("action", '')) = 'login' THEN 'auth.login'
            ELSE 'activity.legacy'
        END,
        ' category=',
        CASE
            WHEN LOWER(COALESCE("action", '')) = 'login' THEN 'authentication'
            ELSE 'legacy'
        END,
        ' status=SUCCESS actor_id=',
        COALESCE(NULLIF(REPLACE("userId", ' ', '_'), ''), 'unknown'),
        ' actor_name="',
        REPLACE(COALESCE("userName", 'Unknown user'), '"', '\"'),
        '" actor_role=',
        LOWER(COALESCE("role", 'unknown')),
        ' source=legacy_migration request_id=legacy-activity-log-',
        "id"::TEXT
    ),
    "createdAt"
FROM "ActivityLog";
