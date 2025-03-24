import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { DEFAULT_STREAM_CONFIG } from './streamConfig';

const logger = new Logger('JsonToMarkdownTool');

/**
 * Crée un outil pour convertir un objet JSON en Markdown en utilisant un LLM via Vercel AI SDK
 * @returns L'outil de conversion JSON vers Markdown
 */
export const createJsonToMarkdownTool = () => ({
  jsonToMarkdown: {
    description: 'Convertit un objet JSON en format Markdown structuré',
    parameters: z.object({
      json: z.any().describe('Objet JSON à convertir en Markdown'),
      title: z
        .string()
        .describe('Titre optionnel pour le document Markdown')
        .optional(),
    }),
    execute: async ({ json, title }: { json: any; title?: string }) => {
      try {
        logger.debug('Conversion JSON vers Markdown via Vercel AI SDK');
        logger.debug(`Clé OpenAI présente: ${!!process.env.OPENAI_API_KEY}`);
        logger.debug(
          `JSON à convertir: ${typeof json}, titre: ${title || 'non défini'}`,
        );

        // Préparation du JSON pour l'envoi au LLM
        const jsonString =
          typeof json === 'string' ? json : JSON.stringify(json, null, 2);

        logger.debug(`Longueur du JSON: ${jsonString.length} caractères`);

        // Construction du prompt
        const systemPrompt = `Tu es un expert en conversion de données JSON en Markdown structuré.
Ta tâche est de convertir le JSON fourni en un document Markdown bien formaté et organisé.

Directives:
- Crée une structure hiérarchique claire avec des titres et sous-titres
- Utilise des listes à puces pour les tableaux simples
- Utilise des tableaux Markdown pour les données tabulaires
- Formate proprement les valeurs et met en évidence les informations importantes
- Si le JSON est vide ou nul, indique-le clairement
- Inclus le titre fourni comme titre principal si disponible

Ton Markdown doit être bien structuré, facile à lire et mettre en valeur les données importantes.`;

        const humanPrompt = `Voici le JSON à convertir en Markdown structuré:\n\`\`\`json\n${jsonString}\n\`\`\``;

        // S'assurer que nous avons une clé API valide
        if (!process.env.OPENAI_API_KEY) {
          logger.error('Clé API OpenAI manquante');
          return {
            text: 'Erreur: Clé API OpenAI manquante. Impossible de convertir le JSON en Markdown.',
            stream: true,
            config: DEFAULT_STREAM_CONFIG,
          };
        }

        // Titre préfixé si fourni
        const titlePrefix = title ? `# ${title}\n\n` : '';

        return {
          text: titlePrefix,
          stream: true,
          config: DEFAULT_STREAM_CONFIG,
          toolCallData: {
            name: 'streamText',
            arguments: {
              model: openai('gpt-4o-mini'),
              system: systemPrompt,
              prompt: humanPrompt,
            },
          },
        };
      } catch (error) {
        logger.error(
          `Erreur lors de la conversion JSON vers Markdown: ${
            error instanceof Error ? error.message : 'Erreur inconnue'
          }`,
        );
        logger.error(
          error instanceof Error ? error.stack : 'Pas de stack trace',
        );
        return {
          text: `Une erreur est survenue lors de la conversion JSON vers Markdown: ${
            error instanceof Error ? error.message : 'Erreur inconnue'
          }`,
          stream: true,
          config: DEFAULT_STREAM_CONFIG,
        };
      }
    },
  },
});
