import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { DeliverablesController } from './deliverables.controller';
import { DeliverablesService } from './deliverables.service';
import { DeliverableFactory } from './factories/deliverable.factory';
import { PrismaModule } from '../prisma/prisma.module';
import { DeliverablesRepository } from './deliverables.repository';
import { DeliverableQueueService } from './services/deliverable-queue.service';
import { ConfigModule } from '@nestjs/config';
import { ApiKeyMiddleware } from '../middleware/api-key.middleware';

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
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
