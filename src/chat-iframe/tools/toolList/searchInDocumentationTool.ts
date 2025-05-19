import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { DEFAULT_STREAM_CONFIG } from '@/chat-iframe/tools/streamConfig';
import { ToolResult } from '@/chat-iframe/tools/index';
import { SearchService } from '@/search/search.service';

const logger = new Logger('SearchInDocumentationTool');

/**
 * Crée un outil pour rechercher dans la documentation de référence (DTU, etc.)
 * @param searchService Service de recherche à utiliser
 * @param organizationId ID de l'organisation
 * @returns La définition de l'outil de recherche dans la documentation
 */
export const createSearchInDocumentationTool = (
  searchService: SearchService,
  projectId: string,
  organizationId: string,
) => ({
  searchInDocumentation: {
    description:
      'Recherche des informations dans la documentation technique de référence (DTU, normes, etc.) via la recherche vectorielle.',
    parameters: z.object({
      query: z.string().describe('La requête de recherche'),
      limit: z.number().min(1).max(20).default(5).optional(),
    }),
    execute: async ({
      query,
      limit = 5,
    }: {
      query: string;
      limit?: number;
    }): Promise<ToolResult> => {
      try {
        logger.debug(
          `Recherche vectorielle dans la documentation de référence: ${query}`,
        );
        const searchResults =
          await searchService.vectorSearchInReferenceDocuments(
            {
              query,
              limit,
              projectId,
            },
            organizationId,
          );

        // Formater les résultats pour le LLM
        const formattedResults = searchResults.results.map((r) => ({
          text: r.text,
          documentId: r.documentId,
          score: r.score,
          page: r.page,
        }));

        const context = formattedResults
          .map(
            (r) =>
              `Extrait du document ${r.documentId} (page ${r.page}):\n${r.text}`,
          )
          .join('\n\n');

        const responseText =
          context.length > 0
            ? context
            : 'Aucune information pertinente trouvée dans la documentation de référence.';

        return {
          text: responseText,
          stream: true,
          config: DEFAULT_STREAM_CONFIG,
          save: false,
          label: 'Recherche dans la documentation de référence',
        } as ToolResult;
      } catch (error) {
        logger.error(
          `Erreur lors de la recherche dans la documentation de référence: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        );
        return {
          text: 'Une erreur est survenue lors de la recherche dans la documentation de référence.',
          stream: true,
          config: DEFAULT_STREAM_CONFIG,
          save: false,
          label: 'Recherche dans la documentation de référence',
        } as ToolResult;
      }
    },
  },
});
