/*
  Warnings:

  - You are about to drop the `voice_templates` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "voice_templates" DROP CONSTRAINT "voice_templates_tenant_id_fkey";

-- DropTable
DROP TABLE "voice_templates";
