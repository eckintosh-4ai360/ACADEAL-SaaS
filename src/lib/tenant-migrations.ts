import pg from "pg";

/**
 * Ordered list of tenant migrations.
 * Each entry uses IF NOT EXISTS / DO $$ ... $$ patterns so it is fully
 * idempotent — safe to re-run against databases that already have some
 * or all of these changes applied.
 *
 * Add new migrations at the END of this array. Never edit existing entries.
 */
export const TENANT_MIGRATIONS: { name: string; sql: string }[] = [
  // ──────────────────────────────────────────────────────────────────────
  // 20260429130000 · add_admin_teacher_permissions
  // ──────────────────────────────────────────────────────────────────────
  {
    name: "20260429130000_add_admin_teacher_permissions",
    sql: `
ALTER TABLE "Admin"   ADD COLUMN IF NOT EXISTS "permissions" JSONB;
ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "permissions" JSONB;
    `.trim(),
  },

  // ──────────────────────────────────────────────────────────────────────
  // 20260430000000 · add_staff_profiles
  // ──────────────────────────────────────────────────────────────────────
  {
    name: "20260430000000_add_staff_profiles",
    sql: `
DO $$ BEGIN
    CREATE TYPE "StaffType" AS ENUM ('ADMIN', 'TEACHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Staff" (
    "id"            TEXT            NOT NULL,
    "staffId"       TEXT            NOT NULL,
    "username"      TEXT            NOT NULL,
    "password"      TEXT            NOT NULL,
    "name"          TEXT            NOT NULL,
    "surname"       TEXT,
    "email"         TEXT,
    "phone"         TEXT,
    "address"       TEXT,
    "img"           TEXT,
    "sex"           "UserSex",
    "birthday"      TIMESTAMP(3),
    "permissions"   JSONB,
    "staffType"     "StaffType"     NOT NULL,
    "adminRole"     "AdminRole",
    "createdAt"     TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3)    NOT NULL,
    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Staff_staffId_key"              ON "Staff"("staffId");
CREATE UNIQUE INDEX IF NOT EXISTS "Staff_staffType_username_key"   ON "Staff"("staffType", "username");
CREATE INDEX        IF NOT EXISTS "Staff_staffType_name_surname_idx" ON "Staff"("staffType", "name", "surname");
CREATE INDEX        IF NOT EXISTS "Staff_email_idx"                ON "Staff"("email");
CREATE INDEX        IF NOT EXISTS "Staff_phone_idx"                ON "Staff"("phone");

ALTER TABLE "Admin"   ADD COLUMN IF NOT EXISTS "staffProfileId" TEXT;
ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "staffProfileId" TEXT;

-- Back-fill Staff rows from existing Admins (idempotent via ON CONFLICT)
INSERT INTO "Staff" (
    "id","staffId","username","password","name","surname",
    "email","phone","address","img","sex","birthday",
    "permissions","staffType","adminRole","createdAt","updatedAt"
)
SELECT
    'admin-' || a."id",
    a."staffId", a."username", a."password", a."name", NULL,
    a."email", a."phone", NULL, a."img", NULL, NULL,
    a."permissions", 'ADMIN'::"StaffType", a."role",
    a."createdAt", a."updatedAt"
FROM "Admin" a
ON CONFLICT ("staffId") DO UPDATE SET
    "username"    = EXCLUDED."username",
    "password"    = EXCLUDED."password",
    "name"        = EXCLUDED."name",
    "email"       = EXCLUDED."email",
    "phone"       = EXCLUDED."phone",
    "img"         = EXCLUDED."img",
    "permissions" = EXCLUDED."permissions",
    "staffType"   = EXCLUDED."staffType",
    "adminRole"   = EXCLUDED."adminRole",
    "updatedAt"   = EXCLUDED."updatedAt";

-- Back-fill Staff rows from existing Teachers (idempotent via ON CONFLICT)
INSERT INTO "Staff" (
    "id","staffId","username","password","name","surname",
    "email","phone","address","img","sex","birthday",
    "permissions","staffType","adminRole","createdAt","updatedAt"
)
SELECT
    'teacher-' || t."id",
    t."staffId", t."username", t."password", t."name", t."surname",
    t."email", t."phone", t."address", t."img", t."sex", t."birthday",
    t."permissions", 'TEACHER'::"StaffType", NULL,
    t."createdAt", t."updatedAt"
FROM "Teacher" t
ON CONFLICT ("staffId") DO UPDATE SET
    "username"    = EXCLUDED."username",
    "password"    = EXCLUDED."password",
    "name"        = EXCLUDED."name",
    "surname"     = EXCLUDED."surname",
    "email"       = EXCLUDED."email",
    "phone"       = EXCLUDED."phone",
    "address"     = EXCLUDED."address",
    "img"         = EXCLUDED."img",
    "sex"         = EXCLUDED."sex",
    "birthday"    = EXCLUDED."birthday",
    "permissions" = EXCLUDED."permissions",
    "updatedAt"   = EXCLUDED."updatedAt";

-- Link staffProfileId back to Admin and Teacher rows
UPDATE "Admin" a
SET "staffProfileId" = s."id"
FROM "Staff" s
WHERE s."staffId" = a."staffId"
  AND s."staffType" = 'ADMIN'::"StaffType"
  AND a."staffProfileId" IS NULL;

UPDATE "Teacher" t
SET "staffProfileId" = s."id"
FROM "Staff" s
WHERE s."staffId" = t."staffId"
  AND s."staffType" = 'TEACHER'::"StaffType"
  AND t."staffProfileId" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Admin_staffProfileId_key"   ON "Admin"("staffProfileId");
CREATE UNIQUE INDEX IF NOT EXISTS "Teacher_staffProfileId_key" ON "Teacher"("staffProfileId");

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Admin_staffProfileId_fkey') THEN
        ALTER TABLE "Admin"
        ADD CONSTRAINT "Admin_staffProfileId_fkey"
        FOREIGN KEY ("staffProfileId") REFERENCES "Staff"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Teacher_staffProfileId_fkey') THEN
        ALTER TABLE "Teacher"
        ADD CONSTRAINT "Teacher_staffProfileId_fkey"
        FOREIGN KEY ("staffProfileId") REFERENCES "Staff"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
    `.trim(),
  },

  // ──────────────────────────────────────────────────────────────────────
  // 20260501000000 · add_hr_models
  // ──────────────────────────────────────────────────────────────────────
  {
    name: "20260501000000_add_hr_models",
    sql: `
DO $$ BEGIN CREATE TYPE "PayrollStatus"          AS ENUM ('DRAFT','APPROVED','PAID');
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "LeaveType"              AS ENUM ('ANNUAL','SICK','MATERNITY','PATERNITY','UNPAID','EMERGENCY');
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "LeaveStatus"            AS ENUM ('PENDING','APPROVED','REJECTED');
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AppraisalCycleStatus"   AS ENUM ('OPEN','CLOSED');
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AppraisalRecommendation" AS ENUM ('PROMOTE','RETAIN','IMPROVE','DISMISS');
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PayrollRun" (
    "id"             SERIAL          NOT NULL,
    "period"         TEXT            NOT NULL,
    "periodType"     TEXT            NOT NULL DEFAULT 'MONTHLY',
    "status"         "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "totalGross"     DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalNet"       DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency"       TEXT            NOT NULL DEFAULT 'GHS',
    "notes"          TEXT,
    "createdById"    TEXT            NOT NULL,
    "createdByName"  TEXT            NOT NULL,
    "approvedById"   TEXT,
    "approvedByName" TEXT,
    "approvedAt"     TIMESTAMP(3),
    "paidAt"         TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3)    NOT NULL,
    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PayrollEntry" (
    "id"              SERIAL          NOT NULL,
    "runId"           INTEGER         NOT NULL,
    "staffId"         TEXT            NOT NULL,
    "staffName"       TEXT            NOT NULL,
    "staffType"       TEXT            NOT NULL,
    "staffProfileId"  TEXT,
    "grossSalary"     DOUBLE PRECISION NOT NULL,
    "taxDeduction"    DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ssnitDeduction"  DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netSalary"       DOUBLE PRECISION NOT NULL,
    "notes"           TEXT,
    "createdAt"       TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3)    NOT NULL,
    CONSTRAINT "PayrollEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LeaveRequest" (
    "id"             SERIAL          NOT NULL,
    "staffId"        TEXT            NOT NULL,
    "staffName"      TEXT            NOT NULL,
    "staffType"      TEXT            NOT NULL,
    "staffProfileId" TEXT,
    "leaveType"      "LeaveType"     NOT NULL,
    "startDate"      TIMESTAMP(3)    NOT NULL,
    "endDate"        TIMESTAMP(3)    NOT NULL,
    "totalDays"      INTEGER         NOT NULL,
    "reason"         TEXT            NOT NULL,
    "status"         "LeaveStatus"   NOT NULL DEFAULT 'PENDING',
    "reviewedById"   TEXT,
    "reviewedByName" TEXT,
    "reviewNote"     TEXT,
    "reviewedAt"     TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3)    NOT NULL,
    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AppraisalCycle" (
    "id"            SERIAL                  NOT NULL,
    "title"         TEXT                    NOT NULL,
    "period"        TEXT                    NOT NULL,
    "startDate"     TIMESTAMP(3)            NOT NULL,
    "endDate"       TIMESTAMP(3)            NOT NULL,
    "status"        "AppraisalCycleStatus"  NOT NULL DEFAULT 'OPEN',
    "description"   TEXT,
    "createdById"   TEXT                    NOT NULL,
    "createdByName" TEXT                    NOT NULL,
    "closedAt"      TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3)            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3)            NOT NULL,
    CONSTRAINT "AppraisalCycle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AppraisalRecord" (
    "id"              SERIAL                    NOT NULL,
    "cycleId"         INTEGER                   NOT NULL,
    "staffId"         TEXT                      NOT NULL,
    "staffName"       TEXT                      NOT NULL,
    "staffType"       TEXT                      NOT NULL,
    "staffProfileId"  TEXT,
    "score"           INTEGER                   NOT NULL,
    "teachingScore"   INTEGER,
    "professionalScore" INTEGER,
    "conductScore"    INTEGER,
    "comments"        TEXT,
    "strengths"       TEXT,
    "improvements"    TEXT,
    "recommendation"  "AppraisalRecommendation" NOT NULL DEFAULT 'RETAIN',
    "reviewerId"      TEXT                      NOT NULL,
    "reviewerName"    TEXT                      NOT NULL,
    "createdAt"       TIMESTAMP(3)              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3)              NOT NULL,
    CONSTRAINT "AppraisalRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PayrollRun_status_createdAt_idx"  ON "PayrollRun"("status","createdAt");
CREATE INDEX IF NOT EXISTS "PayrollRun_period_idx"            ON "PayrollRun"("period");
CREATE INDEX IF NOT EXISTS "PayrollEntry_runId_idx"           ON "PayrollEntry"("runId");
CREATE INDEX IF NOT EXISTS "PayrollEntry_staffId_idx"         ON "PayrollEntry"("staffId");
CREATE INDEX IF NOT EXISTS "LeaveRequest_staffId_createdAt_idx" ON "LeaveRequest"("staffId","createdAt");
CREATE INDEX IF NOT EXISTS "LeaveRequest_status_startDate_idx"  ON "LeaveRequest"("status","startDate");
CREATE INDEX IF NOT EXISTS "LeaveRequest_leaveType_status_idx"  ON "LeaveRequest"("leaveType","status");
CREATE INDEX IF NOT EXISTS "AppraisalCycle_status_startDate_idx" ON "AppraisalCycle"("status","startDate");
CREATE INDEX IF NOT EXISTS "AppraisalRecord_cycleId_idx"         ON "AppraisalRecord"("cycleId");
CREATE INDEX IF NOT EXISTS "AppraisalRecord_staffId_idx"         ON "AppraisalRecord"("staffId");
CREATE INDEX IF NOT EXISTS "AppraisalRecord_recommendation_idx"  ON "AppraisalRecord"("recommendation");

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                   WHERE c.relname = 'PayrollEntry_runId_staffId_key') THEN
        CREATE UNIQUE INDEX "PayrollEntry_runId_staffId_key" ON "PayrollEntry"("runId","staffId");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                   WHERE c.relname = 'AppraisalRecord_cycleId_staffId_key') THEN
        CREATE UNIQUE INDEX "AppraisalRecord_cycleId_staffId_key" ON "AppraisalRecord"("cycleId","staffId");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PayrollEntry_runId_fkey') THEN
        ALTER TABLE "PayrollEntry"
        ADD CONSTRAINT "PayrollEntry_runId_fkey"
        FOREIGN KEY ("runId") REFERENCES "PayrollRun"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AppraisalRecord_cycleId_fkey') THEN
        ALTER TABLE "AppraisalRecord"
        ADD CONSTRAINT "AppraisalRecord_cycleId_fkey"
        FOREIGN KEY ("cycleId") REFERENCES "AppraisalCycle"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
    `.trim(),
  },

  // 20260531000000 - add_receipt_delivery_tracking
  {
    name: "20260531000000_add_receipt_delivery_tracking",
    sql: `
DO $$ BEGIN
    CREATE TYPE "ReceiptDeliveryChannel" AS ENUM ('SMS', 'WHATSAPP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "ReceiptDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ReceiptDelivery" (
    "id"           SERIAL NOT NULL,
    "feePaymentId" INTEGER NOT NULL,
    "channel"      "ReceiptDeliveryChannel" NOT NULL,
    "recipient"    TEXT NOT NULL,
    "message"      TEXT NOT NULL,
    "receiptUrl"   TEXT NOT NULL,
    "status"       "ReceiptDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "error"        TEXT,
    "sentAt"       TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReceiptDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ReceiptDelivery_feePaymentId_idx"
ON "ReceiptDelivery"("feePaymentId");

CREATE INDEX IF NOT EXISTS "ReceiptDelivery_recipient_createdAt_idx"
ON "ReceiptDelivery"("recipient", "createdAt");

CREATE INDEX IF NOT EXISTS "ReceiptDelivery_status_createdAt_idx"
ON "ReceiptDelivery"("status", "createdAt");

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ReceiptDelivery_feePaymentId_fkey'
    ) THEN
        ALTER TABLE "ReceiptDelivery"
        ADD CONSTRAINT "ReceiptDelivery_feePaymentId_fkey"
        FOREIGN KEY ("feePaymentId") REFERENCES "FeePayment"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
    `.trim(),
  },

  // ──────────────────────────────────────────────────────────────────────
  // 20260710090000 · add_class_subject_teacher_assignments
  // ──────────────────────────────────────────────────────────────────────
  {
    name: "20260710090000_add_class_subject_teacher_assignments",
    sql: `
CREATE TABLE IF NOT EXISTS "ClassSubjectTeacher" (
    "id"            SERIAL          NOT NULL,
    "classId"       INTEGER         NOT NULL,
    "subjectId"     INTEGER         NOT NULL,
    "teacherId"     TEXT            NOT NULL,
    "createdAt"     TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3)    NOT NULL,
    CONSTRAINT "ClassSubjectTeacher_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClassSubjectTeacher_classId_subjectId_key" ON "ClassSubjectTeacher"("classId", "subjectId");
CREATE INDEX IF NOT EXISTS "ClassSubjectTeacher_teacherId_idx" ON "ClassSubjectTeacher"("teacherId");
CREATE INDEX IF NOT EXISTS "ClassSubjectTeacher_subjectId_idx" ON "ClassSubjectTeacher"("subjectId");

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClassSubjectTeacher_classId_fkey') THEN
        ALTER TABLE "ClassSubjectTeacher"
        ADD CONSTRAINT "ClassSubjectTeacher_classId_fkey"
        FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClassSubjectTeacher_subjectId_fkey') THEN
        ALTER TABLE "ClassSubjectTeacher"
        ADD CONSTRAINT "ClassSubjectTeacher_subjectId_fkey"
        FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClassSubjectTeacher_teacherId_fkey') THEN
        ALTER TABLE "ClassSubjectTeacher"
        ADD CONSTRAINT "ClassSubjectTeacher_teacherId_fkey"
        FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
    `.trim(),
  },

  // ──────────────────────────────────────────────────────────────────────
  // 20260713094000 · add_library_borrows
  // ──────────────────────────────────────────────────────────────────────
  {
    name: "20260713094000_add_library_borrows",
    sql: `
DO $$ BEGIN
    CREATE TYPE "LibraryBorrowStatus" AS ENUM ('BORROWED', 'RETURNED', 'OVERDUE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "LibraryBorrow" (
    "id"            SERIAL          NOT NULL,
    "itemId"        INTEGER         NOT NULL,
    "studentId"     TEXT            NOT NULL,
    "borrowDate"    TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate"       TIMESTAMP(3)    NOT NULL,
    "returnDate"    TIMESTAMP(3),
    "status"        "LibraryBorrowStatus" NOT NULL DEFAULT 'BORROWED',
    "notes"         TEXT,
    "createdAt"     TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3)    NOT NULL,
    CONSTRAINT "LibraryBorrow_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LibraryBorrow_studentId_status_idx" ON "LibraryBorrow"("studentId", "status");
CREATE INDEX IF NOT EXISTS "LibraryBorrow_itemId_status_idx" ON "LibraryBorrow"("itemId", "status");

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LibraryBorrow_itemId_fkey') THEN
        ALTER TABLE "LibraryBorrow"
        ADD CONSTRAINT "LibraryBorrow_itemId_fkey"
        FOREIGN KEY ("itemId") REFERENCES "LibraryCatalogItem"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LibraryBorrow_studentId_fkey') THEN
        ALTER TABLE "LibraryBorrow"
        ADD CONSTRAINT "LibraryBorrow_studentId_fkey"
        FOREIGN KEY ("studentId") REFERENCES "Student"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
    `.trim(),
  },

  // ──────────────────────────────────────────────────────────────────────
  // 20260713120000 · add_report_card_entries
  // Per-subject rows so multiple teachers can fill the same class card
  // concurrently without overwriting each other.
  // ──────────────────────────────────────────────────────────────────────
  {
    name: "20260713120000_add_report_card_entries",
    sql: `
CREATE TABLE IF NOT EXISTS "ReportCardEntry" (
    "id"           TEXT            NOT NULL,
    "studentId"    TEXT            NOT NULL,
    "subjectName"  TEXT            NOT NULL,
    "term"         TEXT            NOT NULL,
    "academicYear" TEXT            NOT NULL,
    "classScore"   TEXT            NOT NULL DEFAULT '',
    "examScore"    TEXT            NOT NULL DEFAULT '',
    "total"        TEXT            NOT NULL DEFAULT '',
    "grade"        TEXT            NOT NULL DEFAULT '',
    "remarks"      TEXT            NOT NULL DEFAULT '',
    "savedBy"      TEXT            NOT NULL,
    "savedByName"  TEXT            NOT NULL,
    "createdAt"    TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReportCardEntry_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'ReportCardEntry_studentId_subjectName_term_academicYear_key'
    ) THEN
        CREATE UNIQUE INDEX "ReportCardEntry_studentId_subjectName_term_academicYear_key"
        ON "ReportCardEntry"("studentId", "subjectName", "term", "academicYear");
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ReportCardEntry_studentId_term_academicYear_idx"
ON "ReportCardEntry"("studentId", "term", "academicYear");

CREATE INDEX IF NOT EXISTS "ReportCardEntry_savedBy_term_academicYear_idx"
ON "ReportCardEntry"("savedBy", "term", "academicYear");

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReportCardEntry_studentId_fkey') THEN
        ALTER TABLE "ReportCardEntry"
        ADD CONSTRAINT "ReportCardEntry_studentId_fkey"
        FOREIGN KEY ("studentId") REFERENCES "Student"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
    `.trim(),
  },

  // ──────────────────────────────────────────────────────────────────────
  // 20260814120000 · add_inventory_and_finance
  // Sales & Inventory (stock items + a sales log) and a simple categorized
  // Income & Expense ledger — both were advertised modules with no backing
  // tables yet.
  // ──────────────────────────────────────────────────────────────────────
  {
    name: "20260814120000_add_inventory_and_finance",
    sql: `
DO $$ BEGIN
    CREATE TYPE "FinanceEntryType" AS ENUM ('INCOME', 'EXPENSE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "InventoryBuyerType" AS ENUM ('STUDENT', 'STAFF', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "FinanceEntry" (
    "id"             SERIAL              NOT NULL,
    "type"           "FinanceEntryType"  NOT NULL,
    "category"       TEXT                NOT NULL,
    "amount"         DOUBLE PRECISION    NOT NULL,
    "description"    TEXT                NOT NULL,
    "paymentMethod"  "PaymentMethod"     NOT NULL DEFAULT 'CASH',
    "entryDate"      TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById"   TEXT                NOT NULL,
    "recordedByName" TEXT                NOT NULL,
    "createdAt"      TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3)        NOT NULL,
    CONSTRAINT "FinanceEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FinanceEntry_type_entryDate_idx" ON "FinanceEntry"("type", "entryDate");
CREATE INDEX IF NOT EXISTS "FinanceEntry_category_idx" ON "FinanceEntry"("category");
CREATE INDEX IF NOT EXISTS "FinanceEntry_entryDate_idx" ON "FinanceEntry"("entryDate");

CREATE TABLE IF NOT EXISTS "InventoryItem" (
    "id"                SERIAL              NOT NULL,
    "name"              TEXT                NOT NULL,
    "category"          TEXT                NOT NULL,
    "unit"              TEXT                NOT NULL DEFAULT 'pcs',
    "unitPrice"         DOUBLE PRECISION    NOT NULL,
    "quantityOnHand"    INTEGER             NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER             NOT NULL DEFAULT 5,
    "notes"             TEXT,
    "isActive"          BOOLEAN             NOT NULL DEFAULT true,
    "createdAt"         TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3)        NOT NULL,
    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InventoryItem_category_idx" ON "InventoryItem"("category");
CREATE INDEX IF NOT EXISTS "InventoryItem_name_idx" ON "InventoryItem"("name");

CREATE TABLE IF NOT EXISTS "InventorySale" (
    "id"             SERIAL                 NOT NULL,
    "itemId"         INTEGER                NOT NULL,
    "itemName"       TEXT                   NOT NULL,
    "quantity"       INTEGER                NOT NULL,
    "unitPrice"      DOUBLE PRECISION       NOT NULL,
    "totalAmount"    DOUBLE PRECISION       NOT NULL,
    "buyerType"      "InventoryBuyerType"   NOT NULL DEFAULT 'OTHER',
    "buyerName"      TEXT,
    "buyerRefId"     TEXT,
    "paymentMethod"  "PaymentMethod"        NOT NULL DEFAULT 'CASH',
    "note"           TEXT,
    "recordedById"   TEXT                   NOT NULL,
    "recordedByName" TEXT                   NOT NULL,
    "soldAt"         TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"      TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventorySale_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InventorySale_itemId_soldAt_idx" ON "InventorySale"("itemId", "soldAt");
CREATE INDEX IF NOT EXISTS "InventorySale_soldAt_idx" ON "InventorySale"("soldAt");
CREATE INDEX IF NOT EXISTS "InventorySale_buyerType_idx" ON "InventorySale"("buyerType");

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventorySale_itemId_fkey') THEN
        ALTER TABLE "InventorySale"
        ADD CONSTRAINT "InventorySale_itemId_fkey"
        FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
    `.trim(),
  },

  // ──────────────────────────────────────────────────────────────────────
  // 20260815000000 · add_exam_questions
  // Gives Exam a real question bank (mirrors AssignmentQuestion /
  // QuestionOption / StudentAnswer) so exams can actually be taken and
  // graded, not just scheduled.
  // ──────────────────────────────────────────────────────────────────────
  {
    name: "20260815000000_add_exam_questions",
    sql: `
CREATE TABLE IF NOT EXISTS "ExamQuestion" (
    "id"           SERIAL          NOT NULL,
    "examId"       INTEGER         NOT NULL,
    "questionType" "QuestionType"  NOT NULL,
    "questionText" TEXT            NOT NULL,
    "points"       INTEGER         NOT NULL DEFAULT 10,
    "fileUrl"      TEXT,
    "fileType"     TEXT,
    "createdAt"    TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3)    NOT NULL,
    CONSTRAINT "ExamQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ExamQuestionOption" (
    "id"         SERIAL          NOT NULL,
    "questionId" INTEGER         NOT NULL,
    "optionText" TEXT            NOT NULL,
    "isCorrect"  BOOLEAN         NOT NULL DEFAULT false,
    "createdAt"  TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExamQuestionOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StudentExamAnswer" (
    "id"               SERIAL       NOT NULL,
    "studentId"        TEXT         NOT NULL,
    "questionId"       INTEGER      NOT NULL,
    "answerText"       TEXT,
    "selectedOptionId" INTEGER,
    "isCorrect"        BOOLEAN,
    "pointsEarned"     INTEGER      NOT NULL DEFAULT 0,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudentExamAnswer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ExamQuestion_examId_idx" ON "ExamQuestion"("examId");
CREATE INDEX IF NOT EXISTS "ExamQuestionOption_questionId_idx" ON "ExamQuestionOption"("questionId");
CREATE INDEX IF NOT EXISTS "StudentExamAnswer_questionId_idx" ON "StudentExamAnswer"("questionId");
CREATE INDEX IF NOT EXISTS "StudentExamAnswer_selectedOptionId_idx" ON "StudentExamAnswer"("selectedOptionId");

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'StudentExamAnswer_studentId_questionId_key'
    ) THEN
        CREATE UNIQUE INDEX "StudentExamAnswer_studentId_questionId_key"
        ON "StudentExamAnswer"("studentId", "questionId");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ExamQuestion_examId_fkey') THEN
        ALTER TABLE "ExamQuestion"
        ADD CONSTRAINT "ExamQuestion_examId_fkey"
        FOREIGN KEY ("examId") REFERENCES "Exam"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ExamQuestionOption_questionId_fkey') THEN
        ALTER TABLE "ExamQuestionOption"
        ADD CONSTRAINT "ExamQuestionOption_questionId_fkey"
        FOREIGN KEY ("questionId") REFERENCES "ExamQuestion"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentExamAnswer_studentId_fkey') THEN
        ALTER TABLE "StudentExamAnswer"
        ADD CONSTRAINT "StudentExamAnswer_studentId_fkey"
        FOREIGN KEY ("studentId") REFERENCES "Student"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentExamAnswer_questionId_fkey') THEN
        ALTER TABLE "StudentExamAnswer"
        ADD CONSTRAINT "StudentExamAnswer_questionId_fkey"
        FOREIGN KEY ("questionId") REFERENCES "ExamQuestion"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentExamAnswer_selectedOptionId_fkey') THEN
        ALTER TABLE "StudentExamAnswer"
        ADD CONSTRAINT "StudentExamAnswer_selectedOptionId_fkey"
        FOREIGN KEY ("selectedOptionId") REFERENCES "ExamQuestionOption"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
    `.trim(),
  },

  // ──────────────────────────────────────────────────────────────────────
  // 20260907130000 · add_old_student_outstanding_arrears
  // ──────────────────────────────────────────────────────────────────────
  {
    name: "20260907130000_add_old_student_outstanding_arrears",
    sql: `
ALTER TABLE "OldStudent" ADD COLUMN IF NOT EXISTS "outstandingArrears" DOUBLE PRECISION NOT NULL DEFAULT 0;
    `.trim(),
  },

  // ──────────────────────────────────────────────────────────────────────
  // 20260907190000 · add_class_migration_snapshot
  // ──────────────────────────────────────────────────────────────────────
  {
    name: "20260907190000_add_class_migration_snapshot",
    sql: `
CREATE TABLE IF NOT EXISTS "ClassMigrationSnapshot" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "migrationType" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "studentCount" INTEGER NOT NULL DEFAULT 0,
  "graduatedCount" INTEGER NOT NULL DEFAULT 0,
  "revertedAt" TIMESTAMP(3),
  "revertedBy" TEXT,
  "snapshotData" JSONB NOT NULL,
  CONSTRAINT "ClassMigrationSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ClassMigrationSnapshot_createdAt_idx" ON "ClassMigrationSnapshot"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "ClassMigrationSnapshot_revertedAt_idx" ON "ClassMigrationSnapshot"("revertedAt");
    `.trim(),
  },

  // ──────────────────────────────────────────────────────────────────────
  // 20260909100000 · add_sms_provider
  // ──────────────────────────────────────────────────────────────────────
  {
    name: "20260909100000_add_sms_provider",
    sql: `
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "smsProvider" TEXT DEFAULT 'mnotify';
    `.trim(),
  },

  // ─────────────────────────────────────────────
  // 20260913090000 · add_schedule_timetable_models
  // ─────────────────────────────────────────────
  {
    name: "20260913090000_add_schedule_timetable_models",
    sql: `
CREATE TABLE IF NOT EXISTS "TimetablePeriod" (
    "id"        SERIAL          NOT NULL,
    "name"      TEXT            NOT NULL,
    "startTime" TEXT            NOT NULL,
    "endTime"   TEXT            NOT NULL,
    "order"     INTEGER         NOT NULL DEFAULT 1,
    "isBreak"   BOOLEAN         NOT NULL DEFAULT FALSE,
    "createdAt" TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimetablePeriod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ScheduleTimetable" (
    "id"           SERIAL          NOT NULL,
    "classId"      INTEGER         NOT NULL,
    "term"         TEXT            NOT NULL,
    "academicYear" TEXT            NOT NULL,
    "isPublished"  BOOLEAN         NOT NULL DEFAULT FALSE,
    "publishedAt"  TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScheduleTimetable_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ScheduleTimetable_classId_term_academicYear_key"
    ON "ScheduleTimetable"("classId", "term", "academicYear");

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ScheduleTimetable_classId_fkey') THEN
        ALTER TABLE "ScheduleTimetable"
        ADD CONSTRAINT "ScheduleTimetable_classId_fkey"
        FOREIGN KEY ("classId") REFERENCES "Class"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "TimetableEntry" (
    "id"          SERIAL          NOT NULL,
    "timetableId" INTEGER         NOT NULL,
    "periodId"    INTEGER         NOT NULL,
    "day"         "Day"          NOT NULL,
    "subjectId"   INTEGER,
    "teacherId"   TEXT,
    "note"        TEXT,
    "createdAt"   TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimetableEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TimetableEntry_timetableId_periodId_day_key"
    ON "TimetableEntry"("timetableId", "periodId", "day");

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TimetableEntry_timetableId_fkey') THEN
        ALTER TABLE "TimetableEntry"
        ADD CONSTRAINT "TimetableEntry_timetableId_fkey"
        FOREIGN KEY ("timetableId") REFERENCES "ScheduleTimetable"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TimetableEntry_periodId_fkey') THEN
        ALTER TABLE "TimetableEntry"
        ADD CONSTRAINT "TimetableEntry_periodId_fkey"
        FOREIGN KEY ("periodId") REFERENCES "TimetablePeriod"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TimetableEntry_subjectId_fkey') THEN
        ALTER TABLE "TimetableEntry"
        ADD CONSTRAINT "TimetableEntry_subjectId_fkey"
        FOREIGN KEY ("subjectId") REFERENCES "Subject"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TimetableEntry_teacherId_fkey') THEN
        ALTER TABLE "TimetableEntry"
        ADD CONSTRAINT "TimetableEntry_teacherId_fkey"
        FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
    `.trim(),
  },

  // ──────────────────────────────────────────────────────────────────────
  // 20260929120000 · add_payslips
  // Printable staff payslips (HR → Payslips), one per staff member per month.
  // ──────────────────────────────────────────────────────────────────────
  {
    name: "20260929120000_add_payslips",
    sql: `
CREATE TABLE IF NOT EXISTS "Payslip" (
    "id"              SERIAL              NOT NULL,
    "staffId"         TEXT                NOT NULL,
    "staffType"       TEXT                NOT NULL,
    "salaryMonth"     TEXT                NOT NULL,
    "employeeId"      TEXT,
    "title"           TEXT,
    "fullName"        TEXT                NOT NULL,
    "designation"     TEXT,
    "gradeLevel"      TEXT,
    "phone"           TEXT,
    "email"           TEXT,
    "bankName"        TEXT,
    "accountNumber"   TEXT,
    "bankBranch"      TEXT,
    "ssnitNumber"     TEXT,
    "ssnitBranch"     TEXT,
    "earnings"        JSONB               NOT NULL,
    "otherClaims"     JSONB               NOT NULL,
    "deductions"      JSONB               NOT NULL,
    "otherDeductions" JSONB               NOT NULL,
    "grossSalary"     DOUBLE PRECISION    NOT NULL DEFAULT 0,
    "totalGross"      DOUBLE PRECISION    NOT NULL DEFAULT 0,
    "totalDeductions" DOUBLE PRECISION    NOT NULL DEFAULT 0,
    "netSalary"       DOUBLE PRECISION    NOT NULL DEFAULT 0,
    "preparedBy"      TEXT,
    "footerNote"      TEXT,
    "createdById"     TEXT                NOT NULL,
    "createdByName"   TEXT                NOT NULL,
    "createdAt"       TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3)        NOT NULL,
    CONSTRAINT "Payslip_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Payslip_staffId_salaryMonth_key" ON "Payslip"("staffId", "salaryMonth");
CREATE INDEX        IF NOT EXISTS "Payslip_salaryMonth_idx"         ON "Payslip"("salaryMonth");
    `.trim(),
  },

  // ──────────────────────────────────────────────────────────────────────
  // 20260929150000 · add_payslip_published_at
  // Payslips stay hidden from teachers until an admin publishes them.
  // ──────────────────────────────────────────────────────────────────────
  {
    name: "20260929150000_add_payslip_published_at",
    sql: `
ALTER TABLE "Payslip" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);
    `.trim(),
  },

  {
    name: "20260929160000_add_school_stamp",
    sql: `
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "schoolStamp" TEXT;
    `.trim(),
  },

  // ──────────────────────────────────────────────────────────────────────
  // 20260929170000 · add_student_bills
  // Printable per-student term bills, published to the student and parent
  // portals from Fees > Generate Bill.
  // ──────────────────────────────────────────────────────────────────────
  {
    name: "20260929170000_add_student_bills",
    sql: `
CREATE TABLE IF NOT EXISTS "StudentBill" (
    "id"             SERIAL              NOT NULL,
    "studentId"      TEXT                NOT NULL,
    "termBillId"     INTEGER,
    "term"           TEXT                NOT NULL,
    "academicYear"   TEXT                NOT NULL,
    "studentName"    TEXT                NOT NULL,
    "className"      TEXT,
    "items"          JSONB               NOT NULL,
    "totalAmount"    DOUBLE PRECISION    NOT NULL DEFAULT 0,
    "arrears"        DOUBLE PRECISION    NOT NULL DEFAULT 0,
    "grandTotal"     DOUBLE PRECISION    NOT NULL DEFAULT 0,
    "billDate"       TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resumptionDate" TIMESTAMP(3),
    "notes"          TEXT,
    "publishedAt"    TIMESTAMP(3),
    "createdById"    TEXT                NOT NULL,
    "createdByName"  TEXT                NOT NULL,
    "createdAt"      TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3)        NOT NULL,
    CONSTRAINT "StudentBill_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudentBill_studentId_termBillId_key" ON "StudentBill"("studentId", "termBillId");
CREATE INDEX        IF NOT EXISTS "StudentBill_termBillId_idx"           ON "StudentBill"("termBillId");
CREATE INDEX        IF NOT EXISTS "StudentBill_term_academicYear_idx"    ON "StudentBill"("term", "academicYear");

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentBill_studentId_fkey') THEN
        ALTER TABLE "StudentBill"
        ADD CONSTRAINT "StudentBill_studentId_fkey"
        FOREIGN KEY ("studentId") REFERENCES "Student"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentBill_termBillId_fkey') THEN
        ALTER TABLE "StudentBill"
        ADD CONSTRAINT "StudentBill_termBillId_fkey"
        FOREIGN KEY ("termBillId") REFERENCES "TermBill"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
    `.trim(),
  },
];

