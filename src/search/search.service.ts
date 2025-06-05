import { Injectable, BadRequestException } from '@nestjs/common';
import { EmbeddingsService } from '@/embeddings/embeddings.service';
import {
  SearchRequestDto,
  SearchResponseDto,
  SearchResultDto,
} from '@/search/dto';
import { NotFoundException } from '@nestjs/common';
import { ProjectsRepository } from '@/projects/projects.repository';
import { SearchRepository } from '@/search/search.repository';
import { ChunksRepository } from '@/chunks/chunks.repository';
import { Logger } from '@nestjs/common';
import { ReferenceDocumentsRepository } from '@/reference-documents/reference-documents.repository';
import { ReferenceEmbeddingsService } from '@/reference-embeddings/reference-embeddings.service';
import { SearchSimilarResult } from '@/reference-embeddings/interface/SearchSimilarResult';
// Interface pour les résultats de recherche vectorielle
interface VectorSearchResult {
  id: string;
  documentId: string;
  text: string;
  similarity: number;
  page: number;
}

// Interface pour les résultats de recherche sémantique et hybride
interface SemanticSearchResult {
  id: string;
  documentId: string;
  text: string;
  score: number;
  page: number;
}

// Interface pour les chunks de document
export interface DocumentChunk {
  id: string;
  text: string;
  order?: number | null;
  page?: number | null;
}

