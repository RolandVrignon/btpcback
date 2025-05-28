-- AlterTable
ALTER TABLE "Organization" RENAME TO organization;
ALTER TABLE "Apikey" RENAME TO apikey;
ALTER TABLE "Project" RENAME TO project;
ALTER TABLE "Document" RENAME TO document;
ALTER TABLE "Chunk" RENAME TO chunk;
ALTER TABLE "Embedding" RENAME TO embedding;
ALTER TABLE "Usage" RENAME TO usage;
ALTER TABLE "Deliverable" RENAME TO deliverable;
ALTER TABLE "DocumentDeliverable" RENAME TO document_deliverable;
ALTER TABLE "ReferenceDocument" RENAME TO reference_document;
ALTER TABLE "ReferenceChunk" RENAME TO reference_chunk;
ALTER TABLE "ReferenceEmbedding" RENAME TO reference_embedding;
ALTER TABLE "ReferenceImage" RENAME TO reference_image;
ALTER TABLE "DocumentReferenceLink" RENAME TO document_reference_link;
ALTER TABLE "ShortUrl" RENAME TO short_url;
