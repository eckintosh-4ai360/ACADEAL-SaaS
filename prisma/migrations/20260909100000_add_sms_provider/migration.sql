-- AlterTable
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "smsProvider" TEXT DEFAULT 'mnotify';
