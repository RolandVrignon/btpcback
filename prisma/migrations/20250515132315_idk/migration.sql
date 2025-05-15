/*
  Warnings:

  - Made the column `vector` on table `ReferenceEmbedding` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ReferenceEmbedding" ALTER COLUMN "vector" SET NOT NULL;
