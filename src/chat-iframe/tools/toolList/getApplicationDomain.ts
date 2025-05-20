import { Logger } from '@nestjs/common';
import { ProjectsService } from '@/projects/projects.service';
import { UsageService } from '@/usage/usage.service';
import { z } from 'zod';
import { ToolResult } from '@/chat-iframe/tools/index';
import { DEFAULT_STREAM_CONFIG } from '@/chat-iframe/tools/streamConfig';
import { generateText } from 'ai';
import { model } from '@/chat-iframe/tools/streamConfig';

const logger = new Logger('GetApplicationDomainTool');

/**
 * Create a tool to generate a paragraph mixing the original query and the project application domain, and log LLM usage.
 * @param projectsService Project service
 * @param usageService Usage service
 * @param projectId Project ID
 * @param organizationId Organization ID
 * @returns Tool definition
 */
export const createGetApplicationDomainTool = (
  projectsService: ProjectsService,
  usageService: UsageService,
  projectId: string,
  organizationId: string,
) => ({
  getApplicationDomain: {
    description:
      'Construit un paragraphe mêlant la requête utilisateur et le contexte technique du projet (type de bâtiment, nature des travaux, localisation, altitude, etc.). Utile pour enrichir une recherche documentaire ou une analyse technique.',
    parameters: z.object({
      query: z
        .string()
        .describe(
          "La requête de recherche initiale à enrichir avec le contexte du projet. Exemple : 'Quelles sont les normes à respecter pour la toiture ?'",
        ),
    }),
    execute: async ({ query }: { query: string }): Promise<ToolResult> => {
      try {
        // Retrieve the project
        const project = await projectsService.findOne(projectId);
        if (!project) {
          return {
            text: `Projet ${projectId} non trouvé`,
            stream: true,
            config: DEFAULT_STREAM_CONFIG,
            save: false,
            label: "Domaine d'application du projet",
          } as ToolResult;
        }
        if (project.organizationId !== organizationId) {
          return {
            text: "Vous n'avez pas accès à ce projet depuis cette organisation",
            stream: true,
            config: DEFAULT_STREAM_CONFIG,
            save: false,
            label: "Domaine d'application du projet",
          } as ToolResult;
        }

        // Extract relevant fields
        const summary = project.long_summary || '';
        const address = project.closest_formatted_address || '';
        const altitude =
          project.altitude !== undefined && project.altitude !== null
            ? `Altitude: ${project.altitude}m`
            : '';

        // Build the application domain string
        const parts = [summary, address, altitude].filter(Boolean);
        const domain = parts.length > 0 ? parts.join(' | ') : '';

        // Prompt for the LLM
        const systemPrompt = `Tu es un assistant expert en ingénierie et réglementation technique du bâtiment. Ta tâche est de rédiger un paragraphe synthétique qui reformule la requête utilisateur en l'enrichissant avec le contexte technique du projet fourni. Le résultat doit être une requête de recherche incluant le domaine d'application, c'est-à-dire le contexte technique du projet : type de bâtiment (individuel, collectif, tertiaire…), nature des travaux (neuf ou rénovation), localisation géographique (région, altitude, zone climatique), et contraintes spécifiques (exposition au vent, sismicité, etc.).`;
        const humanPrompt = `Requête utilisateur : ${query}\nContexte du projet : ${domain}`;

        // Call the LLM
        const result = await generateText({
          model: model.sdk,
          system: systemPrompt,
          prompt: humanPrompt,
        });

        console.log('result', JSON.stringify(result, null, 2));

        // Log usage statistics
        logger.debug('LLM usage:', JSON.stringify(result.usage));

        // Save usage in the database
        if (result.usage) {
          const usage = await usageService.logTextToTextUsage(
            model.provider,
            model.model,
            result.usage,
            projectId,
          );
          logger.debug('Usage saved:', JSON.stringify(usage));
        }

        return {
          text: result.text,
          stream: true,
          config: DEFAULT_STREAM_CONFIG,
          save: false,
          label: "Domaine d'application du projet",
        } as ToolResult;
      } catch (error) {
        logger.error(
          `Erreur lors de la récupération du domaine d'application du projet: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        );
        return {
          text: "Une erreur est survenue lors de la récupération du domaine d'application du projet.",
          stream: true,
          config: DEFAULT_STREAM_CONFIG,
          save: false,
          label: "Domaine d'application du projet",
        } as ToolResult;
      }
    },
  },
});
