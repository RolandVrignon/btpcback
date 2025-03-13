import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { MulterModule } from '@nestjs/platform-express';
import { ApiKeyMiddleware } from '../middleware/api-key.middleware';
import { UsageModule } from '../usage/usage.module';
import { DocumentsRepository } from './documents.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { ChunksModule } from '../chunks/chunks.module';
import { IndexationQueueModule } from './queue/indexation-queue.module';
import { GuardsModule } from '../common/guards/guards.module';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads',
    }),
    ConfigModule,
    PrismaModule,
    UsageModule,
    EmbeddingsModule,
    ChunksModule,
    IndexationQueueModule,
    GuardsModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentsRepository],
  exports: [DocumentsRepository],
})
export class DocumentsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Toutes les routes de documents nécessitent une API Key
    consumer.apply(ApiKeyMiddleware).forRoutes(DocumentsController);
  }
}
