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
import * as crypto from 'crypto';

// Interface pour les erreurs Prisma
interface PrismaError {
  code: string;
  meta?: Record<string, unknown>;
  message: string;
}

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
      // Générer un UUID côté application
      const uuid = crypto.randomUUID();
      console.log('uuid:', uuid);

      // Note: Nous utilisons des requêtes SQL brutes car le type 'vector' de pgvector
      // est défini comme 'Unsupported' dans le schéma Prisma.
      //
      // Si vous souhaitez utiliser l'API Prisma standard, vous devriez:
      // 1. Modifier le schéma Prisma pour utiliser un type compatible (comme String ou Json)
      // 2. Convertir le vecteur en JSON avant de le stocker
      // 3. Ajouter des fonctions de conversion dans votre application
      //
      // Exemple avec l'API Prisma standard (nécessite modification du schéma):
      // return await this.prisma.embedding.create({
      //   data: {
      //     id: uuid,
      //     vector: JSON.stringify(createEmbeddingDto.vector), // Conversion nécessaire
      //     modelName: createEmbeddingDto.modelName,
      //     modelVersion: createEmbeddingDto.modelVersion,
      //     dimensions: createEmbeddingDto.dimensions,
      //     chunkId: createEmbeddingDto.chunkId,
      //   },
      // });

      // Avec la requête SQL brute, nous pouvons utiliser directement le type vector de pgvector
      console.log('Store embedding in Database');

      await this.prisma.$executeRaw`
        INSERT INTO "Embedding" ("id", "vector", "modelName", "modelVersion", "dimensions", "chunkId", "createdAt", "updatedAt", "usage")
        VALUES (${uuid}, ${createEmbeddingDto.vector}::vector, ${createEmbeddingDto.modelName}, ${createEmbeddingDto.modelVersion}, ${createEmbeddingDto.dimensions}, ${createEmbeddingDto.chunkId}, NOW(), NOW(), ${createEmbeddingDto.usage})
      `;

      return { success: true, message: 'Embedding créé avec succès', id: uuid };
    } catch (error) {
      console.log('Store embedding in Database error');
      if ((error as PrismaError).code === '23505') {
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
   * @param vector Le vecteur de recherche
   * @param modelName Nom du modèle d'embedding
   * @param modelVersion Version du modèle
   * @param limit Nombre maximum de résultats à retourner (défaut: 10)
   * @param threshold Seuil de distance maximale (optionnel)
   * @returns Les chunks les plus similaires avec leur score de similarité
   */
  async searchSimilar(
    vector: number[],
    modelName: string,
    modelVersion: string,
    limit: number = 10,
    threshold?: number,
  ) {
    // Convertir le tableau de nombres en vecteur pgvector
    const vectorString = `[${vector.join(',')}]`;

    // Construire la requête de base
    let query = Prisma.sql`
      SELECT e.id, e."chunkId", e."modelName", e."modelVersion", c.text, c.page, c."documentId", d.filename,
             e.vector <=> ${Prisma.raw(vectorString)}::vector AS distance
      FROM "Embedding" e
      JOIN "Chunk" c ON e."chunkId" = c.id
      JOIN "Document" d ON c."documentId" = d.id
      WHERE e."modelName" = ${modelName} AND e."modelVersion" = ${modelVersion}
    `;

    // Ajouter un filtre de seuil si spécifié
    if (threshold !== undefined) {
      query = Prisma.sql`
        ${query} AND (e.vector <=> ${Prisma.raw(vectorString)}::vector) < ${threshold}
      `;
    }

    // Ajouter le tri et la limite
    query = Prisma.sql`
      ${query} ORDER BY distance LIMIT ${limit}
    `;

    // Exécuter la requête
    const results = await this.prisma.$queryRaw(query);

    // Formater les résultats pour inclure plus d'informations
    return (results as any[]).map((result) => ({
      id: result.id,
      chunkId: result.chunkId,
      text: result.text,
      page: result.page,
      documentId: result.documentId,
      documentName: result.filename,
      distance: result.distance,
      similarity: 1 - result.distance, // Convertir la distance en score de similarité (0-1)
    }));
  }

  /**
   * Recherche les embeddings les plus similaires en utilisant l'opérateur de produit scalaire (dot product)
   * Utile pour certains cas d'usage où la similarité cosinus est préférable
   * @param vector Le vecteur de recherche
   * @param modelName Nom du modèle d'embedding
   * @param modelVersion Version du modèle
   * @param limit Nombre maximum de résultats à retourner (défaut: 10)
   * @returns Les chunks les plus similaires avec leur score de similarité
   */
  async searchSimilarDotProduct(
    vector: number[],
    modelName: string,
    modelVersion: string,
    limit: number = 10,
  ) {
    // Convertir le tableau de nombres en vecteur pgvector
    const vectorString = `[${vector.join(',')}]`;

    // Utiliser le produit scalaire (dot product) au lieu de la distance euclidienne
    const results = await this.prisma.$queryRaw`
      SELECT e.id, e."chunkId", e."modelName", e."modelVersion", c.text, c.page, c."documentId", d.filename,
             (e.vector <#> ${Prisma.raw(vectorString)}::vector) * -1 AS similarity
      FROM "Embedding" e
      JOIN "Chunk" c ON e."chunkId" = c.id
      JOIN "Document" d ON c."documentId" = d.id
      WHERE e."modelName" = ${modelName} AND e."modelVersion" = ${modelVersion}
      ORDER BY similarity DESC
      LIMIT ${limit}
    `;

    // Formater les résultats
    return results;
  }

  /**
   * Recherche hybride combinant la recherche vectorielle et la recherche full-text
   * @param vector Le vecteur de recherche
   * @param query La requête textuelle
   * @param modelName Nom du modèle d'embedding
   * @param modelVersion Version du modèle
   * @param limit Nombre maximum de résultats à retourner (défaut: 10)
   * @param vectorWeight Poids de la recherche vectorielle (0-1, défaut: 0.7)
   * @returns Les chunks les plus pertinents avec leur score combiné
   */
  async searchHybrid(
    vector: number[],
    query: string,
    modelName: string,
    modelVersion: string,
    limit: number = 10,
    vectorWeight: number = 0.7,
  ) {
    // Vérifier que le poids est valide
    if (vectorWeight < 0 || vectorWeight > 1) {
      throw new Error('Le poids vectoriel doit être compris entre 0 et 1');
    }

    const textWeight = 1 - vectorWeight;
    const vectorString = `[${vector.join(',')}]`;

    // Requête hybride combinant la recherche vectorielle et la recherche full-text
    const results = await this.prisma.$queryRaw`
      SELECT
        e.id,
        e."chunkId",
        c.text,
        c.page,
        c."documentId",
        d.filename,
        (e.vector <=> ${Prisma.raw(vectorString)}::vector) AS vector_distance,
        ts_rank(to_tsvector('french', c.text), plainto_tsquery('french', ${query})) AS text_rank,
        (${vectorWeight} * (1 - (e.vector <=> ${Prisma.raw(vectorString)}::vector)) +
         ${textWeight} * ts_rank(to_tsvector('french', c.text), plainto_tsquery('french', ${query}))) AS combined_score
      FROM "Embedding" e
      JOIN "Chunk" c ON e."chunkId" = c.id
      JOIN "Document" d ON c."documentId" = d.id
      WHERE e."modelName" = ${modelName}
        AND e."modelVersion" = ${modelVersion}
        AND to_tsvector('french', c.text) @@ plainto_tsquery('french', ${query})
      ORDER BY combined_score DESC
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

  async remove(id: string) {
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
