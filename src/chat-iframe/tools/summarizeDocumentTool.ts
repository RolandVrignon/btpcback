import { Logger } from '@nestjs/common';
import { DocumentsService } from '../../documents/documents.service';
import { SearchService } from '../../search/search.service';
import { z } from 'zod';
import { DEFAULT_STREAM_CONFIG } from './streamConfig';

const logger = new Logger('SummarizeDocumentTool');

/**
 * Définition de l'outil de résumé de document
 * @param documentsService Service des documents
 * @param searchService Service de recherche (pour accéder aux chunks)
 * @param projectId ID du projet
 * @param organizationId ID de l'organisation
 * @returns La définition de l'outil de résumé
 */
export const createSummarizeDocumentTool = (
  documentsService: DocumentsService,
  searchService: SearchService,
  projectId: string,
) => ({
  summarizeDocument: {
    description:
      "Génère un résumé d'un document spécifique du projet en se basant sur son contenu complet",
    parameters: z.object({
      documentId: z.string().describe('ID du document à résumer'),
    }),
    execute: async ({ documentId }: { documentId: string }) => {
      try {
        logger.debug(`Résumé demandé pour le document: ${documentId}`);

        // Vérifier que le document existe et appartient au projet
        const document = await documentsService.findOne(documentId);

        if (!document) {
          return "Document non trouvé. Veuillez vérifier l'ID du document.";
        }

        if (document.projectId !== projectId) {
          return "Ce document n'appartient pas au projet actuel.";
        }

        // Vérifier que le document est dans un état utilisable
        if (
          document.status !== 'COMPLETED' &&
          document.indexation_status !== 'COMPLETED'
        ) {
          return "Ce document n'est pas encore prêt à être résumé. Son indexation est peut-être en cours.";
        }

        // Récupérer tous les chunks du document, ordonnés
        const chunks = await searchService.getDocumentChunks(documentId);

        if (!chunks || chunks.length === 0) {
          return "Aucun contenu textuel n'a été trouvé pour ce document.";
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

        const responseText = `${documentInfo}\n\nTexte complet du document pour résumé:\n\n${documentText}`;

        return {
          text: responseText,
          stream: true,
          config: DEFAULT_STREAM_CONFIG,
        };
      } catch (error) {
        logger.error(
          `Erreur lors de la génération du résumé: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        );
        return {
          text: 'Une erreur est survenue lors de la génération du résumé du document.',
          stream: true,
          config: DEFAULT_STREAM_CONFIG,
        };
      }
    },
  },
});
