-- CreateTable
CREATE TABLE "ReferenceDocument" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "application_domain" TEXT,
    "application_domain_vector" vector(1536),
    "category" TEXT NOT NULL,
    "official_version" TEXT,
    "organization" TEXT,
    "published_at" TIMESTAMP(3),
    "effective_date" TIMESTAMP(3),
    "path" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceChunk" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER,
    "page" INTEGER,
    "referenceDocumentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceEmbedding" (
    "id" TEXT NOT NULL,
    "vector" vector(1536),
    "modelName" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "dimensions" INTEGER NOT NULL,
    "referenceChunkId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentReferenceLink" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "referenceDocumentId" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentReferenceLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReferenceDocument_category_idx" ON "ReferenceDocument"("category");

-- CreateIndex
CREATE INDEX "ReferenceChunk_referenceDocumentId_idx" ON "ReferenceChunk"("referenceDocumentId");

-- CreateIndex
CREATE INDEX "ReferenceChunk_text_idx" ON "ReferenceChunk"("text");

-- CreateIndex
CREATE INDEX "ReferenceEmbedding_referenceChunkId_idx" ON "ReferenceEmbedding"("referenceChunkId");

-- CreateIndex
CREATE INDEX "reference_embedding_vector_idx" ON "ReferenceEmbedding"("vector");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceEmbedding_referenceChunkId_modelName_modelVersion_key" ON "ReferenceEmbedding"("referenceChunkId", "modelName", "modelVersion");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentReferenceLink_documentId_referenceDocumentId_key" ON "DocumentReferenceLink"("documentId", "referenceDocumentId");

-- AddForeignKey
ALTER TABLE "ReferenceChunk" ADD CONSTRAINT "ReferenceChunk_referenceDocumentId_fkey" FOREIGN KEY ("referenceDocumentId") REFERENCES "ReferenceDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceEmbedding" ADD CONSTRAINT "ReferenceEmbedding_referenceChunkId_fkey" FOREIGN KEY ("referenceChunkId") REFERENCES "ReferenceChunk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentReferenceLink" ADD CONSTRAINT "DocumentReferenceLink_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentReferenceLink" ADD CONSTRAINT "DocumentReferenceLink_referenceDocumentId_fkey" FOREIGN KEY ("referenceDocumentId") REFERENCES "ReferenceDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
