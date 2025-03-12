/*
  Warnings:

  - The primary key for the `DocumentDeliverable` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[id]` on the table `DocumentDeliverable` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "DocumentDeliverable" DROP CONSTRAINT "DocumentDeliverable_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "DocumentDeliverable_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "DocumentDeliverable_id_seq";

-- CreateIndex
CREATE UNIQUE INDEX "DocumentDeliverable_id_key" ON "DocumentDeliverable"("id");
