import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

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
          return 'Erreur: Clé API OpenAI manquante. Impossible de convertir le JSON en Markdown.';
        }

        // Initialiser le modèle avec une gestion d'erreurs améliorée
        try {
          logger.debug('Initialisation du modèle OpenAI');
          const openaiModel = openai('gpt-4o-mini');

          logger.debug('Création du stream de texte');
          const result = streamText({
            model: openaiModel,
            system: systemPrompt,
            prompt: humanPrompt,
            onError: ({ error }) => {
              logger.error(
                `Erreur lors du streaming: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
              );
            },
            onFinish: ({ text }) => {
              logger.debug(
                `Streaming terminé, longueur finale: ${text.length} caractères`,
              );
            },
          });

          // Titre préfixé si fourni
          const titlePrefix = title ? `# ${title}\n\n` : '';

          logger.debug('Attente du texte complet...');
          // Attendre que le stream soit complètement généré
          const fullText = await result.text;
          logger.debug(`Texte obtenu, longueur: ${fullText.length} caractères`);

          // Retourner le texte complet
          return titlePrefix + fullText;
        } catch (openaiError) {
          logger.error(
            `Erreur lors de l'initialisation ou du streaming OpenAI: ${
              openaiError instanceof Error
                ? openaiError.message
                : 'Erreur inconnue'
            }`,
          );
          logger.error(
            openaiError instanceof Error
              ? openaiError.stack
              : 'Pas de stack trace',
          );
          return `Erreur lors de l'appel au modèle OpenAI: ${
            openaiError instanceof Error
              ? openaiError.message
              : 'Erreur inconnue'
          }`;
        }
      } catch (error) {
        logger.error(
          `Erreur lors de la conversion JSON vers Markdown: ${
            error instanceof Error ? error.message : 'Erreur inconnue'
          }`,
        );
        logger.error(
          error instanceof Error ? error.stack : 'Pas de stack trace',
        );
        return `Une erreur est survenue lors de la conversion JSON vers Markdown: ${
          error instanceof Error ? error.message : 'Erreur inconnue'
        }`;
      }
    },
  },
});
