import { Logger } from '@nestjs/common';
import { DEFAULT_STREAM_CONFIG } from './streamConfig';
import { z } from 'zod';
import { DeliverableType } from '@prisma/client';
import { DeliverablesService } from '../../deliverables/deliverables.service';
import { OrganizationEntity } from '../../types';
import { CreateDeliverableDto } from '../../deliverables/dto/create-deliverable.dto';
import { DeliverableEntity } from '../../deliverables/entities/deliverable.entity';

const logger = new Logger('GetDeliverableTool');

/**
 * Crée un outil pour générer et récupérer un délivrable
 * @param deliverablesService Service de délivrables pour appeler directement la méthode
 * @param projectId ID du projet actuel
 * @param organization Organisation qui fait la demande
 * @returns L'outil pour générer et récupérer des délivrables
 */
export const createGetDeliverableTool = (
  deliverablesService: DeliverablesService,
  projectId: string,
  organization: OrganizationEntity,
) => ({
  getDeliverable: {
    description:
      'Génère et récupère un délivrable du projet (avec un timeout de 5 minutes)',
    parameters: z.object({
      type: z
        .enum([
          'DOCUMENTS_PUBLIQUES',
          'GEORISQUES',
          'DESCRIPTIF_SOMMAIRE_DES_TRAVAUX',
          'TABLEAU_DES_DOCUMENTS_EXAMINES',
          'COMPARATEUR_INDICES',
          'ANALYSE_ETHUDE_THERMIQUE',
          'INCOHERENCE_DE_DONNEES',
        ] as const)
        .describe('Type de délivrable à générer'),
      documentIds: z
        .array(z.string())
        .describe('Liste des IDs des documents à utiliser (optionnel)')
        .default([])
        .optional(),
    }),
    execute: async ({
      type,
      documentIds = [],
    }: {
      type: DeliverableType;
      documentIds?: string[];
    }) => {
      try {
        logger.debug(
          `Génération d'un délivrable de type ${type} pour le projet ${projectId}`,
        );

        // Créer le DTO pour la requête
        const createDeliverableDto: CreateDeliverableDto = {
          projectId,
          type,
          documentIds,
        };

        logger.debug(
          `Création du délivrable avec le DTO: ${JSON.stringify(
            createDeliverableDto,
          )}`,
        );

        const isNewlyCreated = (deliverable: DeliverableEntity) => {
          const currentTime = new Date();
          const deliverableCreatedAt = new Date(deliverable.createdAt);
          const oneMinuteAgo = new Date(currentTime.getTime() - 60 * 1000);

          // Return true if the deliverable was created within the last minute
          return deliverableCreatedAt > oneMinuteAgo;
        };

        // Appeler directement le service au lieu de faire une requête HTTP
        const result =
          await deliverablesService.findOrCreateAndWaitForDeliverable(
            createDeliverableDto,
            organization,
          );

        // Construire la réponse
        const response = `
# Délivrable ${
          isNewlyCreated(result) ? 'généré' : 'récupéré'
        } avec succès: Type ${result.type}, ID ${result.id}, Statut ${
          result.status
        }${documentIds.length ? `, Documents utilisés: ${documentIds.join(', ')}` : ''}
        `.trim();

        return {
          text: response,
          stream: true,
          config: DEFAULT_STREAM_CONFIG,
        };
      } catch (error) {
        logger.error(
          `Erreur lors de la génération du délivrable: ${
            error instanceof Error ? error.message : 'Erreur inconnue'
          }`,
        );
        return {
          text: `Une erreur est survenue lors de la génération du délivrable: ${
            error instanceof Error ? error.message : 'Erreur inconnue'
          }`,
          stream: true,
          config: DEFAULT_STREAM_CONFIG,
        };
      }
    },
  },
});
