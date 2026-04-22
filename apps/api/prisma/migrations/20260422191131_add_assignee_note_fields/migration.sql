-- AlterTable
ALTER TABLE "callback_requests" ADD COLUMN     "assignee_id" VARCHAR(26),
ADD COLUMN     "note" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "transfer_handoffs" ADD COLUMN     "handled_at" TIMESTAMP(3),
ADD COLUMN     "handled_by" VARCHAR(26),
ADD COLUMN     "handled_note" TEXT NOT NULL DEFAULT '';
