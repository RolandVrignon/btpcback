import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ChunksService } from './chunks.service';
import { ChunksController } from './chunks.controller';
import { ApiKeyMiddleware } from '../middleware/api-key.middleware';

@Module({
  controllers: [ChunksController],
  providers: [ChunksService],
  exports: [ChunksService],
})
export class ChunksModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Toutes les routes de chunks nécessitent une API Key
    consumer.apply(ApiKeyMiddleware).forRoutes(ChunksController);
  }
}
