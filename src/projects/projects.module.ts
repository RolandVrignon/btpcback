import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { ApiKeyMiddleware } from '../middleware/api-key.middleware';

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Toutes les routes de projets nécessitent une API Key
    consumer.apply(ApiKeyMiddleware).forRoutes(ProjectsController);
  }
}
