import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { SearchRequestDto, SearchResponseDto, SearchResultDto } from './dto';
import { Prisma, Project } from '@prisma/client';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

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

@Injectable()
export class SearchService {
  private readonly embeddingModel = 'text-embedding-3-small';
  private readonly embeddingVersion = 'v1';

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingsService: EmbeddingsService,
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

    console.log(`[VECTOR SEARCH] Recherche pour: "${params.query}"`);

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
          // Si documentId est renseigné, on limite la recherche à ce document (prioritaire)
          console.log(
            `[VECTOR SEARCH] Scope limité au document: ${params.documentId}`,
          );
          scopeFilter.documentId = params.documentId;
        } else if (params.projectId) {
          // Si documentId est null mais projectId est renseigné, on étend la recherche à tous les documents du projet
          console.log(
            `[VECTOR SEARCH] Scope étendu au projet: ${params.projectId}`,
          );
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

        console.log(
          `[VECTOR SEARCH] Nombre de résultats: ${Array.isArray(searchResults) ? searchResults.length : 0}`,
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
          console.log(`[VECTOR SEARCH] Résultat:`);
          console.log(`  ID: ${result.id}`);
          console.log(`  Document ID: ${result.documentId}`);
          console.log(`  Score: ${result.similarity}`);
          console.log(
            `  Texte: ${result.text.substring(0, 150)}${result.text.length > 150 ? '...' : ''}`,
          );

          return {
            id: result.id,
            documentId: result.documentId,
            text: result.text,
            score: result.similarity,
            page: result.page,
          } as SearchResultDto;
        });

        console.log(`[VECTOR SEARCH] Recherche terminée`);
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

    console.log(`[SEMANTIC SEARCH] Recherche pour: "${params.query}"`);

    // Vérifier l'accès au projet si un projectId est fourni
    if (params.projectId) {
      await this.checkProjectAccess(params.projectId, organizationId);
    }

    const { result: results, executionTimeMs } =
      await this.measureExecutionTime(async () => {
        // Construire la requête de base qui recherche directement dans les chunks
        let query = Prisma.sql`
          SELECT c.id, c."documentId", c.text, c.page,
                 ts_rank_cd(to_tsvector('french', c.text), plainto_tsquery('french', ${params.query})) AS score
          FROM "Chunk" c
          JOIN "Document" d ON c."documentId" = d.id
          JOIN "Project" p ON d."projectId" = p.id
          WHERE to_tsvector('french', c.text) @@ plainto_tsquery('french', ${params.query})
        `;

        // Ajouter des filtres conditionnels selon la priorité
        if (params.documentId) {
          // Si documentId est renseigné, on limite la recherche à ce document (prioritaire)
          console.log(
            `[SEMANTIC SEARCH] Scope limité au document: ${params.documentId}`,
          );
          query = Prisma.sql`
            ${query} AND c."documentId" = ${params.documentId}
          `;
        } else if (params.projectId) {
          // Si documentId est null mais projectId est renseigné, on étend la recherche à tous les documents du projet
          console.log(
            `[SEMANTIC SEARCH] Scope étendu au projet: ${params.projectId}`,
          );
          query = Prisma.sql`
            ${query} AND d."projectId" = ${params.projectId}
          `;
        }

        // Ajouter le tri et la limite
        query = Prisma.sql`
          ${query} ORDER BY score DESC
          LIMIT ${params.limit || 5}
        `;

        console.log(
          `[SEMANTIC SEARCH] Exécution de la requête full-text sur les chunks`,
        );

        // Exécuter la requête
        const chunks = await this.prisma.$queryRaw(query);

        console.log(
          `[SEMANTIC SEARCH] Nombre de résultats: ${Array.isArray(chunks) ? chunks.length : 0}`,
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
            console.log(`[SEMANTIC SEARCH] Résultat #${index + 1}:`);
            console.log(`  ID: ${chunk.id}`);
            console.log(`  Document ID: ${chunk.documentId}`);
            console.log(`  Score: ${chunk.score}`);
            console.log(`  Page: ${chunk.page}`);
            console.log(
              `  Texte: ${chunk.text.substring(0, 150)}${chunk.text.length > 150 ? '...' : ''}`,
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

        console.log(`[SEMANTIC SEARCH] Recherche terminée`);
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

    console.log(`[HYBRID SEARCH] Recherche pour: "${params.query}"`);

    const { result: results, executionTimeMs } =
      await this.measureExecutionTime(async () => {
        // Utiliser la recherche full-text pour trouver des chunks similaires
        const searchResults = await this.embeddingsService.searchFullText(
          params.query,
          100,
        );

        console.log('searchResults:', searchResults);

        console.log(
          `[HYBRID SEARCH] Nombre de résultats initiaux: ${Array.isArray(searchResults) ? searchResults.length : 0}`,
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
        console.log('firstResult:', firstResult);
        const referenceChunkId = firstResult?.id;
        console.log('referenceChunkId:', referenceChunkId);

        console.log(
          `[HYBRID SEARCH] ID du chunk de référence: ${referenceChunkId}`,
        );

        if (!referenceChunkId) {
          throw new BadRequestException(
            'Impossible de trouver un chunk de référence',
          );
        }

        // Construire la requête hybride
        let query = Prisma.sql`
          SELECT c.id, c."documentId", c.text, c.page,
                 (0.7 * (1 - (e.vector <=> (SELECT vector FROM "Embedding" WHERE "chunkId" = ${referenceChunkId} AND "modelName" = ${this.embeddingModel} AND "modelVersion" = ${this.embeddingVersion})::vector)) +
                  0.3 * ts_rank_cd(to_tsvector('french', c.text), plainto_tsquery('french', ${params.query}))) AS score
          FROM "Chunk" c
          JOIN "Embedding" e ON c.id = e."chunkId"
          JOIN "Document" d ON c."documentId" = d.id
          JOIN "Project" p ON d."projectId" = p.id
          WHERE p."organizationId" = ${organizationId}
          AND e."modelName" = ${this.embeddingModel}
          AND e."modelVersion" = ${this.embeddingVersion}
        `;

        // Ajouter des filtres conditionnels selon la priorité
        if (params.documentId) {
          // Si documentId est renseigné, on limite la recherche à ce document (prioritaire)
          console.log(
            `[HYBRID SEARCH] Scope limité au document: ${params.documentId}`,
          );
          query = Prisma.sql`
            ${query} AND c."documentId" = ${params.documentId}
          `;
        } else if (params.projectId) {
          // Si documentId est null mais projectId est renseigné, on étend la recherche à tous les documents du projet
          console.log(
            `[HYBRID SEARCH] Scope étendu au projet: ${params.projectId}`,
          );
          query = Prisma.sql`
            ${query} AND d."projectId" = ${params.projectId}
          `;
        }

        // Ajouter le tri et la limite
        query = Prisma.sql`
          ${query} ORDER BY score DESC
          LIMIT ${params.limit || 5}
        `;

        console.log(`[HYBRID SEARCH] Exécution de la requête hybride`);

        // Exécuter la requête
        const chunks = await this.prisma.$queryRaw(query);

        console.log(
          `[HYBRID SEARCH] Nombre de résultats finaux: ${Array.isArray(chunks) ? chunks.length : 0}`,
        );

        // Transformer les résultats
        const results = (chunks as SemanticSearchResult[]).map(
          (chunk: SemanticSearchResult, index: number) => {
            console.log(`[HYBRID SEARCH] Résultat #${index + 1}:`);
            console.log(`  ID: ${chunk.id}`);
            console.log(`  Document ID: ${chunk.documentId}`);
            console.log(`  Score: ${chunk.score}`);
            console.log(`  Page: ${chunk.page}`);
            console.log(
              `  Texte: ${chunk.text.substring(0, 150)}${chunk.text.length > 150 ? '...' : ''}`,
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

        console.log(`[HYBRID SEARCH] Recherche terminée`);
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
   * @throws {ForbiddenException} Si l'organisation n'a pas accès au projet
   */
  private async checkProjectAccess(projectId: string, organizationId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        organization: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Projet non trouvé');
    }

    // Le type Project de Prisma n'inclut pas organizationId directement
    // mais il est présent dans le résultat de la requête
    interface ProjectWithOrg extends Project {
      organizationId: string;
    }

    const projectWithOrg = project as ProjectWithOrg;
    if (projectWithOrg.organizationId !== organizationId) {
      throw new ForbiddenException('Accès non autorisé à ce projet');
    }

    return project;
  }
}
