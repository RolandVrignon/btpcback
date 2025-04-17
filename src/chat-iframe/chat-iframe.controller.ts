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
import { ChatIframeService } from '@/chat-iframe/chat-iframe.service';
import { Response } from 'express';
import { join } from 'path';
import { ChatRequestDto } from '@/chat-iframe/dto/chatRequest.dto';

@Controller('chat')
export class ChatIframeController {
  private readonly logger = new Logger(ChatIframeController.name);

  constructor(private readonly chatIframeService: ChatIframeService) {}

  @Get('/')
  serveRootChatApp(@Res() res: Response) {
    this.logger.debug('Serving chat SPA index.html for root request to /chat/');
    return res.sendFile(join(process.cwd(), 'public', 'chat', 'index.html'));
  }

  @Get('*path')
  serveChatApp(@Param('path') path: string, @Res() res: Response) {
    this.logger.debug(
      `Serving chat SPA index.html as fallback for route: ${path || '/'}`,
    );
    return res.sendFile(join(process.cwd(), 'public', 'chat', 'index.html'));
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
        `Processing message for projectId=${projectId}. History length: ${conversationHistory.length}`,
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
        `Erreur processMessage: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
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

      try {
        res.write(
          `data: ${JSON.stringify({ error: 'Erreur pendant le streaming', details: error instanceof Error ? error.message : 'Unknown error' })}\n\n`,
        );
      } catch (writeError) {
        this.logger.error(
          "Impossible d'écrire l'erreur de streaming dans la réponse",
          writeError,
        );
      } finally {
        if (!res.writableEnded) {
          res.end();
        }
      }
    }
  }
}
