import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateEmbeddingDto } from '@/embeddings/dto/create-embedding.dto';
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
    try {
      // Générer un UUID côté application
      const uuid = crypto.randomUUID();

      // Utiliser une requête SQL brute car le type 'vector' de pgvector
      // est défini comme 'Unsupported' dans le schéma Prisma.
      await this.prisma.executeWithQueue(
        () =>
          this.prisma.$executeRaw`
          INSERT INTO embedding (id, vector, "modelName", "modelVersion", dimensions, "chunkId", "createdAt", "updatedAt", usage)
          VALUES (${uuid}, ${createEmbeddingDto.vector}::vector, ${createEmbeddingDto.modelName}, ${createEmbeddingDto.modelVersion}, ${createEmbeddingDto.dimensions}, ${createEmbeddingDto.chunkId}, NOW(), NOW(), ${createEmbeddingDto.usage})
        `,
      );

      return { success: true, message: 'Embedding créé avec succès', id: uuid };
    } catch (error) {
      if ((error as PrismaError).code === '23505') {
        // Code PostgreSQL pour violation de contrainte unique
        throw new ConflictException(
          'Un embedding existe déjà pour ce chunk et ce modèle',
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
    const chunks = await this.prisma.executeWithQueue(() =>
      this.prisma.chunk.findMany({
        where: { id: { in: chunkIds } },
      }),
    );

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

            return await this.prisma.executeWithQueue(
              () =>
                this.prisma.$executeRaw`
                INSERT INTO embedding (id, vector, "modelName", "modelVersion", dimensions, "chunkId", "createdAt", "updatedAt")
                VALUES (${uuid}, ${dto.vector}::vector, ${dto.modelName}, ${dto.modelVersion}, ${dto.dimensions}, ${dto.chunkId}, NOW(), NOW())
              `,
            );
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
    return await this.prisma.executeWithQueue(
      () =>
        this.prisma.$queryRaw`
        SELECT e.id, e."chunkId", e."modelName", e."modelVersion", e."dimensions", e."createdAt", e."updatedAt"
        FROM embedding e
      `,
    );
  }

  /**
   * Récupère tous les embeddings pour un chunk spécifique
   */
  async findByChunk(chunkId: string) {
    const embeddings = await this.prisma.executeWithQueue(
      () =>
        this.prisma.$queryRaw`
        SELECT e.id, e."chunkId", e."modelName", e."modelVersion", e."dimensions", e."createdAt", e."updatedAt"
        FROM embedding e
        WHERE e."chunkId" = ${chunkId}
      `,
    );

    if (!embeddings || (embeddings as unknown[]).length === 0) {
      throw new NotFoundException(
        `Aucun embedding trouvé pour le chunk ${chunkId}`,
      );
    }

    return embeddings;
  }

  /**
   * Récupère tous les embeddings pour un modèle spécifique
   */
  async findByModel(modelName: string, modelVersion: string) {
    return await this.prisma.executeWithQueue(
      () =>
        this.prisma.$queryRaw`
        SELECT e.id, e."chunkId", e."modelName", e."modelVersion", e."dimensions", e."createdAt", e."updatedAt"
        FROM embedding e
        WHERE e."modelName" = ${modelName} AND e."modelVersion" = ${modelVersion}
      `,
    );
  }

  /**
   * Recherche les embeddings similaires à un vecteur donné
   */
  async searchSimilar(
    vector: number[],
    modelName: string,
    modelVersion: string,
    limit: number = 10,
    threshold?: number,
    scopeFilter?: { documentId?: string; projectId?: string },
  ): Promise<EmbeddingSearchResult[]> {
    let query = Prisma.sql`
      SELECT
        e.id,
        e."chunkId",
        c.text,
        c.page,
        c."documentId",
        d."filename" as "documentName",
        (e.vector <=> ${vector}::vector) as distance,
        (1 - (e.vector <=> ${vector}::vector)) as similarity
      FROM embedding e
      JOIN chunk c ON e."chunkId" = c.id
      JOIN document d ON c."documentId" = d.id
      WHERE e."modelName" = ${modelName}
      AND e."modelVersion" = ${modelVersion}
    `;

    // Ajouter des filtres conditionnels
    if (scopeFilter?.documentId) {
      query = Prisma.sql`
        ${query} AND c."documentId" = ${scopeFilter.documentId}
      `;
    } else if (scopeFilter?.projectId) {
      query = Prisma.sql`
        ${query} AND d."projectId" = ${scopeFilter.projectId}
      `;
    }

    // Ajouter un filtre de seuil si spécifié
    if (threshold !== undefined) {
      query = Prisma.sql`
        ${query} AND (1 - (e.vector <=> ${vector}::vector)) >= ${threshold}
      `;
    }

    // Ajouter le tri et la limite
    query = Prisma.sql`
      ${query} ORDER BY distance ASC
      LIMIT ${limit}
    `;

    const results = await this.prisma.executeWithQueue(() =>
      this.prisma.$queryRaw(query),
    );

    return results as EmbeddingSearchResult[];
  }

  /**
   * Recherche les embeddings similaires à un vecteur donné en utilisant le produit scalaire
   */
  async searchSimilarDotProduct(
    vector: number[],
    modelName: string,
    modelVersion: string,
    limit: number = 10,
  ): Promise<DotProductSearchResult[]> {
    const query = Prisma.sql`
      SELECT
        e.id,
        e."chunkId",
        c.text,
        c.page,
        c."documentId",
        d."filename" as "documentName",
        (e.vector <#> ${vector}::vector) as similarity
      FROM embedding e
      JOIN chunk c ON e."chunkId" = c.id
      JOIN document d ON c."documentId" = d.id
      WHERE e."modelName" = ${modelName}
      AND e."modelVersion" = ${modelVersion}
      ORDER BY similarity DESC
      LIMIT ${limit}
    `;

    const results = await this.prisma.executeWithQueue(() =>
      this.prisma.$queryRaw(query),
    );

    return results as DotProductSearchResult[];
  }

  /**
   * Recherche hybride combinant la recherche vectorielle et la recherche plein texte
   */
  async searchHybrid(
    vector: number[],
    query: string,
    modelName: string,
    modelVersion: string,
    limit: number = 10,
    vectorWeight: number = 0.7,
  ): Promise<HybridSearchResult[]> {
    const textWeight = 1 - vectorWeight;

    const hybridQuery = Prisma.sql`
      SELECT
        e.id,
        e."chunkId",
        c.text,
        c.page,
        c."documentId",
        d."filename" as "documentName",
        (e.vector <=> ${vector}::vector) as "vectorDistance",
        ts_rank_cd(to_tsvector('french', c.text), plainto_tsquery('french', ${query})) as "textRank",
        (${vectorWeight} * (1 - (e.vector <=> ${vector}::vector)) +
         ${textWeight} * ts_rank_cd(to_tsvector('french', c.text), plainto_tsquery('french', ${query}))) as score
      FROM embedding e
      JOIN chunk c ON e."chunkId" = c.id
      JOIN document d ON c."documentId" = d.id
      WHERE e."modelName" = ${modelName}
      AND e."modelVersion" = ${modelVersion}
      AND to_tsvector('french', c.text) @@ plainto_tsquery('french', ${query})
      ORDER BY score DESC
      LIMIT ${limit}
    `;

    const results = await this.prisma.executeWithQueue(() =>
      this.prisma.$queryRaw(hybridQuery),
    );

    return results as HybridSearchResult[];
  }

  /**
   * Recherche plein texte dans les chunks
   */
  async searchFullText(
    query: string,
    limit: number = 10,
  ): Promise<FullTextSearchResult[]> {
    const textQuery = Prisma.sql`
      SELECT
        c.id,
        c.text,
        c.page,
        c."documentId",
        ts_rank_cd(to_tsvector('french', c.text), plainto_tsquery('french', ${query})) as rank
      FROM chunk c
      WHERE to_tsvector('french', c.text) @@ plainto_tsquery('french', ${query})
      ORDER BY rank DESC
      LIMIT ${limit}
    `;

    const results = await this.prisma.executeWithQueue(() =>
      this.prisma.$queryRaw(textQuery),
    );

    return results as FullTextSearchResult[];
  }

  /**
   * Supprime un embedding
   */
  async remove(id: string) {
    // Vérifier si l'embedding existe
    const embeddings = await this.prisma.executeWithQueue(
      () =>
        this.prisma.$queryRaw`
        SELECT id FROM embedding WHERE id = ${id}
      `,
    );

    if (!embeddings || (embeddings as unknown[]).length === 0) {
      throw new NotFoundException(`Embedding avec l'ID ${id} non trouvé`);
    }

    // Supprimer l'embedding
    await this.prisma.executeWithQueue(
      () =>
        this.prisma.$executeRaw`
        DELETE FROM embedding WHERE id = ${id}
      `,
    );

    return { success: true, message: 'Embedding supprimé avec succès' };
  }
}
