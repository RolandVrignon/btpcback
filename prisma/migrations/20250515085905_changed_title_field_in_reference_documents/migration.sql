-- AlterTable
ALTER TABLE "ReferenceDocument" ALTER COLUMN "title" SET DEFAULT '',
ALTER COLUMN "title" SET DATA TYPE TEXT,
ALTER COLUMN "key_s3_title" SET DEFAULT '',
ALTER COLUMN "key_s3_title" SET DATA TYPE TEXT,
ALTER COLUMN "secondary_title" SET DEFAULT '',
ALTER COLUMN "secondary_title" SET DATA TYPE TEXT;
