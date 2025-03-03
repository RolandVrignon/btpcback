import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmbeddingDto } from './dto/create-embedding.dto';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';

/**
 * Interface pour les erreurs Prisma
 */
interface PrismaError {
  code: string;
  meta?: Record<string, unknown>;
  message: string;
}

/**
 * Interface pour les résultats de recherche d'embeddings
 */
export interface EmbeddingSearchResult {
  id: string;
  chunkId: string;
  text: string;
  page: number;
  documentId: string;
  documentName: string;
  distance: number;
  similarity: number;
}

/**
 * Interface pour les résultats de recherche par produit scalaire
 */
export interface DotProductSearchResult {
  id: string;
  chunkId: string;
  text: string;
  page: number;
  documentId: string;
  documentName: string;
  similarity: number;
}

/**
 * Interface pour les résultats de recherche hybride
 */
export interface HybridSearchResult {
  id: string;
  chunkId: string;
  text: string;
  page: number;
  documentId: string;
  documentName: string;
  vectorDistance: number;
  textRank: number;
  score: number;
}

/**
 * Interface pour les résultats de recherche full-text
 */
export interface FullTextSearchResult {
  id: string;
  text: string;
  page: number;
  documentId: string;
  rank: number;
}

@Injectable()
export class EmbeddingsRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * Crée un nouvel embedding
   */
  async create(createEmbeddingDto: CreateEmbeddingDto) {
    // Vérifier si le chunk existe
    const chunk = await this.prisma.chunk.findUnique({
      where: { id: createEmbeddingDto.chunkId },
    });

    if (!chunk) {
      throw new NotFoundException(
        `Chunk avec l'ID ${createEmbeddingDto.chunkId} non trouvé`,
      );
    }

    try {
      // Générer un UUID côté application
      const uuid = crypto.randomUUID();

      // Utiliser une requête SQL brute car le type 'vector' de pgvector
      // est défini comme 'Unsupported' dans le schéma Prisma.
      await this.prisma.$executeRaw`
        INSERT INTO "Embedding" ("id", "vector", "modelName", "modelVersion", "dimensions", "chunkId", "createdAt", "updatedAt", "usage")
        VALUES (${uuid}, ${createEmbeddingDto.vector}::vector, ${createEmbeddingDto.modelName}, ${createEmbeddingDto.modelVersion}, ${createEmbeddingDto.dimensions}, ${createEmbeddingDto.chunkId}, NOW(), NOW(), ${createEmbeddingDto.usage})
      `;

      return { success: true, message: 'Embedding créé avec succès', id: uuid };
    } catch (error) {
      if ((error as PrismaError).code === '23505') {
        // Code PostgreSQL pour violation de contrainte unique
        throw new ConflictException(
          'Un embedding avec ce modèle existe déjà pour ce chunk',
        );
      }
      throw error;
    }
  }

  /**
   * Crée plusieurs embeddings en une seule opération
   */
  async createMany(createEmbeddingDtos: CreateEmbeddingDto[]) {
    // Vérifier si tous les chunks existent
    const chunkIds = [
      ...new Set(createEmbeddingDtos.map((dto) => dto.chunkId)),
    ];
    const chunks = await this.prisma.chunk.findMany({
      where: { id: { in: chunkIds } },
    });

    if (chunks.length !== chunkIds.length) {
      throw new NotFoundException('Un ou plusieurs chunks non trouvés');
    }

    // Créer les embeddings en batch
    try {
      // Utiliser une transaction avec des opérations individuelles
      const createdEmbeddings = await Promise.all(
        createEmbeddingDtos.map(async (dto) => {
          try {
            // Générer un UUID côté application
            const uuid = crypto.randomUUID();

            return await this.prisma.$executeRaw`
              INSERT INTO "Embedding" ("id", "vector", "modelName", "modelVersion", "dimensions", "chunkId", "createdAt", "updatedAt")
              VALUES (${uuid}, ${dto.vector}::vector, ${dto.modelName}, ${dto.modelVersion}, ${dto.dimensions}, ${dto.chunkId}, NOW(), NOW())
            `;
          } catch (error) {
            // Ignorer les erreurs de duplication
            if ((error as PrismaError).code === '23505') {
              // Code PostgreSQL pour violation de contrainte unique
              return null;
            }
            throw error;
          }
        }),
      );

      return { count: createdEmbeddings.filter(Boolean).length };
    } catch (error) {
      if ((error as PrismaError).code === 'P2002') {
        throw new ConflictException(
          'Un ou plusieurs embeddings existent déjà pour ces chunks et modèles',
        );
      }
      throw error;
    }
  }

  /**
   * Récupère tous les embeddings
   */
  async findAll() {
    // Utiliser une requête SQL brute pour récupérer tous les embeddings avec leurs chunks et documents
    return await this.prisma.$queryRaw`
      SELECT e.id, e."vector", e."modelName", e."modelVersion", e."dimensions", e."chunkId",
             e."createdAt", e."updatedAt", c.id as "chunk_id", c.text as "chunk_text",
             c.page as "chunk_page", c."documentId" as "chunk_documentId",
             d.id as "document_id", d.filename as "document_filename", d.path as "document_path"
      FROM "Embedding" e
      JOIN "Chunk" c ON e."chunkId" = c.id
      JOIN "Document" d ON c."documentId" = d.id
    `;
  }

  /**
   * Récupère un embedding par son ID
   */
  async findOne(id: string) {
    // Utiliser une requête SQL brute pour récupérer un embedding spécifique
    const results = await this.prisma.$queryRaw`
      SELECT e.id, e."vector", e."modelName", e."modelVersion", e."dimensions", e."chunkId",
             e."createdAt", e."updatedAt", c.id as "chunk_id", c.text as "chunk_text",
             c.page as "chunk_page", c."documentId" as "chunk_documentId",
             d.id as "document_id", d.filename as "document_filename", d.path as "document_path"
      FROM "Embedding" e
      JOIN "Chunk" c ON e."chunkId" = c.id
      JOIN "Document" d ON c."documentId" = d.id
      WHERE e.id = ${id}
    `;

    if (!results || (results as any[]).length === 0) {
      throw new NotFoundException('Embedding non trouvé');
    }

    return (results as any[])[0];
  }

  /**
   * Récupère tous les embeddings d'un chunk
   */
  async findByChunk(chunkId: string) {
    // Vérifier si le chunk existe
    const chunks = await this.prisma.$queryRaw`
      SELECT id FROM "Chunk" WHERE id = ${chunkId}
    `;

    if (!chunks || (chunks as any[]).length === 0) {
      throw new NotFoundException('Chunk non trouvé');
    }

    // Récupérer tous les embeddings pour ce chunk
    return await this.prisma.$queryRaw`
      SELECT e.id, e."vector", e."modelName", e."modelVersion", e."dimensions", e."chunkId",
             e."createdAt", e."updatedAt", c.id as "chunk_id", c.text as "chunk_text",
             c.page as "chunk_page", c."documentId" as "chunk_documentId"
      FROM "Embedding" e
      JOIN "Chunk" c ON e."chunkId" = c.id
      WHERE e."chunkId" = ${chunkId}
    `;
  }

  /**
   * Récupère tous les embeddings d'un modèle
   */
  async findByModel(modelName: string, modelVersion: string) {
    // Récupérer tous les embeddings pour ce modèle
    return await this.prisma.$queryRaw`
      SELECT e.id, e."vector", e."modelName", e."modelVersion", e."dimensions", e."chunkId",
             e."createdAt", e."updatedAt", c.id as "chunk_id", c.text as "chunk_text",
             c.page as "chunk_page", c."documentId" as "chunk_documentId",
             d.id as "document_id", d.filename as "document_filename", d.path as "document_path"
      FROM "Embedding" e
      JOIN "Chunk" c ON e."chunkId" = c.id
      JOIN "Document" d ON c."documentId" = d.id
      WHERE e."modelName" = ${modelName} AND e."modelVersion" = ${modelVersion}
    `;
  }

  /**
   * Recherche les embeddings les plus similaires à un vecteur donné
   */
  async searchSimilar(
    vector: number[],
    modelName: string,
    modelVersion: string,
    limit: number = 10,
    threshold?: number,
    scopeFilter?: { documentId?: string; projectId?: string },
  ): Promise<EmbeddingSearchResult[]> {
    try {
      // Convertir le tableau de nombres en chaîne pour la requête SQL
      const vectorString = vector.join(',');

      // Construire la clause WHERE de base
      let whereClause = Prisma.sql`e."modelName" = ${modelName} AND e."modelVersion" = ${modelVersion}`;

      // Ajouter les filtres de scope si nécessaire
      if (scopeFilter) {
        if (scopeFilter.documentId) {
          // Filtrer par document
          whereClause = Prisma.sql`${whereClause} AND c."documentId" = ${scopeFilter.documentId}`;
        } else if (scopeFilter.projectId) {
          // Filtrer par projet
          whereClause = Prisma.sql`${whereClause} AND d."projectId" = ${scopeFilter.projectId}`;
        }
      }

      // Ajouter le seuil si spécifié
      if (threshold !== undefined) {
        whereClause = Prisma.sql`${whereClause} AND (e.vector <=> '[${Prisma.raw(vectorString)}]'::vector) < ${threshold}`;
      }

      // Exécuter la requête avec les filtres
      const results = await this.prisma.$queryRaw`
        SELECT e.id, e."chunkId", e."modelName", e."modelVersion", c.text, c.page, c."documentId", d.filename,
               e.vector <=> '[${Prisma.raw(vectorString)}]'::vector AS distance
        FROM "Embedding" e
        JOIN "Chunk" c ON e."chunkId" = c.id
        JOIN "Document" d ON c."documentId" = d.id
        WHERE ${whereClause}
        ORDER BY distance
        LIMIT ${limit}
      `;

      console.log(
        'Query executed successfully, results count:',
        Array.isArray(results) ? results.length : 0,
      );

      // Formater les résultats avec un typage approprié
      return (results as Record<string, unknown>[]).map((result) => ({
        id: result.id as string,
        chunkId: result.chunkId as string,
        text: result.text as string,
        page: result.page as number,
        documentId: result.documentId as string,
        documentName: result.filename as string,
        distance: result.distance as number,
        similarity: 1 - (result.distance as number), // Convertir la distance en score de similarité (0-1)
      }));
    } catch (error) {
      console.error('Error executing vector search query:', error);
      throw error;
    }
  }

  /**
   * Recherche les embeddings les plus similaires en utilisant l'opérateur de produit scalaire
   */
  async searchSimilarDotProduct(
    vector: number[],
    modelName: string,
    modelVersion: string,
    limit: number = 10,
  ): Promise<DotProductSearchResult[]> {
    try {
      // Convertir le tableau de nombres en chaîne pour la requête SQL
      const vectorString = vector.join(',');

      // Utiliser $queryRaw avec des template literals pour éviter les injections SQL
      const results = await this.prisma.$queryRaw`
        SELECT e.id, e."chunkId", e."modelName", e."modelVersion", c.text, c.page, c."documentId", d.filename,
               (e.vector <#> '[${Prisma.raw(vectorString)}]'::vector) * -1 AS similarity
        FROM "Embedding" e
        JOIN "Chunk" c ON e."chunkId" = c.id
        JOIN "Document" d ON c."documentId" = d.id
        WHERE e."modelName" = ${modelName} AND e."modelVersion" = ${modelVersion}
        ORDER BY similarity DESC
        LIMIT ${limit}
      `;

      // Formater les résultats avec un typage approprié
      return (results as Record<string, unknown>[]).map((result) => ({
        id: result.id as string,
        chunkId: result.chunkId as string,
        text: result.text as string,
        page: result.page as number,
        documentId: result.documentId as string,
        documentName: result.filename as string,
        similarity: result.similarity as number,
      }));
    } catch (error) {
      console.error('Error executing dot product search query:', error);
      throw error;
    }
  }

  /**
   * Recherche hybride combinant la recherche vectorielle et la recherche full-text
   */
  async searchHybrid(
    vector: number[],
    query: string,
    modelName: string,
    modelVersion: string,
    limit: number = 10,
    vectorWeight: number = 0.7,
  ): Promise<HybridSearchResult[]> {
    try {
      // Convertir le tableau de nombres en chaîne pour la requête SQL
      const vectorString = vector.join(',');

      // Utiliser $queryRaw avec des template literals pour éviter les injections SQL
      const results = await this.prisma.$queryRaw`
        SELECT e.id, e."chunkId", e."modelName", e."modelVersion", c.text, c.page, c."documentId", d.filename,
               (e.vector <=> '[${Prisma.raw(vectorString)}]'::vector) AS vector_distance,
               ts_rank_cd(to_tsvector('french', c.text), plainto_tsquery('french', ${query})) AS text_rank,
               (${vectorWeight} * (1 - (e.vector <=> '[${Prisma.raw(vectorString)}]'::vector)) +
                (1 - ${vectorWeight}) * ts_rank_cd(to_tsvector('french', c.text), plainto_tsquery('french', ${query}))) AS hybrid_score
        FROM "Embedding" e
        JOIN "Chunk" c ON e."chunkId" = c.id
        JOIN "Document" d ON c."documentId" = d.id
        WHERE e."modelName" = ${modelName} AND e."modelVersion" = ${modelVersion}
        AND to_tsvector('french', c.text) @@ plainto_tsquery('french', ${query})
        ORDER BY hybrid_score DESC
        LIMIT ${limit}
      `;

      // Formater les résultats avec un typage approprié
      return (results as Record<string, unknown>[]).map((result) => ({
        id: result.id as string,
        chunkId: result.chunkId as string,
        text: result.text as string,
        page: result.page as number,
        documentId: result.documentId as string,
        documentName: result.filename as string,
        vectorDistance: result.vector_distance as number,
        textRank: result.text_rank as number,
        score: result.hybrid_score as number,
      }));
    } catch (error) {
      console.error('Error executing hybrid search query:', error);
      throw error;
    }
  }

  /**
   * Recherche full-text dans les chunks
   */
  async searchFullText(
    query: string,
    limit: number = 10,
  ): Promise<FullTextSearchResult[]> {
    try {
      // Exécuter une requête SQL brute pour la recherche full-text
      const results = await this.prisma.$queryRaw`
        SELECT c.id, c.text, c.page, c."documentId",
               ts_rank(to_tsvector('french', c.text), plainto_tsquery('french', ${query})) AS rank
        FROM "Chunk" c
        WHERE to_tsvector('french', c.text) @@ plainto_tsquery('french', ${query})
        ORDER BY rank DESC
        LIMIT ${limit}
      `;

      // Formater les résultats avec un typage approprié
      return (results as Record<string, unknown>[]).map((result) => ({
        id: result.id as string,
        text: result.text as string,
        page: result.page as number,
        documentId: result.documentId as string,
        rank: result.rank as number,
      }));
    } catch (error) {
      console.error('Error executing full-text search query:', error);
      throw error;
    }
  }

  /**
   * Supprime un embedding
   */
  async remove(id: string) {
    try {
      // Vérifier si l'embedding existe
      const embeddings = await this.prisma.$queryRaw`
        SELECT id FROM "Embedding" WHERE id = ${id}
      `;

      if (
        !embeddings ||
        (embeddings as Record<string, unknown>[]).length === 0
      ) {
        throw new NotFoundException('Embedding non trouvé');
      }

      // Supprimer l'embedding
      await this.prisma.$executeRaw`
        DELETE FROM "Embedding" WHERE id = ${id}
      `;

      return { success: true, message: 'Embedding supprimé avec succès' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      // Gérer l'erreur avec un typage approprié
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      throw new Error(
        `Erreur lors de la suppression de l'embedding: ${errorMessage}`,
      );
    }
  }
}
