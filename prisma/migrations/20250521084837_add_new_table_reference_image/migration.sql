-- AlterTable
ALTER TABLE "ShortUrl" ALTER COLUMN "expiresAt" SET DEFAULT (now() + interval '1 hour');

-- CreateTable
CREATE TABLE "ReferenceImage" (
    "id" TEXT NOT NULL,
    "referenceDocumentId" TEXT NOT NULL,
    "pageIndex" INTEGER NOT NULL,
    "topLeftX" INTEGER,
    "topLeftY" INTEGER,
    "bottomRightX" INTEGER,
    "bottomRightY" INTEGER,
    "imageData" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceImage_id_key" ON "ReferenceImage"("id");

-- AddForeignKey
ALTER TABLE "ReferenceImage" ADD CONSTRAINT "ReferenceImage_referenceDocumentId_fkey" FOREIGN KEY ("referenceDocumentId") REFERENCES "ReferenceDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
