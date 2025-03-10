-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "ai_city" TEXT DEFAULT '',
ADD COLUMN     "ai_country" TEXT DEFAULT '',
ADD COLUMN     "ai_zip_code" TEXT DEFAULT '',
ADD COLUMN     "description" TEXT DEFAULT '',
ALTER COLUMN "salesforce_id" SET DEFAULT '',
ALTER COLUMN "ai_address" SET DEFAULT '';
