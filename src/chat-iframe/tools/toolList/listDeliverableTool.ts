import { Logger } from '@nestjs/common';
import { DEFAULT_STREAM_CONFIG } from '../streamConfig';
import { z } from 'zod';
import { DeliverableType } from '@prisma/client';

const logger = new Logger('ListDeliverableTool');

/**
 * Crée un outil pour lister tous les types de délivrables disponibles
 * @returns L'outil pour lister les types de délivrables
 */
export const createListDeliverableTool = () => ({
  listDeliverables: {
    description: 'Liste tous les types de délivrables disponibles',
    parameters: z.object({}),
    execute: async () => {
      try {
        logger.debug('Récupération de la liste des types de délivrables');

        // Convertir l'enum en tableau de valeurs
        const deliverableTypes = Object.values(DeliverableType);

        // Créer une description pour chaque type
        const deliverableDescriptions = deliverableTypes.map((type) => ({
          type,
          description: getDeliverableDescription(type),
        }));

        return {
          text: 'Voici la liste des types de délivrables disponibles :',
          stream: true,
          config: DEFAULT_STREAM_CONFIG,
          toolCallData: {
            name: 'jsonToMarkdown',
            arguments: {
              json: deliverableDescriptions,
              title: 'Types de Délivrables',
            },
          },
        };
      } catch (error) {
        logger.error(
          `Erreur lors de la récupération des types de délivrables: ${
            error instanceof Error ? error.message : 'Erreur inconnue'
          }`,
        );
        return {
          text: `Une erreur est survenue lors de la récupération des types de délivrables: ${
            error instanceof Error ? error.message : 'Erreur inconnue'
          }`,
          stream: true,
          config: DEFAULT_STREAM_CONFIG,
        };
      }
    },
  },
});

/**
 * Retourne une description humaine pour chaque type de délivrable
 * @param type Le type de délivrable
 * @returns La description du type de délivrable
 */
function getDeliverableDescription(type: DeliverableType): string {
  const descriptions: Record<DeliverableType, string> = {
    DOCUMENTS_PUBLIQUES:
      'Liste des documents publics disponibles type PLU, Carte Bruit, etc.',
    GEORISQUES: 'Analyse des risques géologiques du terrain',
    DESCRIPTIF_SOMMAIRE_DES_TRAVAUX:
      'Description sommaire des travaux à réaliser',
    TABLEAU_DES_DOCUMENTS_EXAMINES:
      'Tableau récapitulatif des documents examinés',
    COMPARATEUR_INDICES: 'Comparaison des indices',
    ANALYSE_ETHUDE_THERMIQUE: "Analyse de l'étude thermique",
    INCOHERENCE_DE_DONNEES: 'Rapport des incohérences de données',
  };
  return descriptions[type] || 'Description non disponible';
}
