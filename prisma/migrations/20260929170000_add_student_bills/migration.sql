-- CreateTable
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
