/*
  Warnings:

  - The `ai_Type_batiment` column on the `Document` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `ai_Type_document` column on the `Document` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `ai_Type_operation` column on the `Document` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `ai_Version_document` column on the `Document` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `ai_lot_identification` column on the `Document` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Document" DROP COLUMN "ai_Type_batiment",
ADD COLUMN     "ai_Type_batiment" TEXT[] DEFAULT ARRAY[]::TEXT[],
DROP COLUMN "ai_Type_document",
ADD COLUMN     "ai_Type_document" TEXT[] DEFAULT ARRAY[]::TEXT[],
DROP COLUMN "ai_Type_operation",
ADD COLUMN     "ai_Type_operation" TEXT[] DEFAULT ARRAY[]::TEXT[],
DROP COLUMN "ai_Version_document",
ADD COLUMN     "ai_Version_document" TEXT[] DEFAULT ARRAY[]::TEXT[],
DROP COLUMN "ai_lot_identification",
ADD COLUMN     "ai_lot_identification" TEXT[] DEFAULT ARRAY[]::TEXT[];
