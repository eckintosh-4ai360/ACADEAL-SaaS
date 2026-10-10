-- CreateEnum
CREATE TYPE "ReceiptDeliveryChannel" AS ENUM ('SMS', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "ReceiptDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "ReceiptDelivery" (
    "id" SERIAL NOT NULL,
    "feePaymentId" INTEGER NOT NULL,
    "channel" "ReceiptDeliveryChannel" NOT NULL,
    "recipient" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "receiptUrl" TEXT NOT NULL,
    "status" "ReceiptDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceiptDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReceiptDelivery_feePaymentId_idx" ON "ReceiptDelivery"("feePaymentId");

-- CreateIndex
CREATE INDEX "ReceiptDelivery_recipient_createdAt_idx" ON "ReceiptDelivery"("recipient", "createdAt");

-- CreateIndex
CREATE INDEX "ReceiptDelivery_status_createdAt_idx" ON "ReceiptDelivery"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "ReceiptDelivery" ADD CONSTRAINT "ReceiptDelivery_feePaymentId_fkey" FOREIGN KEY ("feePaymentId") REFERENCES "FeePayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
