-- AlterTable
ALTER TABLE "ShortUrl" ALTER COLUMN "expiresAt" SET DEFAULT (now() + interval '1 hour');
