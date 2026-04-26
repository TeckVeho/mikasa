-- AlterTable: make twilio_number_sid nullable and add BYOC fields
ALTER TABLE "phone_numbers"
  ALTER COLUMN "twilio_number_sid" DROP NOT NULL,
  ADD COLUMN "byoc_trunk_sid" VARCHAR(64),
  ADD COLUMN "number_type" VARCHAR(20) NOT NULL DEFAULT 'twilio';

-- CreateIndex for byoc_trunk_sid uniqueness
CREATE UNIQUE INDEX "phone_numbers_byoc_trunk_sid_key" ON "phone_numbers"("byoc_trunk_sid");
