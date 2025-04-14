import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SearchRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * Exécute une recherche sémantique dans les chunks
   */
  async semanticSearch(
    query: string,
    documentId?: string,
    projectId?: string,
    limit: number = 5,
  ) {
    // Construire la requête de base qui recherche directement dans les chunks
    let sqlQuery = Prisma.sql`
      SELECT c.id, c."documentId", c.text, c.page,
             ts_rank_cd(to_tsvector('french', c.text), plainto_tsquery('french', ${query})) AS score
      FROM "Chunk" c
      JOIN "Document" d ON c."documentId" = d.id
      JOIN "Project" p ON d."projectId" = p.id
      WHERE to_tsvector('french', c.text) @@ plainto_tsquery('french', ${query})
    `;

    // Ajouter des filtres conditionnels selon la priorité
    if (documentId) {
      sqlQuery = Prisma.sql`
        ${sqlQuery} AND c."documentId" = ${documentId}
      `;
    } else if (projectId) {
      sqlQuery = Prisma.sql`
        ${sqlQuery} AND d."projectId" = ${projectId}
      `;
    }

    // Ajouter le tri et la limite
    sqlQuery = Prisma.sql`
      ${sqlQuery} ORDER BY score DESC
      LIMIT ${limit}
    `;

    return this.prisma.executeWithQueue(() => this.prisma.$queryRaw(sqlQuery));
  }

  /**
   * Exécute une recherche hybride (vectorielle + sémantique)
   */
  async hybridSearch(
    query: string,
    referenceChunkId: string,
    embeddingModel: string,
    embeddingVersion: string,
    organizationId: string,
    documentId?: string,
    projectId?: string,
    limit: number = 5,
  ) {
    // Construire la requête hybride
    let sqlQuery = Prisma.sql`
      SELECT c.id, c."documentId", c.text, c.page,
             (0.7 * (1 - (e.vector <=> (SELECT vector FROM "Embedding" WHERE "chunkId" = ${referenceChunkId} AND "modelName" = ${embeddingModel} AND "modelVersion" = ${embeddingVersion})::vector)) +
              0.3 * ts_rank_cd(to_tsvector('french', c.text), plainto_tsquery('french', ${query}))) AS score
      FROM "Chunk" c
      JOIN "Embedding" e ON c.id = e."chunkId"
      JOIN "Document" d ON c."documentId" = d.id
      JOIN "Project" p ON d."projectId" = p.id
      WHERE p."organizationId" = ${organizationId}
      AND e."modelName" = ${embeddingModel}
      AND e."modelVersion" = ${embeddingVersion}
    `;

    // Ajouter des filtres conditionnels selon la priorité
    if (documentId) {
      sqlQuery = Prisma.sql`
        ${sqlQuery} AND c."documentId" = ${documentId}
      `;
    } else if (projectId) {
      sqlQuery = Prisma.sql`
        ${sqlQuery} AND d."projectId" = ${projectId}
      `;
    }

    // Ajouter le tri et la limite
    sqlQuery = Prisma.sql`
      ${sqlQuery} ORDER BY score DESC
      LIMIT ${limit}
    `;

    return this.prisma.executeWithQueue(() => this.prisma.$queryRaw(sqlQuery));
  }
}
