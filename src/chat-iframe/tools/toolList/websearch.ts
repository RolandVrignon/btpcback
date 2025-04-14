import { z } from 'zod';
import Exa from 'exa-js';
import { ToolResult } from '@/chat-iframe/tools/index';
import { DEFAULT_STREAM_CONFIG } from '@/chat-iframe/tools/streamConfig';
import { Logger } from '@nestjs/common';

export const exa = new Exa(process.env.EXA_API_KEY);

const logger = new Logger('WebSearchTool');

export const createWebSearchTool = () => ({
  webSearch: {
    description: 'Recherche sur le web pour obtenir des informations à jour',
    parameters: z.object({
      query: z.string().describe('La requête de recherche'),
    }),
    execute: async ({ query }: { query: string }): Promise<ToolResult> => {
      logger.debug(`Exécution de la recherche web avec la requête: ${query}`);
      try {
        const { results } = await exa.searchAndContents(query, {
          livecrawl: 'always',
          numResults: 3,
        });
        logger.debug(
          `Résultats de la recherche web: ${JSON.stringify(results)}`,
        );
        return {
          text: results.map((result) => result.text).join('\n'),
          stream: true,
          config: DEFAULT_STREAM_CONFIG,
          save: false,
          label: 'Web Search',
        };
      } catch (e) {
        logger.error(
          `Une erreur est survenue lors de la recherche web. Surement plus de credits ou un probleme avec l'api exa: ${e}`,
        );
        return {
          text: "Une erreur est survenue lors de la recherche web. Surement plus de credits ou un probleme avec l'api exa",
          stream: false,
          config: DEFAULT_STREAM_CONFIG,
          save: false,
          label: 'Web Search',
        };
      }
    },
  },
});
