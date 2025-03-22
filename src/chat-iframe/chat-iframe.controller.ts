import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  UnauthorizedException,
  NotFoundException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ChatIframeService } from './chat-iframe.service';
import { Response } from 'express';
import { join } from 'path';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText, Message, smoothStream } from 'ai';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from '../search/search.service';
import { DocumentsService } from '../documents/documents.service';
import { ProjectsService } from '../projects/projects.service';
import { DeliverablesService } from '../deliverables/deliverables.service';
import { createChatTools, DEFAULT_STREAM_CONFIG } from './tools';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

@Controller('chat')
export class ChatIframeController {
  private readonly logger = new Logger(ChatIframeController.name);
  private readonly openai: ReturnType<typeof createOpenAI>;

  constructor(
    private readonly chatIframeService: ChatIframeService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly searchService: SearchService,
    private readonly documentsService: DocumentsService,
    private readonly projectsService: ProjectsService,
    private readonly deliverablesService: DeliverablesService,
  ) {
    const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY non configurée');
    }
    this.openai = createOpenAI({ apiKey: openaiApiKey });
  }

  private setupStreamHeaders(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
  }

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

  private async logUsage(projectId: string): Promise<void> {
    try {
      await this.prisma.usage.create({
        data: {
          provider: 'OPENAI',
          modelName: 'gpt-4o-mini',
          type: 'TEXT_TO_TEXT',
          projectId,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
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

  @Get(':projectId')
  async renderIframe(
    @Param('projectId') projectId: string,
    @Query('apiKey') apiKey: string,
    @Res() res: Response,
  ) {
    try {
      this.logger.debug(`Demande d'iframe pour projectId=${projectId}`);

      await this.chatIframeService.validateAccessAndGetProject(
        apiKey,
        projectId,
      );

      this.logger.debug('Authentification réussie, service iframe');

      return res.sendFile(join(process.cwd(), 'public', 'chat', 'index.html'));
    } catch (error) {
      this.logger.error(
        `Erreur iframe: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      );

      if (error instanceof UnauthorizedException) {
        return res
          .status(401)
          .json({ error: 'Accès non autorisé', message: error.message });
      }

      if (error instanceof NotFoundException) {
        return res
          .status(404)
          .json({ error: 'Ressource non trouvée', message: error.message });
      }

      return res.status(500).json({
        error: 'Erreur interne du serveur',
        message:
          "Une erreur s'est produite lors du traitement de votre demande",
      });
    }
  }

  @Post(':projectId/message')
  async processMessage(
    @Param('projectId') projectId: string,
    @Query('apiKey') apiKey: string,
    @Body()
    body: {
      message: string;
      conversationHistory: ChatMessage[];
    },
    @Res() res: Response,
  ) {
    try {
      this.logger.debug(`Réception message pour projectId=${projectId}`);
      const { project, organization } =
        await this.chatIframeService.validateAccessAndGetProject(
          apiKey,
          projectId,
        );
      this.logger.debug('Accès validé, préparation de la réponse');

      this.setupStreamHeaders(res);

      // Envoi d'un message test pour vérifier la connexion
      // Supprimer le message initial pour que le front n'affiche rien avant la vraie réponse
      // res.write(
      //   `data: ${JSON.stringify({ text: 'Connexion établie. Traitement de votre requête...' })}\n\n`,
      // );

      // Message système et historique
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: `Tu es un assistant IA pour un projet nommé "${project.name}". Ton objectif est d'aider l'utilisateur avec ses questions concernant ce projet. Sois concis et précis dans tes réponses.

Si tu n'as pas l'information dont tu as besoin, tu peux utiliser les outils suivants:
- searchDocuments: pour chercher des informations précises dans les documents du projet
- listProjectDocuments: pour voir la liste des documents disponibles dans le projet
- summarizeDocument: pour obtenir le contenu complet d'un document et le résumer (nécessite l'ID du document)

Pour les questions complexes qui nécessitent une compréhension globale du projet, suis cette méthodologie en étapes:
1. Utilise listProjectDocuments pour obtenir la liste complète des documents
2. Pour chaque document important, utilise summarizeDocument pour accéder à son contenu complet
3. Analyse chaque document individuellement avant de formuler une synthèse globale
4. Organise les informations de façon logique (chronologique, thématique, etc.)
5. Présente un résumé qui couvre les aspects essentiels du projet

N'hésite pas à utiliser plusieurs appels d'outils en séquence pour construire ta compréhension étape par étape.`,
        },
        ...(body.conversationHistory || []),
        { role: 'user', content: body.message },
      ];

      // Création des outils (mise à jour pour utiliser deliverablesService)
      const tools = createChatTools(
        this.searchService,
        this.documentsService,
        this.projectsService,
        this.deliverablesService,
        projectId,
        organization,
      );

      // Log pour vérifier les outils disponibles
      this.logger.debug(`Outils disponibles: ${Object.keys(tools).join(', ')}`);
      this.logger.debug(JSON.stringify(tools, null, 2));

      // Configuration du streaming simple
      try {
        const result = streamText({
          model: this.openai('gpt-4o-mini'),
          messages: messages as Message[],
          tools,
          toolCallStreaming: true,
          maxSteps: 15,
          experimental_transform: smoothStream(DEFAULT_STREAM_CONFIG),
        });

        // Logs pour déboguer les propriétés du résultat
        this.logger.debug(`Type de result: ${typeof result}`);
        this.logger.debug(
          `Propriétés de result: ${Object.keys(result).join(', ')}`,
        );

        this.logger.debug('Début du streaming');

        // Utiliser directement le textStream
        const reader = result.textStream.getReader();

        // Lire les chunks et les envoyer au client
        let chunkCounter = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            this.logger.debug('Fin du streaming: done=true');
            break;
          }

          chunkCounter++;
          this.logger.debug(`Chunk #${chunkCounter} reçu: "${value}"`);

          // Envoyer le chunk
          res.write(`data: ${JSON.stringify({ text: value })}\n\n`);
        }

        this.logger.debug(`Total des chunks envoyés: ${chunkCounter}`);
        res.write('data: [DONE]\n\n');
        res.end();

        this.logger.debug('Streaming terminé avec succès');
        await this.logUsage(projectId);
      } catch (error) {
        await this.handleStreamError(error, res);
      }
    } catch (error) {
      this.logger.error(
        `Erreur message: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      );

      if (!res.headersSent) {
        if (error instanceof UnauthorizedException) {
          return res
            .status(401)
            .json({ error: 'Accès non autorisé', message: error.message });
        }

        if (error instanceof NotFoundException) {
          return res
            .status(404)
            .json({ error: 'Ressource non trouvée', message: error.message });
        }

        return res.status(500).json({
          error: 'Erreur interne du serveur',
          message:
            "Une erreur s'est produite lors du traitement de votre demande",
        });
      }

      res.write(
        `data: ${JSON.stringify({ error: 'Erreur pendant le streaming' })}\n\n`,
      );
      res.end();
    }
  }

  @Get(':projectId/stream')
  async streamMessage(
    @Param('projectId') projectId: string,
    @Query('apiKey') apiKey: string,
    @Query('message') message: string,
    @Query('history') history: string,
    @Res() res: Response,
  ) {
    try {
      this.logger.debug(
        `Réception demande de streaming pour projectId=${projectId}`,
      );
      const { project, organization } =
        await this.chatIframeService.validateAccessAndGetProject(
          apiKey,
          projectId,
        );
      this.logger.debug('Accès validé, préparation du streaming');

      this.setupStreamHeaders(res);

      // Décoder et parser l'historique de la conversation s'il existe
      let conversationHistory: ChatMessage[] = [];
      try {
        if (history) {
          conversationHistory = JSON.parse(
            decodeURIComponent(history),
          ) as ChatMessage[];
        }
      } catch {
        this.logger.warn(
          "Erreur lors du parsing de l'historique de conversation",
        );
      }

      // Construire les messages pour le modèle
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: `Tu es un assistant IA pour un projet nommé "${project.name}". Ton objectif est d'aider l'utilisateur avec ses questions concernant ce projet. Sois concis et précis dans tes réponses.

Si tu n'as pas l'information dont tu as besoin, tu peux utiliser les outils suivants:
- searchDocuments: pour chercher des informations précises dans les documents du projet
- listProjectDocuments: pour voir la liste des documents disponibles dans le projet
- summarizeDocument: pour obtenir le contenu complet d'un document et le résumer (nécessite l'ID du document)
- getProjectSummary: pour obtenir un résumé global du projet
- getDeliverable: pour générer un délivrable du projet (par exemple un résumé descriptif ou une analyse)

Pour les questions complexes qui nécessitent une compréhension globale du projet, suis cette méthodologie en étapes:
1. Utilise listProjectDocuments pour obtenir la liste complète des documents
2. Pour chaque document important, utilise summarizeDocument pour accéder à son contenu complet
3. Analyse chaque document individuellement avant de formuler une synthèse globale
4. Organise les informations de façon logique (chronologique, thématique, etc.)
5. Présente un résumé qui couvre les aspects essentiels du projet

N'hésite pas à utiliser plusieurs appels d'outils en séquence pour construire ta compréhension étape par étape.`,
        },
        ...conversationHistory,
        { role: 'user', content: message },
      ];

      // Création des outils avec la nouvelle fonction unifiée
      const tools = createChatTools(
        this.searchService,
        this.documentsService,
        this.projectsService,
        this.deliverablesService,
        projectId,
        organization,
      );

      const result = streamText({
        model: this.openai('gpt-4o-mini'),
        messages: messages as Message[],
        tools,
        toolCallStreaming: true,
        maxSteps: 15,
        experimental_transform: smoothStream(DEFAULT_STREAM_CONFIG),
      });

      this.logger.debug('Début du streaming SSE');
      const reader = result.textStream.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            this.logger.debug('Fin du streaming SSE: done=true');
            break;
          }

          // Envoyer chaque valeur comme un événement SSE
          // Format compatible avec EventSource
          res.write(`data: ${JSON.stringify({ text: value })}\n\n`);
        }

        res.write('data: [DONE]\n\n');
        res.end();
        this.logger.debug('Streaming SSE terminé avec succès');
        await this.logUsage(projectId);
      } catch (streamError) {
        await this.handleStreamError(streamError, res);
      }
    } catch (error) {
      this.logger.error(
        `Erreur stream: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      );

      if (!res.headersSent) {
        if (error instanceof UnauthorizedException) {
          return res
            .status(401)
            .json({ error: 'Accès non autorisé', message: error.message });
        }

        if (error instanceof NotFoundException) {
          return res
            .status(404)
            .json({ error: 'Ressource non trouvée', message: error.message });
        }

        return res.status(500).json({
          error: 'Erreur interne du serveur',
          message:
            "Une erreur s'est produite lors du traitement de votre demande",
        });
      }

      res.write(
        `data: ${JSON.stringify({ error: 'Erreur pendant le streaming' })}\n\n`,
      );
      res.end();
    }
  }
}
