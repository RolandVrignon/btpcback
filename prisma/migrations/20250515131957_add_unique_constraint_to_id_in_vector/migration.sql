/*
  Warnings:

  - A unique constraint covering the columns `[id]` on the table `ReferenceEmbedding` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ReferenceEmbedding_id_key" ON "ReferenceEmbedding"("id");
