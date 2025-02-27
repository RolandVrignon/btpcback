/*
  Warnings:

  - The primary key for the `Apikey` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Chunk` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Document` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Embedding` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Organization` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "Apikey" DROP CONSTRAINT "Apikey_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Chunk" DROP CONSTRAINT "Chunk_documentId_fkey";

-- DropForeignKey
ALTER TABLE "Embedding" DROP CONSTRAINT "Embedding_chunkId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_organizationId_fkey";

-- AlterTable
ALTER TABLE "Apikey" DROP CONSTRAINT "Apikey_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE CHAR(32),
ALTER COLUMN "organizationId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Apikey_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Apikey_id_seq";

-- AlterTable
ALTER TABLE "Chunk" DROP CONSTRAINT "Chunk_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE CHAR(32),
ALTER COLUMN "documentId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Chunk_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Chunk_id_seq";

-- AlterTable
ALTER TABLE "Document" DROP CONSTRAINT "Document_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE CHAR(32),
ADD CONSTRAINT "Document_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Document_id_seq";

-- AlterTable
ALTER TABLE "Embedding" DROP CONSTRAINT "Embedding_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE CHAR(32),
ALTER COLUMN "chunkId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Embedding_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Embedding_id_seq";

-- AlterTable
ALTER TABLE "Organization" DROP CONSTRAINT "Organization_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE CHAR(32),
ADD CONSTRAINT "Organization_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Organization_id_seq";

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "organizationId" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "Apikey" ADD CONSTRAINT "Apikey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chunk" ADD CONSTRAINT "Chunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Embedding" ADD CONSTRAINT "Embedding_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "Chunk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
