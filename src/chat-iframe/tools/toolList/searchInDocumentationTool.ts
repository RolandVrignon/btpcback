import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { DEFAULT_STREAM_CONFIG } from '@/chat-iframe/tools/streamConfig';
import { ToolResult } from '@/chat-iframe/tools/index';
import { SearchService } from '@/search/search.service';
import { ReferenceDocumentsService } from '@/reference-documents/reference-documents.service';
import { ShortUrlService } from '@/short-url/short-url.service';
const logger = new Logger('SearchInDocumentationTool');

/**
 * Crée un outil pour rechercher dans la documentation de référence (DTU, etc.)
 * @param searchService Service de recherche à utiliser
 * @param organizationId ID de l'organisation
 * @returns La définition de l'outil de recherche dans la documentation
 */
export const createSearchInDocumentationTool = (
  searchService: SearchService,
  referenceDocumentsService: ReferenceDocumentsService,
  projectId: string,
  organizationId: string,
  shortUrlService: ShortUrlService,
  baseRedirectUrl: string,
) => ({
  searchInDocumentation: {
    description:
      "Recherche des informations dans la documentation technique de référence (DTU, normes, etc.) via la recherche vectorielle. Utile pour répondre à des questions spécifiques sur les normes, les DTU, etc en citant les numéros de pages et extraits de texte des documents. Fournit les résultats avec les URL des pages des documents. Pour chaque extrait, cite systématiquement l'URL de la source (Accès direct à la source : …).",
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

        // searchResults.results est de type SearchResultDto[]
        const formattedResults = searchResults.results.map((r) => ({
          text: r.text,
          documentId: r.documentId,
          documentTitle: r.documentTitle,
          score: r.score,
          page: r.page,
          presignedUrl: null,
        }));

        const documentIds = Array.from(
          new Set(formattedResults.map((r) => r.documentId)),
        );
        const presignedUrls: Record<string, string> = {};

        for (const docId of documentIds) {
          presignedUrls[docId] =
            await referenceDocumentsService.getPresignedUrl(docId);
        }

        // Génération des liens courts
        const resultsWithUrls = await Promise.all(
          formattedResults.map(async (r) => {
            const longUrl = presignedUrls[r.documentId]
              ? `${presignedUrls[r.documentId]}#page=${r.page}`
              : null;
            let shortUrl: string | null = null;
            if (longUrl) {
              const id = await shortUrlService.createShortUrl(longUrl);
              shortUrl = `${baseRedirectUrl}/${id}`;
            }
            return {
              ...r,
              presignedUrl: shortUrl,
            };
          }),
        );

        console.log(
          `Results with urls: ${JSON.stringify(resultsWithUrls, null, 2)}`,
        );

        // Utiliser resultsWithUrls pour construire le context avec l'URL de visualisation
        const context = resultsWithUrls
          .map(
            (r) =>
              `Extrait du document ${r.documentId} - ${r.documentTitle} (page ${r.page}):\n${r.text}\n${r.presignedUrl ? `Accès direct au document : ${r.presignedUrl}` : ''}`,
          )
          .join('\n\n');

        logger.debug(`Context: ${context}`);

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
