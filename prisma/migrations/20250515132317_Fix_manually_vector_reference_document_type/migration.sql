-- Supprime l'index BTree s'il existe (par sécurité)
DROP INDEX IF EXISTS reference_document_application_domain_vector_idx;

-- Crée un index vectoriel IVFFlat sur le champ application_domain_vector
CREATE INDEX reference_document_application_domain_vector_idx
  ON "ReferenceDocument" USING ivfflat ("application_domain_vector");