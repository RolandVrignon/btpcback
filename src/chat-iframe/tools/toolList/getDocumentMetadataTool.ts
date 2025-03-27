import { Logger } from '@nestjs/common';
import { DocumentsService } from '../../../documents/documents.service';
import { z } from 'zod';
import { DEFAULT_STREAM_CONFIG } from '../streamConfig';
import { ToolResult } from '..';

const logger = new Logger('GetDocumentMetadataTool');

/**
 * Définition de l'outil de récupération des métadonnées AI d'un document
 * @param documentsService Service des documents
 * @param projectId ID du projet
 * @returns La définition de l'outil de récupération des métadonnées
 */
export const createGetDocumentMetadataTool = (
  documentsService: DocumentsService,
  projectId: string,
) => ({
  getDocumentMetadata: {
    description:
      'Récupère les métadonnées AI pour un document spécifique. Dans ces métadonnées, nous trouverons la liste des procédés à risques, les procédés et les matériaux',
    parameters: z.object({
      documentId: z
        .string()
        .describe('ID du document pour lequel récupérer les métadonnées AI'),
    }),
    execute: async ({
      documentId,
    }: {
      documentId: string;
    }): Promise<ToolResult> => {
      try {
        logger.debug(
          `Récupération des métadonnées AI pour le document: ${documentId}`,
        );

        // Récupérer le document
        const document = await documentsService.findOne(documentId);

        // Vérifier si le document existe et appartient au projet actuel
        if (!document) {
          return {
            text: `Aucun document trouvé avec l'ID: ${documentId}`,
            stream: true,
            config: DEFAULT_STREAM_CONFIG,
            save: false,
          } as ToolResult;
        }

        // Vérifier si le document appartient au projet actuel
        if (document.projectId !== projectId) {
          return {
            text: `Le document avec l'ID ${documentId} n'appartient pas au projet actuel.`,
            stream: true,
            config: DEFAULT_STREAM_CONFIG,
            save: false,
          } as ToolResult;
        }

        // Vérifier si les métadonnées AI existent
        if (!document.ai_metadata) {
          return {
            text: `Aucune métadonnée AI disponible pour le document "${document.filename}"`,
            stream: true,
            config: DEFAULT_STREAM_CONFIG,
            save: false,
          } as ToolResult;
        }

        // Formater les métadonnées AI pour l'affichage
        const metadataStr = JSON.stringify(document.ai_metadata, null, 2);

        const responseText = `Métadonnées AI pour le document "${document.filename}" (ID: ${documentId}):\n\n\`\`\`json\n${metadataStr}\n\`\`\``;

        return {
          text: responseText,
          stream: true,
          config: DEFAULT_STREAM_CONFIG,
          save: false,
        };
      } catch (error) {
        logger.error(
          `Erreur lors de la récupération des métadonnées AI: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        );
        return {
          text: 'Une erreur est survenue lors de la récupération des métadonnées AI du document.',
          stream: true,
          config: DEFAULT_STREAM_CONFIG,
          save: false,
        } as ToolResult;
      }
    },
  },
});
