-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "code" INTEGER,
ADD COLUMN     "message_indexation" TEXT,
ADD COLUMN     "message_status" TEXT,
ALTER COLUMN "indexation_status" SET DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "code" INTEGER,
ADD COLUMN     "message" TEXT;
