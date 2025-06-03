-- Migration pour renommer tous les champs des tables en snake_case
-- À exécuter manuellement si la base existe déjà

-- Table apikey
ALTER TABLE "apikey" RENAME COLUMN "organizationId" TO "organization_id";
ALTER TABLE "apikey" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "apikey" RENAME COLUMN "updatedAt" TO "updated_at";

-- Table organization
ALTER TABLE "organization" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "organization" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "organization" RENAME COLUMN "deletedAt" TO "deleted_at";

-- Table project
ALTER TABLE "project" RENAME COLUMN "short_summary" TO "short_summary";
ALTER TABLE "project" RENAME COLUMN "long_summary" TO "long_summary";
ALTER TABLE "project" RENAME COLUMN "salesforce_id" TO "salesforce_id";
ALTER TABLE "project" RENAME COLUMN "ai_address" TO "ai_address";
ALTER TABLE "project" RENAME COLUMN "ai_city" TO "ai_city";
ALTER TABLE "project" RENAME COLUMN "ai_zip_code" TO "ai_zip_code";
ALTER TABLE "project" RENAME COLUMN "ai_country" TO "ai_country";
ALTER TABLE "project" RENAME COLUMN "closest_formatted_address" TO "closest_formatted_address";
ALTER TABLE "project" RENAME COLUMN "organizationId" TO "organization_id";
ALTER TABLE "project" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "project" RENAME COLUMN "updatedAt" TO "updated_at";

-- Table document
ALTER TABLE "document" RENAME COLUMN "projectId" TO "project_id";
ALTER TABLE "document" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "document" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "document" RENAME COLUMN "ai_titre_document" TO "ai_titre_document";
ALTER TABLE "document" RENAME COLUMN "ai_lot_identification" TO "ai_lot_identification";
ALTER TABLE "document" RENAME COLUMN "ai_Type_batiment" TO "ai_type_batiment";
ALTER TABLE "document" RENAME COLUMN "ai_Type_operation" TO "ai_type_operation";
ALTER TABLE "document" RENAME COLUMN "ai_Type_document" TO "ai_type_document";
ALTER TABLE "document" RENAME COLUMN "ai_Phase_projet" TO "ai_phase_projet";
ALTER TABLE "document" RENAME COLUMN "ai_Version_document" TO "ai_version_document";
ALTER TABLE "document" RENAME COLUMN "ai_Adresse_projet" TO "ai_adresse_projet";
ALTER TABLE "document" RENAME COLUMN "ai_Ville_projet" TO "ai_ville_projet";
ALTER TABLE "document" RENAME COLUMN "ai_Rue_projet" TO "ai_rue_projet";
ALTER TABLE "document" RENAME COLUMN "ai_CP_projet" TO "ai_cp_projet";
ALTER TABLE "document" RENAME COLUMN "ai_Maitre_ouvrage" TO "ai_maitre_ouvrage";
ALTER TABLE "document" RENAME COLUMN "ai_Architecte" TO "ai_architecte";
ALTER TABLE "document" RENAME COLUMN "ai_Autres_societes" TO "ai_autres_societes";
ALTER TABLE "document" RENAME COLUMN "ai_societe_editrice_document" TO "ai_societe_editrice_document";
ALTER TABLE "document" RENAME COLUMN "ai_metadata" TO "ai_metadata";
ALTER TABLE "document" RENAME COLUMN "metadata_author" TO "metadata_author";
ALTER TABLE "document" RENAME COLUMN "metadata_numPages" TO "metadata_num_pages";
ALTER TABLE "document" RENAME COLUMN "parentId" TO "parent_id";

-- Table chunk
ALTER TABLE "chunk" RENAME COLUMN "documentId" TO "document_id";
ALTER TABLE "chunk" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "chunk" RENAME COLUMN "updatedAt" TO "updated_at";

-- Table embedding
ALTER TABLE "embedding" RENAME COLUMN "modelName" TO "model_name";
ALTER TABLE "embedding" RENAME COLUMN "modelVersion" TO "model_version";
ALTER TABLE "embedding" RENAME COLUMN "chunkId" TO "chunk_id";
ALTER TABLE "embedding" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "embedding" RENAME COLUMN "updatedAt" TO "updated_at";

