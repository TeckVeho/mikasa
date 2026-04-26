-- AlterTable
ALTER TABLE "tenants" ADD COLUMN "notify_call_complete" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tenants" ADD COLUMN "notify_transfer" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tenants" ADD COLUMN "notify_email" VARCHAR(255);
