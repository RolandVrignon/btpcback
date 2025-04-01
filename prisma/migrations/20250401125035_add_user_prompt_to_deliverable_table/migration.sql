-- AlterTable
ALTER TABLE "Deliverable" ADD COLUMN     "user_prompt" TEXT DEFAULT '',
ALTER COLUMN "process_duration_in_seconds" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Document" ALTER COLUMN "extraction_duration_in_seconds" SET DEFAULT 0,
ALTER COLUMN "indexation_duration_in_seconds" SET DEFAULT 0;