export type MigrationResult = {
  tenantSlug: string;
  success: boolean;
  appliedMigrations: string[];
  skippedMigrations: string[];
  error?: string;
};

/**
 * Apply all pending tenant migrations to a single database connection string.
 * Uses a lightweight `_tenant_migrations` tracking table so migrations are
 * never applied twice.
 */
export async function applyTenantMigrations(
  connectionString: string,
  tenantSlug: string
): Promise<MigrationResult> {
  const pool = new pg.Pool({
    connectionString,
    max: 2,
    connectionTimeoutMillis: 15_000,
    query_timeout: 60_000,
    statement_timeout: 60_000,
  });

  const appliedMigrations: string[] = [];
  const skippedMigrations: string[] = [];

  try {
    // Ensure the tracking table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "_tenant_migrations" (
        "name"       TEXT        NOT NULL PRIMARY KEY,
        "appliedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Fetch already-applied migration names
    const { rows } = await pool.query<{ name: string }>(
      `SELECT "name" FROM "_tenant_migrations";`
    );
    const applied = new Set(rows.map((r) => r.name));

    for (const migration of TENANT_MIGRATIONS) {
      if (applied.has(migration.name)) {
        skippedMigrations.push(migration.name);
        continue;
      }

      // Run in a transaction so a partial failure rolls back cleanly
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(migration.sql);
        await client.query(
          `INSERT INTO "_tenant_migrations" ("name") VALUES ($1) ON CONFLICT DO NOTHING;`,
          [migration.name]
        );
        await client.query("COMMIT");
        appliedMigrations.push(migration.name);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }

    return { tenantSlug, success: true, appliedMigrations, skippedMigrations };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return {
      tenantSlug,
      success: false,
      appliedMigrations,
      skippedMigrations,
      error,
    };
  } finally {
    await pool.end();
  }
}
