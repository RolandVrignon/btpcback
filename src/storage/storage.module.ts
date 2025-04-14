import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { StorageController } from '@/storage/storage.controller';
import { StorageService } from '@/storage/storage.service';
import { ConfigModule } from '@nestjs/config';
import {
  ApiKeyMiddleware,
  AdminApiKeyMiddleware,
} from '../middleware/api-key.middleware';
import { RequestMethod } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { ProjectsModule } from '@/projects/projects.module';

@Module({
  imports: [ConfigModule, PrismaModule, ProjectsModule],
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Routes standard qui nécessitent une API Key
    consumer
      .apply(ApiKeyMiddleware)
      .forRoutes(
        { path: 'storage/presigned-url', method: RequestMethod.POST },
        { path: 'storage/download', method: RequestMethod.POST },
      );

    // Routes qui nécessitent une API Key admin
    consumer
      .apply(AdminApiKeyMiddleware)
      .forRoutes(
        { path: 'storage/buckets', method: RequestMethod.GET },
        { path: 'storage/bucket', method: RequestMethod.POST },
      );
  }
}
