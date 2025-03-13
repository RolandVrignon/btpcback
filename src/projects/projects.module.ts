import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { ProjectsRepository } from './projects.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { ApiKeyMiddleware } from '../middleware/api-key.middleware';

@Module({
  imports: [PrismaModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsRepository],
  exports: [ProjectsService, ProjectsRepository],
})
export class ProjectsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Toutes les routes de projets nécessitent une API Key
    consumer.apply(ApiKeyMiddleware).forRoutes(ProjectsController);
  }
}
