// Re-export de tous les outils pour faciliter l'import par les consommateurs
import { createSearchDocumentsTool } from '@/chat-iframe/tools/toolList/searchDocumentsTool';
import { createSearchInDocumentationTool } from '@/chat-iframe/tools/toolList/searchInDocumentationTool';
import { createListDocumentsTool } from '@/chat-iframe/tools/toolList/listDocumentsTool';
import { createReadDocumentTool } from '@/chat-iframe/tools/toolList/readDocumentTool';
import { createGetProjectSummaryTool } from '@/chat-iframe/tools/toolList/getProjectSummaryTool';
import { createGetDeliverableTool } from '@/chat-iframe/tools/toolList/getDeliverableTool';
import { createJsonToMarkdownTool } from '@/chat-iframe/tools/toolList/jsonToMarkdownTool';
import { createGetDocumentMetadataTool } from '@/chat-iframe/tools/toolList/getDocumentMetadataTool';
import { createGetDocumentViewUrlTool } from '@/chat-iframe/tools/toolList/getDocumentViewUrlTool';
import { SearchService } from '@/search/search.service';
import { DocumentsService } from '@/documents/documents.service';
import { ProjectsService } from '@/projects/projects.service';
import { DeliverablesService } from '@/deliverables/deliverables.service';
import { OrganizationEntity } from '@/types';
import { createListDeliverableTool } from '@/chat-iframe/tools/toolList/listDeliverableTool';
import { StreamConfig } from '@/chat-iframe/tools/streamConfig';
import { createWebSearchTool } from '@/chat-iframe/tools/toolList/websearch';
import { ReferenceDocumentsService } from '@/reference-documents/reference-documents.service';
import { ShortUrlRepository } from '@/short-url/short-url.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { ShortUrlService } from '@/short-url/short-url.service';
import { UsageService } from '@/usage/usage.service';
import { UsageRepository } from '@/usage/usage.repository';
import { createReadReferenceDocumentTool } from '@/chat-iframe/tools/toolList/readReferenceDocumentTool';

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
  label: string; // Label de l'outil
  toolCallData?: {
    name: string;
    arguments: any;
  };
};

export const createChatTools = (
  searchService: SearchService,
  documentsService: DocumentsService,
  projectsService: ProjectsService,
  deliverablesService: DeliverablesService,
  referenceDocumentsService: ReferenceDocumentsService,
  projectId: string,
  organization: OrganizationEntity,
) => {
  // Instanciation du service et repository short url
  const prismaService = new PrismaService();
  const shortUrlRepository = new ShortUrlRepository(prismaService);
  const shortUrlService = new ShortUrlService(shortUrlRepository);
  const usageRepository = new UsageRepository(prismaService);
  const usageService = new UsageService(usageRepository);
  const baseRedirectUrl = process.env.REDIRECT_BASE_URL;

  // Créer chaque outil individuellement
  const searchTools = createSearchDocumentsTool(
    searchService,
    projectId,
    organization.id,
  );

  const searchInDocumentationTool = createSearchInDocumentationTool(
    searchService,
    referenceDocumentsService,
    projectId,
    organization.id,
    shortUrlService,
    baseRedirectUrl,
    projectsService,
    usageService,
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

  const webSearchTool = createWebSearchTool();

  const readReferenceDocumentTool = createReadReferenceDocumentTool(
    referenceDocumentsService,
    shortUrlService,
    baseRedirectUrl,
  );

  // Combiner tous les outils dans un seul objet
  return {
    ...searchTools,
    ...searchInDocumentationTool,
    ...listTools,
    ...readTools,
    ...getProjectSummaryTool,
    ...getDeliverableTool,
    ...jsonToMarkdownTool,
    ...listDeliverableTool,
    ...getDocumentMetadataTool,
    ...getDocumentViewUrlTool,
    ...webSearchTool,
    ...readReferenceDocumentTool,
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
  createReadReferenceDocumentTool,
};
