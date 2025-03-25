import { Logger } from '@nestjs/common';
import { ProjectsService } from '../../../projects/projects.service';
import { DEFAULT_STREAM_CONFIG } from '../streamConfig';
import { z } from 'zod';

const logger = new Logger('GetProjectSummaryTool');

/**
 * Crée un outil pour récupérer le résumé d'un projet
 * @param projectsService Service des projets
 * @param projectId ID du projet actuel
 * @param organizationId ID de l'organisation actuelle
 * @returns L'outil pour récupérer le résumé du projet
 */
export const createGetProjectSummaryTool = (
  projectsService: ProjectsService,
  projectId: string,
  organizationId: string,
) => ({
  getProjectSummary: {
    description: 'Récupère le résumé détaillé du projet actuel',
    parameters: z.object({
      summaryType: z
        .enum(['short', 'long'])
        .describe('Type de résumé à récupérer (court ou long)')
        .default('long')
        .optional(),
    }),
    execute: async ({
      summaryType = 'long',
    }: { summaryType?: 'short' | 'long' } = {}) => {
      try {
        logger.debug(
          `Récupération du résumé ${summaryType} pour le projet ${projectId}`,
        );

        // Récupérer le projet
        const project = await projectsService.findOne(projectId);

        if (!project) {
          throw new Error(`Projet ${projectId} non trouvé`);
        }

        // Vérifier que le projet appartient à l'organisation
        if (project.organizationId !== organizationId) {
          throw new Error(
            "Vous n'avez pas accès à ce projet depuis cette organisation",
          );
        }

        // Formater les informations du projet
        const projectInfo = {
          name: project.name,
          createdAt: project.createdAt
            ? new Date(project.createdAt).toLocaleDateString('fr-FR')
            : 'Date inconnue',
          tags: project.tags ? project.tags.join(', ') : 'Aucun tag',
          status: project.status,
        };

        // Récupérer le résumé selon le type demandé
        const summary =
          summaryType === 'short'
            ? project.short_summary ||
              'Aucun résumé court disponible pour ce projet.'
            : project.long_summary ||
              'Aucun résumé long disponible pour ce projet.';

        // Construire la réponse
        const response = `
# Résumé du projet: ${project.name}

**Informations générales:**
- Statut: ${projectInfo.status}
- Créé le: ${projectInfo.createdAt}
- Tags: ${projectInfo.tags}

**Résumé ${summaryType === 'short' ? 'court' : 'détaillé'}:**
${summary}
        `.trim();

        // Pour assurer la compatibilité streaming, retourner un objet avec les propriétés appropriées
        return {
          text: response,
          stream: true,
          config: DEFAULT_STREAM_CONFIG,
        };
      } catch (error) {
        logger.error(
          `Erreur lors de la récupération du résumé du projet: ${
            error instanceof Error ? error.message : 'Erreur inconnue'
          }`,
        );
        return {
          text: 'Une erreur est survenue lors de la récupération du résumé du projet.',
          stream: true,
          config: DEFAULT_STREAM_CONFIG,
        };
      }
    },
  },
});
