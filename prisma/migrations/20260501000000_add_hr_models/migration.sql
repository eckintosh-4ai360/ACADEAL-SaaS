-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'SICK', 'MATERNITY', 'PATERNITY', 'UNPAID', 'EMERGENCY');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "AppraisalCycleStatus" AS ENUM ('OPEN', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "AppraisalRecommendation" AS ENUM ('PROMOTE', 'RETAIN', 'IMPROVE', 'DISMISS');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PayrollRun" (
    "id" SERIAL NOT NULL,
    "period" TEXT NOT NULL,
    "periodType" TEXT NOT NULL DEFAULT 'MONTHLY',
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "totalGross" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalNet" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedByName" TEXT,
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PayrollEntry" (
    "id" SERIAL NOT NULL,
    "runId" INTEGER NOT NULL,
    "staffId" TEXT NOT NULL,
    "staffName" TEXT NOT NULL,
    "staffType" TEXT NOT NULL,
    "staffProfileId" TEXT,
    "grossSalary" DOUBLE PRECISION NOT NULL,
    "taxDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ssnitDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netSalary" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LeaveRequest" (
    "id" SERIAL NOT NULL,
    "staffId" TEXT NOT NULL,
    "staffName" TEXT NOT NULL,
    "staffType" TEXT NOT NULL,
    "staffProfileId" TEXT,
    "leaveType" "LeaveType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedByName" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AppraisalCycle" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "AppraisalCycleStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppraisalCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AppraisalRecord" (
    "id" SERIAL NOT NULL,
    "cycleId" INTEGER NOT NULL,
    "staffId" TEXT NOT NULL,
    "staffName" TEXT NOT NULL,
    "staffType" TEXT NOT NULL,
    "staffProfileId" TEXT,
    "score" INTEGER NOT NULL,
    "teachingScore" INTEGER,
    "professionalScore" INTEGER,
    "conductScore" INTEGER,
    "comments" TEXT,
    "strengths" TEXT,
    "improvements" TEXT,
    "recommendation" "AppraisalRecommendation" NOT NULL DEFAULT 'RETAIN',
    "reviewerId" TEXT NOT NULL,
    "reviewerName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppraisalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PayrollRun_status_createdAt_idx" ON "PayrollRun"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "PayrollRun_period_idx" ON "PayrollRun"("period");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PayrollEntry_runId_idx" ON "PayrollEntry"("runId");
CREATE INDEX IF NOT EXISTS "PayrollEntry_staffId_idx" ON "PayrollEntry"("staffId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LeaveRequest_staffId_createdAt_idx" ON "LeaveRequest"("staffId", "createdAt");
CREATE INDEX IF NOT EXISTS "LeaveRequest_status_startDate_idx" ON "LeaveRequest"("status", "startDate");
CREATE INDEX IF NOT EXISTS "LeaveRequest_leaveType_status_idx" ON "LeaveRequest"("leaveType", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AppraisalCycle_status_startDate_idx" ON "AppraisalCycle"("status", "startDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AppraisalRecord_cycleId_idx" ON "AppraisalRecord"("cycleId");
CREATE INDEX IF NOT EXISTS "AppraisalRecord_staffId_idx" ON "AppraisalRecord"("staffId");
CREATE INDEX IF NOT EXISTS "AppraisalRecord_recommendation_idx" ON "AppraisalRecord"("recommendation");

-- Conditional Constraints/Unique Indexes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'PayrollEntry_runId_staffId_key'
    ) THEN
        CREATE UNIQUE INDEX "PayrollEntry_runId_staffId_key" ON "PayrollEntry"("runId", "staffId");
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'AppraisalRecord_cycleId_staffId_key'
    ) THEN
        CREATE UNIQUE INDEX "AppraisalRecord_cycleId_staffId_key" ON "AppraisalRecord"("cycleId", "staffId");
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'PayrollEntry_runId_fkey'
    ) THEN
        ALTER TABLE "PayrollEntry"
        ADD CONSTRAINT "PayrollEntry_runId_fkey"
        FOREIGN KEY ("runId") REFERENCES "PayrollRun"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'AppraisalRecord_cycleId_fkey'
    ) THEN
        ALTER TABLE "AppraisalRecord"
        ADD CONSTRAINT "AppraisalRecord_cycleId_fkey"
        FOREIGN KEY ("cycleId") REFERENCES "AppraisalCycle"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;
