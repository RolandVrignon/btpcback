import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ChunksService } from './chunks.service';
import { ChunksController } from './chunks.controller';
import { ApiKeyMiddleware } from '../middleware/api-key.middleware';
import { ChunksRepository } from './chunks.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ChunksController],
  providers: [ChunksService, ChunksRepository],
  exports: [ChunksService],
})
export class ChunksModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Toutes les routes de chunks nécessitent une API Key
    consumer.apply(ApiKeyMiddleware).forRoutes(ChunksController);
  }
}
