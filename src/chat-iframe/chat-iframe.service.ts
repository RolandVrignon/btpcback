import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { streamText, Message, smoothStream } from 'ai';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { SearchService } from '@/search/search.service';
import { DocumentsService } from '@/documents/documents.service';
import { ProjectsService } from '@/projects/projects.service';
import { DeliverablesService } from '@/deliverables/deliverables.service';
import { createChatTools } from '@/chat-iframe/tools';
import {
  DEFAULT_STREAM_CONFIG,
  AI_MODEL,
} from '@/chat-iframe/tools/streamConfig';
import { UsageType, AI_Provider } from '@prisma/client';
import { getModelConfig } from '@/chat-iframe/tools/streamConfig';
import { ReferenceDocumentsService } from '@/reference-documents/reference-documents.service';
interface Usage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

@Injectable()
export class ChatIframeService {
  private readonly logger = new Logger(ChatIframeService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private readonly searchService: SearchService,
    private readonly documentsService: DocumentsService,
    private readonly projectsService: ProjectsService,
    private readonly deliverablesService: DeliverablesService,
    private readonly referenceDocumentsService: ReferenceDocumentsService,
  ) {
    const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY non configurée');
    }
  }

  /**
   * Vérifie si l'APIKey est valide et renvoie l'organisation associée
   */
  async validateApiKeyAndGetOrganization(apiKey: string) {
    if (!apiKey) {
      throw new UnauthorizedException('APIKey non fournie');
    }

    const apiKeyRecord = await this.prisma.apikey.findUnique({
      where: { key: apiKey },
      include: { organization: true },
    });

    if (!apiKeyRecord) {
      throw new UnauthorizedException('APIKey invalide');
    }

    return apiKeyRecord.organization;
  }

  /**
   * Vérifie si le projet existe et s'il appartient à l'organisation
   */
  async validateProjectAccess(projectId: string, organizationId: string) {
    if (!projectId) {
      throw new NotFoundException('ID du projet non fourni');
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Projet avec l'ID ${projectId} non trouvé`);
    }

    if (project.organizationId !== organizationId) {
      throw new UnauthorizedException("Vous n'avez pas accès à ce projet");
    }

    return project;
  }

  /**
   * Vérifie à la fois l'APIKey et l'accès au projet
   */
  async validateAccessAndGetProject(apiKey: string, projectId: string) {
    const organization = await this.validateApiKeyAndGetOrganization(apiKey);
    const project = await this.validateProjectAccess(
      projectId,
      organization.id,
    );

    return { organization, project };
  }

  /**
   * Configure les en-têtes pour le streaming SSE
   */
  private setupStreamHeaders(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
  }

  /**
   * Gère les erreurs pendant le streaming
   */
  private async handleStreamError(error: any, res: Response): Promise<void> {
    await Promise.resolve();
    this.logger.error(
      `Erreur streaming: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
    );

    if (!res.headersSent) {
      throw new InternalServerErrorException('Erreur pendant le streaming');
    }

    res.write(
      `data: ${JSON.stringify({ error: 'Erreur pendant le streaming' })}\n\n`,
    );
    res.end();
  }

  /**
   * Enregistre l'utilisation de l'IA pour la facturation
   */
  private async logUsage(
    projectId: string,
    modelName: string,
    provider: AI_Provider,
    type: UsageType,
    usage: Usage,
  ): Promise<void> {
    try {
      await this.prisma.usage.create({
        data: {
          provider: provider,
          modelName: modelName,
          type: type,
          projectId,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
        },
      });
    } catch (error) {
      this.logger.error(
        `Erreur enregistrement usage: ${
          error instanceof Error ? error.message : 'Erreur inconnue'
        }`,
      );
    }
  }

  /**
   * Traite un message utilisateur et génère une réponse en streaming avec support d'outils
   */
  async processMessageWithStreaming(
    projectId: string,
    apiKey: string,
    message: string,
    conversationHistory: ChatMessage[],
    model: AI_MODEL,
    res: Response,
  ): Promise<void> {
    // Valider l'accès et récupérer le projet et l'organisation
    const { project, organization } = await this.validateAccessAndGetProject(
      apiKey,
      projectId,
    );

    // Configurer les en-têtes pour le streaming
    this.setupStreamHeaders(res);

    // Création des outils
    const tools = createChatTools(
      this.searchService,
      this.documentsService,
      this.projectsService,
      this.deliverablesService,
      this.referenceDocumentsService,
      projectId,
      organization,
    );

    const toolsList = Object.entries(tools).map(([name, tool]) => ({
      name,
      description: tool.description,
    }));

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `Tu es un assistant IA pour un projet nommé "${project.name}".
        Ton objectif est d'aider l'utilisateur avec ses questions concernant ce projet. Sois concis et précis dans tes réponses.
        N'hésite pas à utiliser plusieurs appels d'outils en séquence pour construire ta compréhension étape par étape.
        Tu as a ta disposition une liste d'outils qui permettent toute sorte de taches diverses relative au projet :
        ${toolsList.map((tool) => `${tool.name} : ${tool.description}`).join('\n')}
        Tu as egalement a ta disposition differents types de deliverables qui sont des documents generés par l'ia et qui permettent de mieux comprendre le projet.
        Pour ce qui concerne les outils de recherche documentaire, lorsque tu as un extrait de document qui valide la recherche, il faut que tu le cites dans un formatage qui permet à l'utilisateur de comprendre qu'il s'agit d'un extrait d'un document et il faut également que tu fournisse l'url du document à la page concerné de l'extrait / source.
        S'il y a une image n'hésite pas à la fournir à l'utilisateur.
        Cependant ne prends pas d'initiative à propos des fonctions, utilise uniquement les outils qui sont explicitement lisés et demandés et demande à l'utilisateur si tu as un doute concernant des paramètres manquants.
        Formates chaque réponse en markdown avec le plus de clarté possible. Ceci implique que tu dois utiliser des titres, des listes, des tableaux, etc.
        Le chat est déstiné à des personnes qui n'ont pas de connaissances en informatique. Il faut donc que tes réponses soient simples et claires. Ne fournit pas de nom de fonctions typés informatique, ou d'id ou ne parles pas de paramètres ect ect.
        A la fin de chaque reponse, propose une action à l'utilisateur pour continuer l'etude du projet.
        Pour info, nous sommes le ${new Date().toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })}`,
      },
      ...(conversationHistory || []),
      { role: 'user', content: message },
    ];

    try {
      const modelConfig = getModelConfig(model);

      const result = streamText({
        model: modelConfig.sdk,
        messages: messages as Message[],
        providerOptions: {
          openai: { reasoningEffort: 'low' },
          anthropic: {
            thinking: { type: 'enabled', budgetTokens: 12000 },
          },
          openrouter: {
            thinking: { type: 'enabled', budgetTokens: 12000 },
          },
        },
        tools,
        toolCallStreaming: true,
        maxSteps: 15,
        experimental_transform: smoothStream(DEFAULT_STREAM_CONFIG),
        onFinish: async ({ usage, reasoning }) => {
          this.logger.debug('usage:', usage);
          this.logger.debug('reasoning:', reasoning);
          await this.logUsage(
            projectId,
            modelConfig.model,
            modelConfig.provider,
            modelConfig.type,
            usage,
          );
        },
        onError: ({ error }) => {
          this.logger.error('Streaming error:', error);
        },
      });

      // Utiliser directement le textStream
      result.pipeDataStreamToResponse(res, {
        sendReasoning: true,
        sendSources: true,
      });
    } catch (error) {
      await this.handleStreamError(error, res);
    }
  }
}
