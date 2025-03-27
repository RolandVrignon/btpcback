import { Logger } from '@nestjs/common';
import { DocumentsService } from '../../../documents/documents.service';
import { SearchService } from '../../../search/search.service';
import { z } from 'zod';
import { DEFAULT_STREAM_CONFIG } from '../streamConfig';
import { ToolResult } from '../index';

const logger = new Logger('ReadDocumentTool');

/**
 * Definition of the document reading tool
 * @param documentsService Document service
 * @param searchService Search service (to access chunks)
 * @param projectId Project ID
 * @returns The definition of the reading tool
 */
export const createReadDocumentTool = (
  documentsService: DocumentsService,
  searchService: SearchService,
  projectId: string,
) => ({
  readDocument: {
    description:
      "Permet de récupérer tout le contenu textuel d'un document spécifique du projet",
    parameters: z.object({
      documentId: z.string().describe('ID du document à lire'),
    }),
    execute: async ({
      documentId,
    }: {
      documentId: string;
    }): Promise<ToolResult> => {
      try {
        logger.debug(`Lecture demandée pour le document: ${documentId}`);

        // Vérifier que le document existe et appartient au projet
        const document = await documentsService.findOne(documentId);

        if (!document) {
          return {
            text: "Document non trouvé. Veuillez vérifier l'ID du document.",
            stream: true,
            config: DEFAULT_STREAM_CONFIG,
            save: false,
            label: 'Lecture du document',
          } as ToolResult;
        }

        if (document.projectId !== projectId) {
          return {
            text: "Ce document n'appartient pas au projet actuel.",
            stream: true,
            config: DEFAULT_STREAM_CONFIG,
            save: false,
            label: 'Lecture du document',
          } as ToolResult;
        }

        // Vérifier que le document est dans un état utilisable
        if (
          document.status !== 'COMPLETED' &&
          document.indexation_status !== 'COMPLETED'
        ) {
          return {
            text: "Ce document n'est pas encore prêt à être lu. Son indexation est peut-être en cours.",
            stream: true,
            config: DEFAULT_STREAM_CONFIG,
            save: false,
            label: 'Lecture du document',
          } as ToolResult;
        }

        // Récupérer tous les chunks du document, ordonnés
        const chunks = await searchService.getDocumentChunks(documentId);

        if (!chunks || chunks.length === 0) {
          return {
            text: "Aucun contenu textuel n'a été trouvé pour ce document.",
            stream: true,
            config: DEFAULT_STREAM_CONFIG,
            save: false,
            label: 'Lecture du document',
          } as ToolResult;
        }

        // Trier les chunks par ordre (si le champ existe)
        const sortedChunks = [...chunks].sort((a, b) => {
          if (a.order !== null && b.order !== null) {
            return a.order - b.order;
          }
          // Si pas d'ordre, on trie par page
          if (a.page !== null && b.page !== null) {
            return a.page - b.page;
          }
          return 0;
        });

        // Concaténer le texte des chunks
        const documentText = sortedChunks
          .map((chunk) => chunk.text)
          .join('\n\n');

        // Informations sur le document pour le résumé
        const documentInfo = `
Titre: ${document.filename}
Type: ${document.mimetype}
Créé le: ${new Date(document.createdAt).toLocaleString()}
Nombre de pages: ${document.metadata_numPages || 'Non disponible'}
ID: ${document.id}
`;

        const responseText = `${documentInfo}\n\nTexte complet du document:\n\n${documentText}`;

        return {
          text: responseText,
          stream: true,
          config: DEFAULT_STREAM_CONFIG,
          save: false,
        } as ToolResult;
      } catch (error) {
        logger.error(
          `Erreur lors de la lecture du document: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        );
        return {
          text: 'Une erreur est survenue lors de la lecture du document.',
          stream: true,
          config: DEFAULT_STREAM_CONFIG,
          save: false,
        } as ToolResult;
      }
    },
  },
});
