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
import { streamText, Message } from 'ai';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from '../search/search.service';
import { z } from 'zod';

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

      // Construire les messages pour le modèle avec l'historique
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: `Tu es un assistant IA pour un projet nommé "${project.name}". Ton objectif est d'aider l'utilisateur avec ses questions concernant ce projet. Sois concis et précis dans tes réponses. Si tu n'as pas l'information dont tu as besoin, tu peux utiliser l'outil searchDocuments pour chercher des informations dans les documents du projet.`,
        },
        ...(body.conversationHistory || []),
        { role: 'user', content: body.message },
      ];

      const result = streamText({
        model: this.openai('gpt-4o-mini'),
        messages: messages as Message[],
        tools: {
          searchDocuments: {
            description:
              'Recherche des informations dans les documents du projet',
            parameters: z.object({
              query: z.string().describe('La requête de recherche'),
            }),
            execute: async ({ query }: { query: string }) => {
              try {
                this.logger.debug(
                  `Exécution de la recherche RAG avec la requête: ${query}`,
                );
                const searchResults = await this.searchService.vectorSearch(
                  {
                    query,
                    projectId,
                    limit: 10,
                  },
                  organization.id,
                );

                // Formater les résultats pour les rendre plus faciles à utiliser par le LLM
                const formattedResults = searchResults.results.map((r) => ({
                  text: r.text,
                  page: r.page,
                  documentId: r.documentId,
                  score: r.score,
                }));

                // Créer un contexte à partir des résultats pour le modèle
                const context = formattedResults
                  .map(
                    (r) =>
                      `Extrait du document ${r.documentId} (page ${r.page}):\n${r.text}`,
                  )
                  .join('\n\n');

                return context.length > 0
                  ? context
                  : 'Aucune information pertinente trouvée dans les documents du projet.';
              } catch (error) {
                this.logger.error(
                  `Erreur lors de la recherche RAG: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
                );
                return 'Une erreur est survenue lors de la recherche dans les documents.';
              }
            },
          },
        },
        toolCallStreaming: true,
        maxSteps: 3,
      });

      const reader = result.textStream.getReader();
      this.logger.debug('Début du streaming');

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(`data: ${JSON.stringify({ text: value })}\n\n`);
        }

        res.write('data: [DONE]\n\n');
        res.end();
        this.logger.debug('Streaming terminé avec succès');
        await this.logUsage(projectId);
      } catch (streamError) {
        await this.handleStreamError(streamError, res);
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
}
