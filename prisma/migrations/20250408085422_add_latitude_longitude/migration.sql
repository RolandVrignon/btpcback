/*
  Warnings:

  - You are about to drop the column `latlong` on the `Project` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Project" DROP COLUMN "latlong",
ADD COLUMN     "latitude" VARCHAR(255) DEFAULT '',
ADD COLUMN     "longitude" VARCHAR(255) DEFAULT '';
