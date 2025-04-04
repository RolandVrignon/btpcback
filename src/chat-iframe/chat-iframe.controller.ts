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
} from '@nestjs/common';
import { ChatIframeService } from './chat-iframe.service';
import { Response } from 'express';
import { join } from 'path';
import { ChatRequestDto } from './dto/chatRequest.dto';

@Controller('chat')
export class ChatIframeController {
  private readonly logger = new Logger(ChatIframeController.name);

  constructor(private readonly chatIframeService: ChatIframeService) {}

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
    @Body() body: ChatRequestDto,
    @Res() res: Response,
  ) {
    try {
      const allMessages = body.messages;
      const userMessage = allMessages.at(-1)?.content || '';
      const conversationHistory = allMessages.slice(0, -1);

      this.logger.debug(
        `Conversation history: ${JSON.stringify(conversationHistory, null, 2)}`,
      );

      await this.chatIframeService.processMessageWithStreaming(
        projectId,
        apiKey,
        userMessage,
        conversationHistory,
        res,
      );
    } catch (error: unknown) {
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
