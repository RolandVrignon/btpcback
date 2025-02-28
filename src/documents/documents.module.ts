import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { MulterModule } from '@nestjs/platform-express';
import { ApiKeyMiddleware } from '../middleware/api-key.middleware';
import { UsageModule } from '../usage/usage.module';
import { DocumentsRepository } from './documents.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { ChunksModule } from '../chunks/chunks.module';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads',
    }),
    PrismaModule,
    UsageModule,
    EmbeddingsModule,
    ChunksModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentsRepository],
  exports: [DocumentsService],
})
export class DocumentsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Toutes les routes de documents nécessitent une API Key
    consumer.apply(ApiKeyMiddleware).forRoutes(DocumentsController);
  }
}
