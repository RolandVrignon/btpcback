/*
  Warnings:

  - The primary key for the `Deliverable` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[id]` on the table `Apikey` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `Chunk` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `Deliverable` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `Document` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `Embedding` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `Organization` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `Project` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `Usage` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "DocumentDeliverable" DROP CONSTRAINT "DocumentDeliverable_deliverableId_fkey";

-- AlterTable
ALTER TABLE "Deliverable" DROP CONSTRAINT "Deliverable_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Deliverable_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Deliverable_id_seq";

-- AlterTable
ALTER TABLE "DocumentDeliverable" ALTER COLUMN "deliverableId" SET DATA TYPE TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Apikey_id_key" ON "Apikey"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Chunk_id_key" ON "Chunk"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Deliverable_id_key" ON "Deliverable"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Document_id_key" ON "Document"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Embedding_id_key" ON "Embedding"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_id_key" ON "Organization"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Project_id_key" ON "Project"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Usage_id_key" ON "Usage"("id");

-- AddForeignKey
ALTER TABLE "DocumentDeliverable" ADD CONSTRAINT "DocumentDeliverable_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "Deliverable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
