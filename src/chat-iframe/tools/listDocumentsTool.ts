import { Logger } from '@nestjs/common';
import { DocumentsService } from '../../documents/documents.service';
import { z } from 'zod';
import { DEFAULT_STREAM_CONFIG } from './streamConfig';

const logger = new Logger('ListDocumentsTool');

/**
 * Définition de l'outil de listage des documents
 * @param documentsService Service des documents
 * @param projectId ID du projet
 * @returns La définition de l'outil de listage
 */
export const createListDocumentsTool = (
  documentsService: DocumentsService,
  projectId: string,
) => ({
  listProjectDocuments: {
    description: 'Liste tous les documents disponibles dans le projet',
    parameters: z.object({}),
    execute: async () => {
      try {
        logger.debug(`Listage des documents pour le projet: ${projectId}`);

        // Récupérer tous les documents du projet
        const documents = await documentsService.findByProject(projectId);

        if (!documents || documents.length === 0) {
          return {
            text: "Aucun document n'est disponible dans ce projet.",
            stream: true,
            config: DEFAULT_STREAM_CONFIG,
          };
        }

        // Formater la liste des documents
        const formattedList = documents
          .filter((doc) => {
            // Vérifier si le document est prêt à être utilisé
            // Status est un enum, on doit utiliser les valeurs valides COMPLETED, READY, etc.
            return (
              doc.status === 'COMPLETED' ||
              doc.indexation_status === 'COMPLETED'
            );
          })
          .map((doc) => ({
            id: doc.id,
            filename: doc.filename,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            status: doc.status,
            nbPages: doc.metadata_numPages || 'Non disponible',
          }));

        if (formattedList.length === 0) {
          return {
            text: "Le projet contient des documents, mais aucun n'est prêt à être utilisé.",
            stream: true,
            config: DEFAULT_STREAM_CONFIG,
          };
        }

        const documentsList = formattedList
          .map(
            (doc) => `- ${doc.filename} (${doc.nbPages} pages, ID: ${doc.id})`,
          )
          .join('\n');

        const responseText = `Documents disponibles dans le projet:\n\n${documentsList}\n\nVous pouvez rechercher des informations dans ces documents en utilisant l'outil searchDocuments.`;

        return {
          text: responseText,
          stream: true,
          config: DEFAULT_STREAM_CONFIG,
        };
      } catch (error) {
        logger.error(
          `Erreur lors du listage des documents: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        );
        return {
          text: 'Une erreur est survenue lors de la récupération de la liste des documents.',
          stream: true,
          config: DEFAULT_STREAM_CONFIG,
        };
      }
    },
  },
});
