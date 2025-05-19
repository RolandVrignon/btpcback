   -- Supprime l'index BTree s'il existe
   DROP INDEX IF EXISTS reference_embedding_vector_idx;

   -- Crée un index vectoriel IVFFlat (ou HNSW si tu préfères)
   CREATE INDEX reference_embedding_vector_idx ON "ReferenceEmbedding" USING ivfflat ("vector");