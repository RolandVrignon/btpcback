import { Logger } from '@nestjs/common';

import { DocumentsService } from '@/documents/documents.service';
import { z } from 'zod';
import { DEFAULT_STREAM_CONFIG } from '@/chat-iframe/tools/streamConfig';
import { ToolResult } from '@/chat-iframe/tools/index';

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
    execute: async (): Promise<ToolResult> => {
      try {
        logger.debug(`Listage des documents pour le projet: ${projectId}`);

        // Récupérer tous les documents du projet
        const documents = await documentsService.findByProject(projectId);

        if (!documents || documents.length === 0) {
          return {
            text: "Aucun document n'est disponible dans ce projet.",
            stream: true,
            config: DEFAULT_STREAM_CONFIG,
            save: false,
            label: 'Lister les documents',
          } as ToolResult;
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
            lots: doc.ai_lot_identification,
            typeDocument: doc.ai_Type_document,
            typeBatiment: doc.ai_Type_batiment,
            typeOperation: doc.ai_Type_operation,
            phaseProjet: doc.ai_Phase_projet,
            category:
              doc.category === 'PROJECT'
                ? 'Le document est lié au projet'
                : "Le document n'est pas lié au projet",
          }));

        if (formattedList.length === 0) {
          return {
            text: "Le projet contient des documents, mais aucun n'est prêt à être utilisé.",
            stream: true,
            config: DEFAULT_STREAM_CONFIG,
            save: false,
            label: 'Lister les documents',
          } as ToolResult;
        }

        const documentsList = formattedList
          .map(
            (doc) =>
              `- ${doc.filename} (${doc.nbPages} pages, ID: ${doc.id}, lot ${JSON.stringify(doc.lots)}, type de document ${JSON.stringify(doc.typeDocument)}, type de batiment ${JSON.stringify(doc.typeBatiment)}, type d'opération ${JSON.stringify(doc.typeOperation)}, phase du projet ${JSON.stringify(doc.phaseProjet)}, catégorie ${JSON.stringify(doc.category)})`,
          )
          .join('\n');

        logger.debug('documentsList', documentsList);

        const responseText = `Documents disponibles dans le projet:\n\n${documentsList}\n\nVous pouvez rechercher des informations dans ces documents en utilisant l'outil searchDocuments.`;

        return {
          text: responseText,
          stream: true,
          config: DEFAULT_STREAM_CONFIG,
          state: 'result',
          save: true,
          label: 'Lister les documents',
        } as ToolResult;
      } catch (error) {
        logger.error(
          `Erreur lors du listage des documents: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        );
        return {
          text: 'Une erreur est survenue lors de la récupération de la liste des documents.',
          stream: true,
          config: DEFAULT_STREAM_CONFIG,
          save: false,
          label: 'Lister les documents',
        } as ToolResult;
      }
    },
  },
});
