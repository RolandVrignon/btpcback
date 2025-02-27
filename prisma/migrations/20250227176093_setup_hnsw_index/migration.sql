-- Supprimer l'index B-tree s'il existe
DROP INDEX IF EXISTS "embedding_vector_idx";

-- Créer l'index HNSW
CREATE INDEX "embedding_vector_idx" ON "Embedding" USING hnsw (vector vector_cosine_ops) WITH (m = 16, ef_construction = 64);