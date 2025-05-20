-- AlterTable
ALTER TABLE "ReferenceDocument" ADD COLUMN     "mistral_ocr_result" JSONB DEFAULT '{}';

-- AlterTable
ALTER TABLE "ShortUrl" ALTER COLUMN "expiresAt" SET DEFAULT (now() + interval '1 hour');
