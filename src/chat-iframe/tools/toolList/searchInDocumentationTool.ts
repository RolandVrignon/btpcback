import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { DEFAULT_STREAM_CONFIG } from '@/chat-iframe/tools/streamConfig';
import { ToolResult } from '@/chat-iframe/tools/index';
import { SearchService } from '@/search/search.service';
import { ReferenceDocumentsService } from '@/reference-documents/reference-documents.service';
import { ShortUrlService } from '@/short-url/short-url.service';
import { Project } from '@prisma/client';
import { generateText } from 'ai';
const logger = new Logger('SearchInDocumentationTool');
import { model } from '@/chat-iframe/tools/streamConfig';
import { ProjectsService } from '@/projects/projects.service';
import { UsageService } from '@/usage/usage.service';

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
  projectsService: ProjectsService,
  usageService: UsageService,
) => ({
  searchInDocumentation: {
    description:
      "Recherche des informations dans la documentation technique de référence (DTU, normes, etc.) via la recherche vectorielle. Utile pour répondre à des questions spécifiques sur les normes, les DTU, etc en citant les numéros de pages et extraits de texte des documents. Fournit les résultats avec les URL des pages des documents. Pour chaque extrait, cite systématiquement l'URL de la source (Accès direct à la source : …).",
    parameters: z.object({
      query: z.string().describe('La requête de recherche.'),
      limit: z.number().min(1).max(10).default(5).optional(),
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

        let project: Project | null = null;
        let enhancedQuery: string | null = query;

        try {
          project = await projectsService.findOne(projectId);
        } catch {
          logger.error(`SearchInDocumentationTool: Projet non trouvé.`);
        }

        if (project) {
          // Extract relevant fields
          const name = project.name || '';
          const summary = project.long_summary || '';
          const address = project.closest_formatted_address || '';
          const altitude =
            project.altitude !== undefined && project.altitude !== null
              ? `Altitude: ${project.altitude}m`
              : '';

          // Build the application domain string
          const parts = [name, address, altitude, summary].filter(Boolean);
          const domain = parts.length > 0 ? parts.join(' | ') : '';

          // Prompt for the LLM
          const systemPrompt = `Tu es un assistant expert en ingénierie et réglementation technique du bâtiment. Ta tâche est de rédiger un paragraphe synthétique qui reformule la requête utilisateur en l'enrichissant avec le contexte technique du projet fourni. Le résultat doit être une requête de recherche incluant le domaine d'application, c'est-à-dire le contexte technique du projet : type de bâtiment (individuel, collectif, tertiaire…), nature des travaux (neuf ou rénovation), localisation géographique (région, altitude, zone climatique), et contraintes spécifiques (exposition au vent, sismicité, etc.). Je ne veux pas de titre ou de phrase d'introduction, juste la requête enrichie. Ce texte va servir de contexte pour la recherche vectorielle.`;
          const humanPrompt = `Requête utilisateur : ${query}\nContexte du projet : ${domain}`;

          // Call the LLM
          const result = await generateText({
            model: model.sdk,
            system: systemPrompt,
            prompt: humanPrompt,
          });

          console.log('result', JSON.stringify(result, null, 2));

          // Log usage statistics
          logger.debug('LLM usage:', JSON.stringify(result.usage));

          // Save usage in the database
          if (result.usage) {
            const usage = await usageService.logTextToTextUsage(
              model.provider,
              model.model,
              result.usage,
              projectId,
            );
            logger.debug('Usage saved:', JSON.stringify(usage));
          }

          enhancedQuery = result.text;
        }

        console.log('enhancedQuery', enhancedQuery);

        const searchResults =
          await searchService.vectorSearchInReferenceDocuments(
            {
              query: enhancedQuery,
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
              shortUrl = `${baseRedirectUrl}/${id}#page=${r.page}`;
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
