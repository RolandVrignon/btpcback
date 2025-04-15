-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "ai_titre_document" TEXT DEFAULT '';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "altitude" DOUBLE PRECISION DEFAULT 0;
