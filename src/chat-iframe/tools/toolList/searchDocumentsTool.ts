import { Logger } from '@nestjs/common';

import { SearchService } from '@/search/search.service';
import { z } from 'zod';
import { DEFAULT_STREAM_CONFIG } from '@/chat-iframe/tools/streamConfig';
import { ToolResult } from '@/chat-iframe/tools/index';

const logger = new Logger('SearchDocumentsTool');

/**
 * Définition de l'outil de recherche de documents
 * @param searchService Service de recherche à utiliser
 * @param projectId ID du projet
 * @param organizationId ID de l'organisation
 * @returns La définition de l'outil de recherche
 */
export const createSearchDocumentsTool = (
  searchService: SearchService,
  projectId: string,
  organizationId: string,
) => ({
  searchDocuments: {
    description:
      'Recherche des informations parmis tous les documents du projet',
    parameters: z.object({
      query: z.string().describe('La requête de recherche'),
    }),
    execute: async ({ query }: { query: string }): Promise<ToolResult> => {
      try {
        logger.debug(`Exécution de la recherche RAG avec la requête: ${query}`);
        const searchResults = await searchService.vectorSearch(
          {
            query,
            projectId,
            limit: 10,
          },
          organizationId,
        );

        // Formater les résultats pour les rendre plus faciles à utiliser par le LLM
        const formattedResults = searchResults.results.map((r) => ({
          text: r.text,
          page: r.page,
          documentId: r.documentId,
          score: r.score,
        }));

        // Créer un contexte à partir des résultats pour le modèle
        const context = formattedResults
          .map(
            (r) =>
              `Extrait du document ${r.documentId} (page ${r.page}):\n${r.text}`,
          )
          .join('\n\n');

        const responseText =
          context.length > 0
            ? context
            : 'Aucune information pertinente trouvée dans les documents du projet.';

        return {
          text: responseText,
          stream: true,
          config: DEFAULT_STREAM_CONFIG,
          save: false,
          label: 'Recherche dans les documents',
        } as ToolResult;
      } catch (error) {
        logger.error(
          `Erreur lors de la recherche RAG: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        );
        return {
          text: 'Une erreur est survenue lors de la recherche dans les documents.',
          stream: true,
          config: DEFAULT_STREAM_CONFIG,
          save: false,
          label: 'Recherche dans les documents',
        } as ToolResult;
      }
    },
  },
});
