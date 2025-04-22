import {
  forwardRef,
  Module,
  NestModule,
  MiddlewareConsumer,
} from '@nestjs/common';
import { DeliverablesController } from '@/deliverables/deliverables.controller';
import { DeliverablesService } from '@/deliverables/deliverables.service';
import { DeliverableFactory } from '@/deliverables/factories/deliverable.factory';
import { PrismaModule } from '@/prisma/prisma.module';
import { DeliverablesRepository } from '@/deliverables/deliverables.repository';
import { DeliverableQueueService } from '@/deliverables/services/deliverable-queue.service';
import { ConfigModule } from '@nestjs/config';
import { ApiKeyMiddleware } from '@/middleware/api-key.middleware';
import { HttpModule } from '@nestjs/axios';
import { DocumentsModule } from '@/documents/documents.module';
import { ProjectsModule } from '@/projects/projects.module';
import { ChunksModule } from '@/chunks/chunks.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule,
    DocumentsModule,
    forwardRef(() => ProjectsModule),
    ChunksModule,
  ],
  controllers: [DeliverablesController],
  providers: [
    DeliverablesService,
    DeliverableFactory,
    DeliverablesRepository,
    DeliverableQueueService,
  ],
  exports: [DeliverablesService],
})
export class DeliverablesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Toutes les routes de livrables nécessitent une API Key
    consumer.apply(ApiKeyMiddleware).forRoutes(DeliverablesController);
  }
}
