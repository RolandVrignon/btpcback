/*
  Warnings:

  - You are about to alter the column `key` on the `Apikey` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - The `status` column on the `Document` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `name` on the `Organization` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `name` on the `Project` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `salesforce_id` on the `Project` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `ai_address` on the `Project` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - The `status` column on the `Project` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `organizationId` on the `Project` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `ai_city` on the `Project` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `ai_country` on the `Project` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `ai_zip_code` on the `Project` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(10)`.

*/
-- CreateEnum
CREATE TYPE "Status" AS ENUM ('DRAFT', 'PROGRESS', 'PENDING', 'COMPLETED', 'ERROR');

-- CreateEnum
CREATE TYPE "DeliverableType" AS ENUM ('WORK_SUMMARY', 'INDEX_COMPARISON', 'THERMAL_STUDY_ANALYSIS', 'DATA_INCONSISTENCY');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('PROJECT', 'REFERENCE');

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_organizationId_fkey";

-- AlterTable
ALTER TABLE "Apikey" ALTER COLUMN "key" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "category" "DocumentCategory" NOT NULL DEFAULT 'PROJECT',
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
DROP COLUMN "status",
ADD COLUMN     "status" "Status" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ALTER COLUMN "name" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "name" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "salesforce_id" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "ai_address" SET DATA TYPE VARCHAR(255),
DROP COLUMN "status",
ADD COLUMN     "status" "Status" NOT NULL DEFAULT 'DRAFT',
ALTER COLUMN "organizationId" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "ai_city" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "ai_country" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "ai_zip_code" SET DATA TYPE VARCHAR(10);

-- DropEnum
DROP TYPE "DocumentStatus";

-- DropEnum
DROP TYPE "ProjectStatus";

-- CreateTable
CREATE TABLE "Deliverable" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" "DeliverableType" NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'DRAFT',
    "projectId" TEXT NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "metadata" JSONB,

    CONSTRAINT "Deliverable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentDeliverable" (
    "id" SERIAL NOT NULL,
    "documentId" TEXT NOT NULL,
    "deliverableId" INTEGER NOT NULL,
    "usage" TEXT,

    CONSTRAINT "DocumentDeliverable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Deliverable_projectId_idx" ON "Deliverable"("projectId");

-- CreateIndex
CREATE INDEX "Deliverable_type_idx" ON "Deliverable"("type");

-- CreateIndex
CREATE INDEX "Deliverable_status_idx" ON "Deliverable"("status");

-- CreateIndex
CREATE INDEX "DocumentDeliverable_documentId_idx" ON "DocumentDeliverable"("documentId");

-- CreateIndex
CREATE INDEX "DocumentDeliverable_deliverableId_idx" ON "DocumentDeliverable"("deliverableId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentDeliverable_documentId_deliverableId_key" ON "DocumentDeliverable"("documentId", "deliverableId");

-- CreateIndex
CREATE INDEX "Document_category_idx" ON "Document"("category");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentDeliverable" ADD CONSTRAINT "DocumentDeliverable_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentDeliverable" ADD CONSTRAINT "DocumentDeliverable_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "Deliverable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
