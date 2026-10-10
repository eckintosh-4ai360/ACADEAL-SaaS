-- CreateTable
CREATE TABLE IF NOT EXISTS "Payslip" (
    "id" SERIAL NOT NULL,
    "staffId" TEXT NOT NULL,
    "staffType" TEXT NOT NULL,
    "salaryMonth" TEXT NOT NULL,
    "employeeId" TEXT,
    "title" TEXT,
    "fullName" TEXT NOT NULL,
    "designation" TEXT,
    "gradeLevel" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "bankBranch" TEXT,
    "ssnitNumber" TEXT,
    "ssnitBranch" TEXT,
    "earnings" JSONB NOT NULL,
    "otherClaims" JSONB NOT NULL,
    "deductions" JSONB NOT NULL,
    "otherDeductions" JSONB NOT NULL,
    "grossSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalGross" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "preparedBy" TEXT,
    "footerNote" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payslip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Payslip_staffId_salaryMonth_key" ON "Payslip"("staffId", "salaryMonth");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payslip_salaryMonth_idx" ON "Payslip"("salaryMonth");
