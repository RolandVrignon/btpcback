// Re-export de tous les outils pour faciliter l'import par les consommateurs
import { createSearchDocumentsTool } from './searchDocumentsTool';
import { createListDocumentsTool } from './listDocumentsTool';
import { createSummarizeDocumentTool } from './summarizeDocumentTool';
import { createGetProjectSummaryTool } from './getProjectSummaryTool';
import { DEFAULT_STREAM_CONFIG, StreamConfig } from './streamConfig';
import { SearchService } from '../../search/search.service';
import { DocumentsService } from '../../documents/documents.service';
import { ProjectsService } from '../../projects/projects.service';

/**
 * Crée tous les outils nécessaires pour le chat
 * @param searchService Service de recherche
 * @param documentsService Service de documents
 * @param projectsService Service de projets
 * @param projectId ID du projet
 * @param organizationId ID de l'organisation
 * @returns Tous les outils combinés
 */
export const createChatTools = (
  searchService: SearchService,
  documentsService: DocumentsService,
  projectsService: ProjectsService,
  projectId: string,
  organizationId: string,
) => {
  // Créer chaque outil individuellement
  const searchTools = createSearchDocumentsTool(
    searchService,
    projectId,
    organizationId,
  );

  const listTools = createListDocumentsTool(documentsService, projectId);

  const summarizeTools = createSummarizeDocumentTool(
    documentsService,
    searchService,
    projectId,
  );

  const getProjectSummaryTool = createGetProjectSummaryTool(
    projectsService,
    projectId,
    organizationId,
  );

  // Combiner tous les outils dans un seul objet
  return {
    ...searchTools,
    ...listTools,
    ...summarizeTools,
    ...getProjectSummaryTool,
  };
};

// Exporter également chaque outil individuel et la configuration
export {
  createSearchDocumentsTool,
  createListDocumentsTool,
  createSummarizeDocumentTool,
  createGetProjectSummaryTool,
  DEFAULT_STREAM_CONFIG,
  StreamConfig,
};
