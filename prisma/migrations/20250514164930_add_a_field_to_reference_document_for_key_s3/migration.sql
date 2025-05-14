/*
  Warnings:

  - Added the required column `key_s3_title` to the `ReferenceDocument` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ReferenceDocument" ADD COLUMN     "key_s3_title" VARCHAR(255) NOT NULL;
