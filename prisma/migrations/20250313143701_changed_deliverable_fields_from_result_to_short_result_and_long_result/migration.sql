/*
  Warnings:

  - You are about to drop the column `error` on the `Deliverable` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `Deliverable` table. All the data in the column will be lost.
  - You are about to drop the column `result` on the `Deliverable` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Deliverable" DROP COLUMN "error",
DROP COLUMN "metadata",
DROP COLUMN "result",
ADD COLUMN     "long_result" JSONB,
ADD COLUMN     "short_result" JSONB;
