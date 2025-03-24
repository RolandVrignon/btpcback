// Re-export de tous les outils pour faciliter l'import par les consommateurs
import { createSearchDocumentsTool } from './searchDocumentsTool';
import { createListDocumentsTool } from './listDocumentsTool';
import { createSummarizeDocumentTool } from './summarizeDocumentTool';
import { createGetProjectSummaryTool } from './getProjectSummaryTool';
import { createGetDeliverableTool } from './getDeliverableTool';
import { createJsonToMarkdownTool } from './jsonToMarkdownTool';
import { SearchService } from '../../search/search.service';
import { DocumentsService } from '../../documents/documents.service';
import { ProjectsService } from '../../projects/projects.service';
import { DeliverablesService } from '../../deliverables/deliverables.service';
import { OrganizationEntity } from '../../types';
import { createListDeliverableTool } from './listDeliverableTool';
/**
 * Crée tous les outils nécessaires pour le chat
 * @param searchService Service de recherche
 * @param documentsService Service de documents
 * @param projectsService Service de projets
 * @param deliverablesService Service de délivrables
 * @param projectId ID du projet
 * @param organization L'organisation de l'utilisateur
 * @returns Tous les outils combinés
 */
export const createChatTools = (
  searchService: SearchService,
  documentsService: DocumentsService,
  projectsService: ProjectsService,
  deliverablesService: DeliverablesService,
  projectId: string,
  organization: OrganizationEntity,
) => {
  // Créer chaque outil individuellement
  const searchTools = createSearchDocumentsTool(
    searchService,
    projectId,
    organization.id,
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
    organization.id,
  );

  const getDeliverableTool = createGetDeliverableTool(
    deliverablesService,
    projectId,
    organization,
  );

  const jsonToMarkdownTool = createJsonToMarkdownTool();

  const listDeliverableTool = createListDeliverableTool();

  // Combiner tous les outils dans un seul objet
  return {
    ...searchTools,
    ...listTools,
    ...summarizeTools,
    ...getProjectSummaryTool,
    ...getDeliverableTool,
    ...jsonToMarkdownTool,
    ...listDeliverableTool,
  };
};

// Exporter également chaque outil individuel et la configuration
export {
  createSearchDocumentsTool,
  createListDocumentsTool,
  createSummarizeDocumentTool,
  createGetProjectSummaryTool,
  createGetDeliverableTool,
  createJsonToMarkdownTool,
};
