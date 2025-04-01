-- AlterTable
ALTER TABLE "Deliverable" ADD COLUMN     "process_duration_in_seconds" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "extraction_duration_in_seconds" DOUBLE PRECISION,
ADD COLUMN     "indexation_duration_in_seconds" DOUBLE PRECISION;
