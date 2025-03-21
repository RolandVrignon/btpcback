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
import { streamText } from 'ai';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Controller('chat')
export class ChatIframeController {
  private readonly logger = new Logger(ChatIframeController.name);
  private readonly openai: ReturnType<typeof createOpenAI>;

  constructor(
    private readonly chatIframeService: ChatIframeService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
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

      return res.sendFile(
        join(process.cwd(), 'public', 'chat-iframe', 'index.html'),
      );
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
    @Body() body: { message: string },
    @Res() res: Response,
  ) {
    try {
      this.logger.debug(`Réception message pour projectId=${projectId}`);
      const { project } =
        await this.chatIframeService.validateAccessAndGetProject(
          apiKey,
          projectId,
        );
      this.logger.debug('Accès validé, préparation de la réponse');

      this.setupStreamHeaders(res);

      const result = streamText({
        model: this.openai('gpt-4o-mini'),
        messages: [
          {
            role: 'system',
            content: `Tu es un assistant IA pour un projet nommé "${project.name}". Ton objectif est d'aider l'utilisateur avec ses questions concernant ce projet. Sois concis et précis dans tes réponses.`,
          },
          { role: 'user', content: body.message },
        ],
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
