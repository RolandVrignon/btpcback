import { Logger } from '@nestjs/common';
import { DocumentsService } from '../../../documents/documents.service';
import { z } from 'zod';
import { DEFAULT_STREAM_CONFIG } from '../streamConfig';
import { ToolResult } from '../index';

const logger = new Logger('GetDocumentViewUrlTool');

/**
 * Définition de l'outil pour récupérer l'URL de visualisation d'un document
 * @param documentsService Service des documents
 * @param projectId ID du projet
 * @param organizationId ID de l'organisation
 * @returns La définition de l'outil
 */
export const createGetDocumentViewUrlTool = (
  documentsService: DocumentsService,
  projectId: string,
  organizationId: string,
) => ({
  getDocumentViewUrl: {
    description:
      "Récupère l'URL pour visualiser un document spécifique dans l'interface utilisateur",
    parameters: z.object({
      documentId: z.string().describe('ID du document à visualiser'),
    }),
    execute: async ({
      documentId,
    }: {
      documentId: string;
    }): Promise<ToolResult> => {
      try {
        logger.debug(
          `Récupération de l'URL de visualisation pour le document: ${documentId}`,
        );

        // Vérifier que le document existe et appartient au projet
        const document = await documentsService.findOne(documentId);

        if (!document) {
          return {
            text: "Document non trouvé. Veuillez vérifier l'ID du document.",
            stream: true,
            config: DEFAULT_STREAM_CONFIG,
            save: false,
            label: "Récupération de l'URL de visualisation du document",
          } as ToolResult;
        }

        if (document.projectId !== projectId) {
          return {
            text: "Ce document n'appartient pas au projet actuel.",
            stream: true,
            config: DEFAULT_STREAM_CONFIG,
            save: false,
            label: "Récupération de l'URL de visualisation du document",
          } as ToolResult;
        }

        // Générer l'URL de visualisation du document
        const viewUrl = `/organization/${organizationId}/project/${projectId}/documents/${documentId}`;

        return {
          text: `URL de visualisation du document "${document.filename}":\n\n${viewUrl}\n\nVous pouvez copier ce lien dans votre navigateur pour accéder au document.`,
          stream: true,
          config: DEFAULT_STREAM_CONFIG,
          save: false,
          label: "Récupération de l'URL de visualisation du document",
        } as ToolResult;
      } catch (error) {
        logger.error(
          `Erreur lors de la récupération de l'URL: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        );
        return {
          text: "Une erreur est survenue lors de la récupération de l'URL de visualisation du document.",
          stream: true,
          config: DEFAULT_STREAM_CONFIG,
          save: false,
          label: "Récupération de l'URL de visualisation du document",
        } as ToolResult;
      }
    },
  },
});
