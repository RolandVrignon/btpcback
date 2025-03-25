import { Logger } from '@nestjs/common';
import { DocumentsService } from '../../../documents/documents.service';
import { z } from 'zod';
import { DEFAULT_STREAM_CONFIG } from '../streamConfig';

const logger = new Logger('GetDocumentViewUrlTool');

/**
 * Definition of document view URL retrieval tool
 * @param documentsService Documents service
 * @param projectId Project ID
 * @param organizationId Organization ID
 * @returns The document view URL tool definition
 */
export const createGetDocumentViewUrlTool = (
  documentsService: DocumentsService,
  projectId: string,
  organizationId: string,
) => ({
  getDocumentViewUrl: {
    description:
      'Récupère une URL présignée pour visualiser un document spécifique. Cette URL est temporaire et valide pour une durée limitée.',
    parameters: z.object({
      fileName: z.string().describe('Nom du fichier à visualiser'),
    }),
    execute: async ({ fileName }: { fileName: string }) => {
      try {
        logger.debug(
          `Génération d'URL de visualisation pour le fichier: ${fileName} dans le projet: ${projectId}`,
        );

        // Préparer les données pour la requête
        const viewDocumentDto = {
          fileName,
          projectId,
        };

        // Récupérer l'URL de visualisation
        const viewUrlResponse = await documentsService.getViewUrl(
          viewDocumentDto,
          organizationId,
        );

        // Formater la réponse
        const responseText = `URL de visualisation pour le document "${fileName}":\n\n${viewUrlResponse.url}\n\nCette URL est valide pour ${viewUrlResponse.expiresIn} secondes.`;

        return {
          text: responseText,
          stream: true,
          config: DEFAULT_STREAM_CONFIG,
        };
      } catch (error) {
        logger.error(
          `Erreur lors de la génération de l'URL de visualisation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        );
        return {
          text: "Une erreur est survenue lors de la génération de l'URL de visualisation du document.",
          stream: true,
          config: DEFAULT_STREAM_CONFIG,
        };
      }
    },
  },
});
