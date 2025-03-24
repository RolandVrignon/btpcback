import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { DEFAULT_STREAM_CONFIG } from './streamConfig';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const logger = new Logger('AgentTool');
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface Tool {
  description: string;
  parameters: z.ZodType<any>;
  execute: (params: any) => Promise<any>;
}

interface AgentDecision {
  nextTool: string;
  reasoning: string;
  parameters: Record<string, any>;
  isComplete: boolean;
}

/**
 * Creates an agent tool that orchestrates other tools based on user requests
 * @param availableTools Object containing all available tools
 * @returns The agent tool definition
 */
export const createAgentTool = (availableTools: Record<string, Tool>) => ({
  agent: {
    description:
      'Agent qui analyse la requête utilisateur et décide quels outils utiliser pour y répondre',
    parameters: z.object({
      userRequest: z.string().describe("La requête de l'utilisateur"),
      conversationHistory: z
        .array(
          z.object({
            role: z.enum(['system', 'user', 'assistant']),
            content: z.string(),
          }),
        )
        .describe("L'historique de la conversation"),
      lastToolResult: z
        .string()
        .optional()
        .describe('Le résultat du dernier outil utilisé (optionnel)'),
    }),
    execute: async ({
      userRequest,
      conversationHistory,
      lastToolResult,
    }: {
      userRequest: string;
      conversationHistory: Array<{ role: string; content: string }>;
      lastToolResult?: string;
    }) => {
      try {
        logger.debug('Agent analyzing user request and available tools');

        // Convert available tools to a format suitable for the LLM
        const toolsDescription = Object.entries(availableTools)
          .map(([name, tool]) => `- ${name}: ${tool.description}`)
          .join('\n');

        // Create a system prompt that explains the agent's role and available tools
        const systemPrompt = `Tu es un agent IA qui aide à répondre aux questions des utilisateurs en utilisant les outils disponibles.
Tu dois analyser la requête de l'utilisateur et décider quels outils utiliser dans quel ordre.

Outils disponibles:
${toolsDescription}

Directives:
1. Analyse la requête utilisateur pour comprendre son besoin
2. Décide quels outils utiliser et dans quel ordre
3. Si le résultat du dernier outil est fourni, utilise-le pour prendre ta décision
4. Sois précis dans tes recommandations d'outils
5. Explique brièvement pourquoi tu choisis ces outils

Format de réponse attendu:
{
  "nextTool": "nom_de_l_outil",
  "reasoning": "explication de pourquoi cet outil est choisi",
  "parameters": { paramètres à passer à l'outil },
  "isComplete": boolean // true si la réponse est complète, false si d'autres outils seront nécessaires
}`;

        // Create the human prompt with the current context
        const humanPrompt = `Requête utilisateur: ${userRequest}

Historique de la conversation:
${conversationHistory.map((msg) => `${msg.role}: ${msg.content}`).join('\n')}

${lastToolResult ? `Résultat du dernier outil:\n${lastToolResult}` : ''}

Quel outil devrais-je utiliser ensuite et pourquoi?`;

        // Use the LLM to analyze the request and decide on the next tool
        const result = await generateText({
          model: openai('gpt-4o-mini'),
          system: systemPrompt,
          prompt: humanPrompt,
        });

        // Get the complete response
        const fullText = result.text;

        logger.debug(
          `Full Decision text: ${JSON.stringify(fullText, null, 2)}`,
        );

        // Parse the response to get the tool decision
        try {
          const decision = JSON.parse(fullText) as AgentDecision;

          return {
            text: `Décision de l'agent:\n${JSON.stringify(decision, null, 2)}`,
            stream: true,
            config: DEFAULT_STREAM_CONFIG,
            toolCallData: decision.isComplete
              ? null
              : {
                  name: decision.nextTool,
                  arguments: decision.parameters,
                },
            action: {
              type: 'tool_selection',
              tool: decision.nextTool,
              reasoning: decision.reasoning,
            },
          };
        } catch (parseError) {
          logger.error(
            `Error parsing agent response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
          );
          return {
            text: "Une erreur est survenue lors de l'analyse de la requête.",
            stream: true,
            config: DEFAULT_STREAM_CONFIG,
          };
        }
      } catch (error) {
        logger.error(
          `Error in agent tool: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        return {
          text: "Une erreur est survenue lors de l'exécution de l'agent.",
          stream: true,
          config: DEFAULT_STREAM_CONFIG,
        };
      }
    },
  },
});
