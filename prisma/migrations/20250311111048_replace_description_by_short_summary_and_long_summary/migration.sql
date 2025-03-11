/*
  Warnings:

  - You are about to drop the column `description` on the `Project` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Project" DROP COLUMN "description",
ADD COLUMN     "long_summary" TEXT DEFAULT '',
ADD COLUMN     "short_summary" TEXT DEFAULT '';
