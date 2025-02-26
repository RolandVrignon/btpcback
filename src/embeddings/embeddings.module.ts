import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { EmbeddingsService } from './embeddings.service';
import { EmbeddingsController } from './embeddings.controller';
import { ApiKeyMiddleware } from '../middleware/api-key.middleware';

@Module({
  controllers: [EmbeddingsController],
  providers: [EmbeddingsService],
  exports: [EmbeddingsService],
})
export class EmbeddingsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Toutes les routes d'embeddings nécessitent une API Key
    consumer.apply(ApiKeyMiddleware).forRoutes(EmbeddingsController);
  }
}
