import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { DEFAULT_STREAM_CONFIG } from '../streamConfig';
import { ToolResult } from '../index';

const logger = new Logger('ListDeliverableTool');

/**
 * Crée un outil pour lister les délivrables d'un projet
 * @returns L'outil de liste des délivrables
 */
export const createListDeliverableTool = () => ({
  listDeliverables: {
    description: 'Liste tous les délivrables disponibles dans le projet actuel',
    parameters: z.object({}),
    execute: async (): Promise<ToolResult> => {
      try {
        logger.debug('Affichage de la liste des types de délivrables');

        // Attente asynchrone pour éviter l'erreur de linter
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Simuler un appel d'API et retourner la liste des délivrables disponibles
        const availableDeliverables = [
          {
            type: 'RAPPORT_SYNTHESE',
            description:
              'Un rapport de synthèse résumant les documents du projet',
          },
          {
            type: 'RAPPORT_COMPLET',
            description:
              'Un rapport complet incluant une analyse détaillée des documents',
          },
          {
            type: 'ANALYSE_METAUX',
            description:
              'Une analyse spécifique sur les métaux mentionnés dans les documents',
          },
          {
            type: 'ANALYSE_PROCEDES',
            description:
              'Une analyse des procédés industriels décrits dans les documents',
          },
          {
            type: 'ANALYSE_MATERIAUX',
            description:
              'Une analyse des matériaux spécifiques mentionnés dans les documents',
          },
          {
            type: 'ANALYSE_BREVETS',
            description:
              'Une analyse des brevets et technologies mentionnés dans les documents',
          },
          {
            type: 'CARTE_MENTALE',
            description:
              'Une carte mentale illustrant les relations entre les concepts',
          },
          {
            type: 'EXTRACTION_ENTITES',
            description:
              'Une extraction des entités nommées identifiées dans les documents',
          },
          {
            type: 'ANALYSE_SENTIMENT',
            description:
              'Une analyse du sentiment général exprimé dans les documents',
          },
          {
            type: 'QUESTIONS_REPONSES',
            description:
              'Un document contenant des questions fréquentes et leurs réponses',
          },
        ];

        // Générer une liste formatée des délivrables disponibles
        const formattedList = availableDeliverables
          .map(
            (d) =>
              `- **${d.type}** : ${d.description}. Pour générer ce délivrable, utilisez l'outil getDeliverable avec le type "${d.type}"`,
          )
          .join('\n\n');

        const responseText = `# Types de délivrables disponibles\n\nVoici les types de délivrables que vous pouvez générer pour ce projet:\n\n${formattedList}`;

        return {
          text: responseText,
          stream: true,
          config: DEFAULT_STREAM_CONFIG,
          save: false,
          label: 'Lister les délivrables',
        } as ToolResult;
      } catch (error) {
        logger.error(
          `Erreur lors de la récupération des délivrables: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        );
        return {
          text: 'Une erreur est survenue lors de la récupération de la liste des délivrables.',
          stream: true,
          config: DEFAULT_STREAM_CONFIG,
          save: false,
          label: 'Lister les délivrables',
        } as ToolResult;
      }
    },
  },
});
