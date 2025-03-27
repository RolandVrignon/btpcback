// Re-export de tous les outils pour faciliter l'import par les consommateurs
import { createSearchDocumentsTool } from './toolList/searchDocumentsTool';
import { createListDocumentsTool } from './toolList/listDocumentsTool';
import { createReadDocumentTool } from './toolList/readDocumentTool';
import { createGetProjectSummaryTool } from './toolList/getProjectSummaryTool';
import { createGetDeliverableTool } from './toolList/getDeliverableTool';
import { createJsonToMarkdownTool } from './toolList/jsonToMarkdownTool';
import { createGetDocumentMetadataTool } from './toolList/getDocumentMetadataTool';
import { createGetDocumentViewUrlTool } from './toolList/getDocumentViewUrlTool';
import { SearchService } from '../../search/search.service';
import { DocumentsService } from '../../documents/documents.service';
import { ProjectsService } from '../../projects/projects.service';
import { DeliverablesService } from '../../deliverables/deliverables.service';
import { OrganizationEntity } from '../../types';
import { createListDeliverableTool } from './toolList/listDeliverableTool';
import { StreamConfig } from './streamConfig';
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

export type ToolResult = {
  text: string; // Texte de la réponse de l'outil
  stream: boolean; // Si true, la réponse de l'outil sera envoyée en streaming, sinon non.
  config: StreamConfig; // Configuration du streaming
  save: boolean; // Si true, la réponse de l'outil sera enregistré dans la conversation, sinon non.
};

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

  const readTools = createReadDocumentTool(
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

  const getDocumentMetadataTool = createGetDocumentMetadataTool(
    documentsService,
    projectId,
  );

  const getDocumentViewUrlTool = createGetDocumentViewUrlTool(
    documentsService,
    projectId,
    organization.id,
  );

  // Combiner tous les outils dans un seul objet
  return {
    ...searchTools,
    ...listTools,
    ...readTools,
    ...getProjectSummaryTool,
    ...getDeliverableTool,
    ...jsonToMarkdownTool,
    ...listDeliverableTool,
    ...getDocumentMetadataTool,
    ...getDocumentViewUrlTool,
  };
};

// Exporter également chaque outil individuel et la configuration
export {
  createSearchDocumentsTool,
  createListDocumentsTool,
  createReadDocumentTool,
  createGetProjectSummaryTool,
  createGetDeliverableTool,
  createJsonToMarkdownTool,
  createGetDocumentMetadataTool,
  createGetDocumentViewUrlTool,
};
