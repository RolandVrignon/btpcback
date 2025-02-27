import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { MulterModule } from '@nestjs/platform-express';
import { ApiKeyMiddleware } from '../middleware/api-key.middleware';
import { UsageModule } from '../usage/usage.module';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads',
    }),
    UsageModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Toutes les routes de documents nécessitent une API Key
    consumer.apply(ApiKeyMiddleware).forRoutes(DocumentsController);
  }
}
