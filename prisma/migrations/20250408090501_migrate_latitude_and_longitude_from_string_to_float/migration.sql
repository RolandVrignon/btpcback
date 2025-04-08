/*
  Warnings:

  - The `latitude` column on the `Project` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `longitude` column on the `Project` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Project" DROP COLUMN "latitude",
ADD COLUMN     "latitude" DOUBLE PRECISION DEFAULT 0,
DROP COLUMN "longitude",
ADD COLUMN     "longitude" DOUBLE PRECISION DEFAULT 0;