@Injectable()
export class SearchService {
  private readonly embeddingModel = 'text-embedding-3-small';
  private readonly embeddingVersion = 'v1';
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly embeddingsService: EmbeddingsService,
    private readonly projectsRepository: ProjectsRepository,
    private readonly searchRepository: SearchRepository,
    private readonly chunksRepository: ChunksRepository,
    private readonly referenceDocumentsRepository: ReferenceDocumentsRepository,
    private readonly referenceEmbeddingsService: ReferenceEmbeddingsService,
  ) {}

  /**
   * Valide les paramètres de recherche
   */
  private validateSearchParams(params: SearchRequestDto): void {
    if (!params.projectId && !params.documentId) {
      throw new BadRequestException(
        'Vous devez spécifier au moins projectId ou documentId',
      );
    }
  }

  /**
   * Mesure le temps d'exécution d'une fonction
   */
  private async measureExecutionTime<T>(
    fn: () => Promise<T>,
  ): Promise<{ result: T; executionTimeMs: number }> {
    const startTime = Date.now();
    const result = await fn();
    const executionTimeMs = Date.now() - startTime;
    return { result, executionTimeMs };
  }

  /**
   * Recherche vectorielle pure (basée sur la similarité des embeddings)
   */
  async vectorSearch(
    params: SearchRequestDto,
    organizationId: string,
  ): Promise<SearchResponseDto> {
    this.validateSearchParams(params);
    // Vérifier l'accès au projet si un projectId est fourni
    if (params.projectId) {
      await this.checkProjectAccess(params.projectId, organizationId);
    }

    const { result: results, executionTimeMs } =
      await this.measureExecutionTime(async () => {
        // Générer le vecteur d'embedding à partir de la requête
        const vector = await this.embeddingsService.createFromQuery({
          query: params.query,
          projectId: params.projectId,
        });

        // Appliquer les filtres de scope selon la priorité
        const scopeFilter: { documentId?: string; projectId?: string } = {};

        if (params.documentId) {
          scopeFilter.documentId = params.documentId;
        } else if (params.projectId) {
          scopeFilter.projectId = params.projectId;
        }

        // Effectuer la recherche vectorielle avec le vecteur généré et les filtres de scope
        const searchResults = await this.embeddingsService.searchSimilar(
          vector,
          this.embeddingModel,
          this.embeddingVersion,
          params.limit || 5,
          undefined, // threshold
          scopeFilter, // Passer les filtres de scope
        );

        // Vérifier si nous avons des résultats
        if (
          !searchResults ||
          !Array.isArray(searchResults) ||
          searchResults.length === 0
        ) {
          throw new BadRequestException(
            'Aucun résultat trouvé pour cette requête',
          );
        }

        const results = searchResults.map((result: VectorSearchResult) => {
          return {
            id: result.id,
            documentId: result.documentId,
            text: result.text,
            score: result.similarity,
            page: result.page,
          } as SearchResultDto;
        });

        return results;
      });

    return {
      results,
      executionTimeMs,
      searchType: 'vector',
    };
  }

  /**
   * Recherche sémantique (basée sur la compréhension du langage naturel)
   */
  async semanticSearch(
    params: SearchRequestDto,
    organizationId: string,
  ): Promise<SearchResponseDto> {
    this.validateSearchParams(params);

    this.logger.log(
      `PROJECT [${params.projectId || 'N/A'}] [SEMANTIC SEARCH] Recherche pour: "${params.query}"`,
    );

    // Vérifier l'accès au projet si un projectId est fourni
    if (params.projectId) {
      await this.checkProjectAccess(params.projectId, organizationId);
    }

    const { result: results, executionTimeMs } =
      await this.measureExecutionTime(async () => {
        this.logger.log(
          `PROJECT [${params.projectId || 'N/A'}] [SEMANTIC SEARCH] Exécution de la requête full-text sur les chunks`,
        );

        // Utiliser le repository pour la recherche sémantique
        const chunks = await this.searchRepository.semanticSearch(
          params.query,
          params.documentId,
          params.projectId,
          params.limit || 5,
        );

        this.logger.log(
          `PROJECT [${params.projectId || 'N/A'}] [SEMANTIC SEARCH] Nombre de résultats: ${Array.isArray(chunks) ? chunks.length : 0}`,
        );

        // Vérifier si nous avons des résultats
        if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
          throw new BadRequestException(
            'Aucun résultat trouvé pour cette requête',
          );
        }

        // Transformer les résultats
        const results = (chunks as SemanticSearchResult[]).map(
          (chunk: SemanticSearchResult, index: number) => {
            this.logger.log(
              `PROJECT [${params.projectId || 'N/A'}] [SEMANTIC SEARCH] Résultat #${index + 1}`,
            );
            this.logger.log(
              `PROJECT [${params.projectId || 'N/A'}]   ID: ${chunk.id}`,
            );
            this.logger.log(
              `PROJECT [${params.projectId || 'N/A'}]   Document ID: ${chunk.documentId}`,
            );
            this.logger.log(
              `PROJECT [${params.projectId || 'N/A'}]   Score: ${chunk.score}`,
            );
            this.logger.log(
              `PROJECT [${params.projectId || 'N/A'}]   Page: ${chunk.page}`,
            );
            this.logger.log(
              `PROJECT [${params.projectId || 'N/A'}]   Texte: ${chunk.text.substring(0, 150)}${chunk.text.length > 150 ? '...' : ''}`,
            );

            return {
              id: chunk.id,
              documentId: chunk.documentId,
              text: chunk.text,
              score: chunk.score,
              page: chunk.page,
            } as SearchResultDto;
          },
        );

        this.logger.log(
          `PROJECT [${params.projectId || 'N/A'}] [SEMANTIC SEARCH] Recherche terminée`,
        );
        return results;
      });

    return {
      results,
      executionTimeMs,
      searchType: 'semantic',
    };
  }

  /**
   * Recherche hybride (combinaison de recherche vectorielle et sémantique)
   */
  async hybridSearch(
    params: SearchRequestDto,
    organizationId: string,
  ): Promise<SearchResponseDto> {
    this.validateSearchParams(params);

    this.logger.log(
      `PROJECT [${params.projectId || 'N/A'}] [HYBRID SEARCH] Recherche pour: "${params.query}"`,
    );

    const { result: results, executionTimeMs } =
      await this.measureExecutionTime(async () => {
        // Utiliser la recherche full-text pour trouver des chunks similaires
        const searchResults = await this.embeddingsService.searchFullText(
          params.query,
          100,
        );

        this.logger.log('searchResults:', searchResults);

        this.logger.log(
          `PROJECT [${params.projectId || 'N/A'}] [HYBRID SEARCH] Nombre de résultats initiaux: ${Array.isArray(searchResults) ? searchResults.length : 0}`,
        );

        // Vérifier si nous avons des résultats
        if (
          !searchResults ||
          !Array.isArray(searchResults) ||
          searchResults.length === 0
        ) {
          throw new BadRequestException(
            'Aucun résultat trouvé pour cette requête',
          );
        }

        // Récupérer l'ID du premier résultat pour l'utiliser comme référence
        const firstResult = searchResults[0] as unknown as { id: string };
        this.logger.log('firstResult:', firstResult);
        const referenceChunkId = firstResult?.id;
        this.logger.log('referenceChunkId:', referenceChunkId);

        this.logger.log(
          `PROJECT [${params.projectId || 'N/A'}] [HYBRID SEARCH] ID du chunk de référence: ${referenceChunkId}`,
        );

        if (!referenceChunkId) {
          throw new BadRequestException(
            'Impossible de trouver un chunk de référence',
          );
        }

        this.logger.log(
          `PROJECT [${params.projectId || 'N/A'}] [HYBRID SEARCH] Exécution de la requête hybride`,
        );

        // Utiliser le repository pour la recherche hybride
        const chunks = await this.searchRepository.hybridSearch(
          params.query,
          referenceChunkId,
          this.embeddingModel,
          this.embeddingVersion,
          organizationId,
          params.documentId,
          params.projectId,
          params.limit || 5,
        );

        this.logger.log(
          `PROJECT [${params.projectId || 'N/A'}] [HYBRID SEARCH] Nombre de résultats finaux: ${Array.isArray(chunks) ? chunks.length : 0}`,
        );

        // Transformer les résultats
        const results = (chunks as SemanticSearchResult[]).map(
          (chunk: SemanticSearchResult, index: number) => {
            this.logger.log(
              `PROJECT [${params.projectId || 'N/A'}] [HYBRID SEARCH] Résultat #${index + 1}`,
            );
            this.logger.log(
              `PROJECT [${params.projectId || 'N/A'}]   ID: ${chunk.id}`,
            );
            this.logger.log(
              `PROJECT [${params.projectId || 'N/A'}]   Document ID: ${chunk.documentId}`,
            );
            this.logger.log(
              `PROJECT [${params.projectId || 'N/A'}]   Score: ${chunk.score}`,
            );
            this.logger.log(
              `PROJECT [${params.projectId || 'N/A'}]   Page: ${chunk.page}`,
            );
            this.logger.log(
              `PROJECT [${params.projectId || 'N/A'}]   Texte: ${chunk.text.substring(0, 150)}${chunk.text.length > 150 ? '...' : ''}`,
            );

            return {
              id: chunk.id,
              documentId: chunk.documentId,
              text: chunk.text,
              score: chunk.score,
              page: chunk.page,
            } as SearchResultDto;
          },
        );

        this.logger.log(
          `PROJECT [${params.projectId || 'N/A'}] [HYBRID SEARCH] Recherche terminée`,
        );
        return results;
      });

    return {
      results,
      executionTimeMs,
      searchType: 'hybrid',
    };
  }

  /**
   * Vérifie si l'organisation a accès au projet
   * @param projectId ID du projet
   * @param organizationId ID de l'organisation
   * @throws {NotFoundException} Si le projet n'existe pas
   */
  private async checkProjectAccess(projectId: string, organizationId: string) {
    // Utiliser le repository au lieu d'appeler directement Prisma
    const project =
      await this.projectsRepository.findProjectByIdAndOrganization(
        projectId,
        organizationId,
      );

    if (!project) {
      throw new NotFoundException('Projet non trouvé ou accès non autorisé');
    }

    return project;
  }

  /**
   * Récupère tous les chunks d'un document
   * @param documentId ID du document
   * @returns Liste des chunks du document avec leur texte, ordre et page
   */
  async getDocumentChunks(documentId: string): Promise<DocumentChunk[]> {
    try {
      const chunks = await this.chunksRepository.findByDocument(documentId);

      return chunks.map((chunk) => ({
        id: chunk.id,
        text: chunk.text,
        order: chunk.order,
        page: chunk.page,
      }));
    } catch (err) {
      throw new NotFoundException(
        `Impossible de récupérer les chunks du document ${documentId}: ${err instanceof Error ? err.message : 'Erreur inconnue'}`,
      );
    }
  }

  /**
   * Recherche vectorielle sur ReferenceDocument (application_domain_vector)
   */
  async vectorSearchInReferenceDocuments(
    params: SearchRequestDto,
    organizationId: string,
  ): Promise<SearchResponseDto> {
    if (params.projectId) {
      await this.checkProjectAccess(params.projectId, organizationId);
    }

    const vector = await this.embeddingsService.createFromQuery({
      query: params.query,
      projectId: params.projectId,
    });

    // Recherche via ReferenceEmbeddingsService
    const results: SearchSimilarResult[] =
      await this.referenceEmbeddingsService.searchSimilar(
        vector,
        params.limit || 5,
      );

    const resultsDto: SearchResultDto[] = results.map((result) => ({
      id: result.id,
      documentId: result.referenceDocumentId,
      documentTitle: result.referenceDocumentTitle,
      text: result.text,
      score: result.score,
      page: result.page,
    }));

    console.log('results:', JSON.stringify(resultsDto, null, 2));

    return {
      results: resultsDto,
      executionTimeMs: 0,
      searchType: 'vector',
    };
  }
}
