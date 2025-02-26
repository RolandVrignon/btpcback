/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
/**
 * Service pour la gestion des embeddings vectoriels.
 *
 * Note: Ce service utilise des requêtes SQL brutes ($executeRaw) au lieu de l'API Prisma standard
 * car le type 'vector' de pgvector est défini comme 'Unsupported' dans le schéma Prisma.
 * Cela est nécessaire pour manipuler correctement les vecteurs d'embeddings.
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmbeddingDto } from './dto/create-embedding.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class EmbeddingsService {
  constructor(private prisma: PrismaService) {}

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
      // Utiliser $executeRaw pour insérer directement dans la base de données
      // car le type vector n'est pas directement supporté par l'API Prisma standard
      await this.prisma.$executeRaw`
        INSERT INTO "Embedding" ("vector", "modelName", "modelVersion", "dimensions", "chunkId", "createdAt", "updatedAt")
        VALUES (${createEmbeddingDto.vector}::vector, ${createEmbeddingDto.modelName}, ${createEmbeddingDto.modelVersion}, ${createEmbeddingDto.dimensions}, ${createEmbeddingDto.chunkId}, NOW(), NOW())
      `;

      return { success: true, message: 'Embedding créé avec succès' };
    } catch (error) {
      if (error.code === '23505') {
        // Code PostgreSQL pour violation de contrainte unique
        throw new ConflictException(
          'Un embedding avec ce modèle existe déjà pour ce chunk',
        );
      }
      throw error;
    }
  }

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
            return await this.prisma.$executeRaw`
              INSERT INTO "Embedding" ("vector", "modelName", "modelVersion", "dimensions", "chunkId", "createdAt", "updatedAt")
              VALUES (${dto.vector}::vector, ${dto.modelName}, ${dto.modelVersion}, ${dto.dimensions}, ${dto.chunkId}, NOW(), NOW())
            `;
          } catch (error) {
            // Ignorer les erreurs de duplication
            if (error.code === '23505') {
              // Code PostgreSQL pour violation de contrainte unique
              return null;
            }
            throw error;
          }
        }),
      );

      return { count: createdEmbeddings.filter(Boolean).length };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'Un ou plusieurs embeddings existent déjà pour ces chunks et modèles',
        );
      }
      throw error;
    }
  }

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

  async findOne(id: number) {
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

  async findByChunk(chunkId: number) {
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

  async searchSimilar(
    vector: number[],
    modelName: string,
    modelVersion: string,
    limit: number = 10,
  ) {
    // Convertir le tableau de nombres en vecteur pgvector
    const vectorString = `[${vector.join(',')}]`;

    // Exécuter une requête SQL brute pour la recherche de similarité
    const results = await this.prisma.$queryRaw`
      SELECT e.id, e."chunkId", e."modelName", e."modelVersion", c.text, c.page, c."documentId",
             e.vector <=> ${Prisma.raw(vectorString)}::vector AS distance
      FROM "Embedding" e
      JOIN "Chunk" c ON e."chunkId" = c.id
      WHERE e."modelName" = ${modelName} AND e."modelVersion" = ${modelVersion}
      ORDER BY distance
      LIMIT ${limit}
    `;

    return results;
  }

  async searchFullText(query: string, limit: number = 10) {
    // Exécuter une requête SQL brute pour la recherche full-text
    const results = await this.prisma.$queryRaw`
      SELECT c.id, c.text, c.page, c."documentId",
             ts_rank(to_tsvector('french', c.text), plainto_tsquery('french', ${query})) AS rank
      FROM "Chunk" c
      WHERE to_tsvector('french', c.text) @@ plainto_tsquery('french', ${query})
      ORDER BY rank DESC
      LIMIT ${limit}
    `;

    return results;
  }

  async remove(id: number) {
    try {
      // Vérifier si l'embedding existe
      const embeddings = await this.prisma.$queryRaw`
        SELECT id FROM "Embedding" WHERE id = ${id}
      `;

      if (!embeddings || (embeddings as any[]).length === 0) {
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
      throw new Error(
        `Erreur lors de la suppression de l'embedding: ${error.message}`,
      );
    }
  }
}
