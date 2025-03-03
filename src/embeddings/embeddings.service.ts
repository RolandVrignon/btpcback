/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
/**
 * Service pour la gestion des embeddings vectoriels.
 *
 * Note: Ce service utilise des requêtes SQL brutes ($executeRaw) au lieu de l'API Prisma standard
 * car le type 'vector' de pgvector est défini comme 'Unsupported' dans le schéma Prisma.
 * Cela est nécessaire pour manipuler correctement les vecteurs d'embeddings.
 */

import { Injectable } from '@nestjs/common';
import {
  CreateEmbeddingDto,
  CreateFromQueryDto,
} from './dto/create-embedding.dto';
import {
  EmbeddingsRepository,
  EmbeddingSearchResult,
  DotProductSearchResult,
  HybridSearchResult,
  FullTextSearchResult,
} from './embeddings.repository';
import { UsageService } from '../usage/usage.service';
import { AI_Provider } from '@prisma/client';
import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';

@Injectable()
export class EmbeddingsService {
  constructor(
    private readonly embeddingsRepository: EmbeddingsRepository,
    private readonly usageService: UsageService,
  ) {}

  async create(createEmbeddingDto: CreateEmbeddingDto) {
    return this.embeddingsRepository.create(createEmbeddingDto);
  }

  async createFromQuery(
    createFromQueryDto: CreateFromQueryDto,
  ): Promise<number[]> {
    const modelName = 'text-embedding-3-small';

    const { embedding, usage } = await embed({
      model: openai.embedding(modelName),
      value: createFromQueryDto.query,
    });

    await this.usageService.create({
      provider: AI_Provider.OPENAI,
      modelName: modelName,
      totalTokens: usage.tokens,
      type: 'EMBEDDING',
      projectId: createFromQueryDto.projectId,
    });

    return embedding;
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
    scopeFilter?: { documentId?: string; projectId?: string },
  ): Promise<EmbeddingSearchResult[]> {
    return this.embeddingsRepository.searchSimilar(
      vector,
      modelName,
      modelVersion,
      limit,
      threshold,
      scopeFilter,
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
  ): Promise<DotProductSearchResult[]> {
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
  ): Promise<HybridSearchResult[]> {
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
  async searchFullText(
    query: string,
    limit: number = 10,
  ): Promise<FullTextSearchResult[]> {
    return this.embeddingsRepository.searchFullText(query, limit);
  }
}