-- Table usage
ALTER TABLE "usage" RENAME COLUMN "modelName" TO "model_name";
ALTER TABLE "usage" RENAME COLUMN "promptTokens" TO "prompt_tokens";
ALTER TABLE "usage" RENAME COLUMN "completionTokens" TO "completion_tokens";
ALTER TABLE "usage" RENAME COLUMN "totalTokens" TO "total_tokens";
ALTER TABLE "usage" RENAME COLUMN "projectId" TO "project_id";
ALTER TABLE "usage" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "usage" RENAME COLUMN "updatedAt" TO "updated_at";

-- Table deliverable
ALTER TABLE "deliverable" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "deliverable" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "deliverable" RENAME COLUMN "user_prompt" TO "user_prompt";
ALTER TABLE "deliverable" RENAME COLUMN "process_duration_in_seconds" TO "process_duration_in_seconds";
ALTER TABLE "deliverable" RENAME COLUMN "projectId" TO "project_id";
ALTER TABLE "deliverable" RENAME COLUMN "short_result" TO "short_result";
ALTER TABLE "deliverable" RENAME COLUMN "long_result" TO "long_result";

-- Table document_deliverable
ALTER TABLE "document_deliverable" RENAME COLUMN "documentId" TO "document_id";
ALTER TABLE "document_deliverable" RENAME COLUMN "deliverableId" TO "deliverable_id";

-- Table reference_document
ALTER TABLE "reference_document" RENAME COLUMN "secondary_title" TO "secondary_title";
ALTER TABLE "reference_document" RENAME COLUMN "key_s3_title" TO "key_s3_title";
ALTER TABLE "reference_document" RENAME COLUMN "application_domain" TO "application_domain";
ALTER TABLE "reference_document" RENAME COLUMN "application_domain_vector" TO "application_domain_vector";
ALTER TABLE "reference_document" RENAME COLUMN "official_version" TO "official_version";
ALTER TABLE "reference_document" RENAME COLUMN "published_at" TO "published_at";
ALTER TABLE "reference_document" RENAME COLUMN "effective_date" TO "effective_date";
ALTER TABLE "reference_document" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "reference_document" RENAME COLUMN "updatedAt" TO "updated_at";

-- Table reference_chunk
ALTER TABLE "reference_chunk" RENAME COLUMN "referenceDocumentId" TO "reference_document_id";
ALTER TABLE "reference_chunk" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "reference_chunk" RENAME COLUMN "updatedAt" TO "updated_at";

-- Table reference_embedding
ALTER TABLE "reference_embedding" RENAME COLUMN "modelName" TO "model_name";
ALTER TABLE "reference_embedding" RENAME COLUMN "modelVersion" TO "model_version";
ALTER TABLE "reference_embedding" RENAME COLUMN "referenceChunkId" TO "reference_chunk_id";
ALTER TABLE "reference_embedding" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "reference_embedding" RENAME COLUMN "updatedAt" TO "updated_at";

-- Table reference_image
ALTER TABLE "reference_image" RENAME COLUMN "referenceDocumentId" TO "reference_document_id";
ALTER TABLE "reference_image" RENAME COLUMN "pageIndex" TO "page_index";
ALTER TABLE "reference_image" RENAME COLUMN "imageData" TO "image_data";
ALTER TABLE "reference_image" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "reference_image" RENAME COLUMN "updatedAt" TO "updated_at";

-- Table document_reference_link
ALTER TABLE "document_reference_link" RENAME COLUMN "documentId" TO "document_id";
ALTER TABLE "document_reference_link" RENAME COLUMN "referenceDocumentId" TO "reference_document_id";
ALTER TABLE "document_reference_link" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "document_reference_link" RENAME COLUMN "updatedAt" TO "updated_at";

-- Table short_url
ALTER TABLE "short_url" RENAME COLUMN "shortId" TO "short_id";
ALTER TABLE "short_url" RENAME COLUMN "longUrl" TO "long_url";
ALTER TABLE "short_url" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "short_url" RENAME COLUMN "expiresAt" TO "expires_at";