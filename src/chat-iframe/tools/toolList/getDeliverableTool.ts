import { Logger } from '@nestjs/common';
import { DEFAULT_STREAM_CONFIG } from '../streamConfig';
import { z } from 'zod';
import { DeliverableType } from '@prisma/client';
import { DeliverablesService } from '../../../deliverables/deliverables.service';
import { OrganizationEntity } from '../../../types';
import { CreateDeliverableDto } from '../../../deliverables/dto/create-deliverable.dto';
import { DeliverableEntity } from '../../../deliverables/entities/deliverable.entity';
import { ToolResult } from '../index';

const logger = new Logger('GetDeliverableTool');

const DeliverableEnum = z.nativeEnum(DeliverableType);

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
      type: DeliverableEnum.describe('Type de délivrable à générer'),
      documentIds: z
        .array(z.string())
        .describe(
          "Liste des IDs des documents à utiliser. Demander à l'utilisateur si tu as un doute concernant des paramètres manquants. Par défaut, on utilise tous les documents du projet mais à confirmer par l'utilisateur.",
        )
        .default([])
        .optional(),
    }),
    execute: async ({
      type,
      documentIds = [],
    }: {
      type: DeliverableType;
      documentIds?: string[];
    }): Promise<ToolResult> => {
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

        const isNewlyCreated = (deliverable: DeliverableEntity): boolean => {
          // Si le délivrable a été créé il y a moins de 5 minutes, considérer qu'il est nouveau
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          return new Date(deliverable.createdAt) > fiveMinutesAgo;
        };

        // Appeler directement le service au lieu de faire une requête HTTP
        const result =
          await deliverablesService.findOrCreateAndWaitForDeliverable(
            createDeliverableDto,
            organization,
          );

        // Construire la réponse
        const responseText = isNewlyCreated(result)
          ? `Un nouveau délivrable de type ${type} a été généré avec succès. ID: ${result.id}`
          : `Un délivrable existant de type ${type} a été réutilisé. ID: ${result.id}`;

        // Si short_result existe, le convertir directement en Markdown
        if (result.short_result) {
          logger.debug(`Type de short_result: ${typeof result.short_result}`);
          logger.debug(
            `Contenu de short_result: ${JSON.stringify(result.short_result).substring(0, 200)}...`,
          );

          // Informer que nous retournons le contenu formaté directement
          return {
            text: `${responseText}\n\nVoici le contenu formaté du délivrable:`,
            stream: true,
            config: DEFAULT_STREAM_CONFIG,
            save: true,
            toolCallData: {
              name: 'jsonToMarkdown',
              arguments: {
                json: result.short_result,
                title: `Délivrable ${type}`,
              },
            },
          } as ToolResult;
        }

        // Si pas de short_result, retourner juste le message de base
        return {
          text: responseText,
          stream: true,
          config: DEFAULT_STREAM_CONFIG,
          state: 'result',
          save: true,
        } as ToolResult;
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
          save: false,
        } as ToolResult;
      }
    },
  },
});
