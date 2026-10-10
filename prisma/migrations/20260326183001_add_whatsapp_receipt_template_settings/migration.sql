-- AlterTable
ALTER TABLE "SystemSettings" ADD COLUMN     "whatsappReceiptTemplateLanguage" TEXT NOT NULL DEFAULT 'en_US',
ADD COLUMN     "whatsappReceiptTemplateName" TEXT;
