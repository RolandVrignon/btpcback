import {
  forwardRef,
  Module,
  NestModule,
  MiddlewareConsumer,
} from '@nestjs/common';
import { ProjectsService } from '@/projects/projects.service';
import { ProjectsController } from '@/projects/projects.controller';
import { ProjectsRepository } from '@/projects/projects.repository';
import { PrismaModule } from '@/prisma/prisma.module';
import { ApiKeyMiddleware } from '@/middleware/api-key.middleware';
import { DeliverablesModule } from '@/deliverables/deliverables.module';
import { DocumentsModule } from '@/documents/documents.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => DeliverablesModule),
    forwardRef(() => DocumentsModule),
  ],
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
