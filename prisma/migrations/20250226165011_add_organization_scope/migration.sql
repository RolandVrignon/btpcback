-- CreateEnum
CREATE TYPE "OrganizationScope" AS ENUM ('ADMIN', 'REGULAR');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "scope" "OrganizationScope" NOT NULL DEFAULT 'REGULAR';
