/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
/**
 * Service pour la gestion des embeddings vectoriels.
 *
 * Note: Ce service utilise des requêtes SQL brutes ($executeRaw) au lieu de l'API Prisma standard
 * car le type 'vector' de pgvector est défini comme 'Unsupported' dans le schéma Prisma.
 * Cela est nécessaire pour manipuler correctement les vecteurs d'embeddings.
 */

import { Injectable } from '@nestjs/common';
import { CreateEmbeddingDto } from './dto/create-embedding.dto';
import { EmbeddingsRepository } from './embeddings.repository';
import { UsageService } from '../usage/usage.service';
import { AI_Provider } from '@prisma/client';

@Injectable()
export class EmbeddingsService {
  constructor(
    private readonly embeddingsRepository: EmbeddingsRepository,
    private readonly usageService: UsageService,
  ) {}

  async create(createEmbeddingDto: CreateEmbeddingDto) {
    return this.embeddingsRepository.create(createEmbeddingDto);
  }

  async createMany(createEmbeddingDtos: CreateEmbeddingDto[]) {
    // Enregistrer l'utilisation du modèle pour chaque embedding
    for (const dto of createEmbeddingDtos) {
      if (dto.usage) {
        await this.usageService.create({
          provider: AI_Provider.OPENAI,
          modelName: dto.modelName,
          totalTokens: dto.usage,
          type: 'EMBEDDING',
          projectId: dto.projectId,
        });
      }
    }

    return this.embeddingsRepository.createMany(createEmbeddingDtos);
  }

  async findAll() {
    return this.embeddingsRepository.findAll();
  }

  async findOne(id: string) {
    return this.embeddingsRepository.findOne(id);
  }

  async findByChunk(chunkId: string) {
    return this.embeddingsRepository.findByChunk(chunkId);
  }

  async findByModel(modelName: string, modelVersion: string) {
    return this.embeddingsRepository.findByModel(modelName, modelVersion);
  }

  async remove(id: string) {
    return this.embeddingsRepository.remove(id);
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
  ) {
    return this.embeddingsRepository.searchSimilar(
      vector,
      modelName,
      modelVersion,
      limit,
      threshold,
    );
  }

  /**
   * Recherche les embeddings les plus similaires en utilisant l'opérateur de produit scalaire
   */
  async searchSimilarDotProduct(
    vector: number[],
    modelName: string,
    modelVersion: string,
    limit: number = 10,
  ) {
    return this.embeddingsRepository.searchSimilarDotProduct(
      vector,
      modelName,
      modelVersion,
      limit,
    );
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
  ) {
    return this.embeddingsRepository.searchHybrid(
      vector,
      query,
      modelName,
      modelVersion,
      limit,
      vectorWeight,
    );
  }

  /**
   * Recherche full-text dans les chunks
   */
  async searchFullText(query: string, limit: number = 10) {
    return this.embeddingsRepository.searchFullText(query, limit);
  }
}
