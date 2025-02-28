import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { ApiKeyMiddleware } from '../middleware/api-key.middleware';
import { ProjectsRepository } from './projects.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsRepository],
  exports: [ProjectsService],
})
export class ProjectsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Toutes les routes de projets nécessitent une API Key
    consumer.apply(ApiKeyMiddleware).forRoutes(ProjectsController);
  }
}
