import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { ApikeysService } from '@/apikeys/apikeys.service';
import { ApikeysController } from '@/apikeys/apikeys.controller';
import {
  AdminApiKeyMiddleware,
  ApiKeyMiddleware,
} from '@/middleware/api-key.middleware';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ApikeysController],
  providers: [ApikeysService],
  exports: [ApikeysService],
})
export class ApikeysModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Routes qui nécessitent une API Key standard
    consumer
      .apply(ApiKeyMiddleware)
      .forRoutes(
        { path: 'apikeys', method: RequestMethod.GET },
        { path: 'apikeys/:id', method: RequestMethod.GET },
      );

    // Routes qui nécessitent une API Key admin
    consumer
      .apply(AdminApiKeyMiddleware)
      .forRoutes(
        { path: 'apikeys', method: RequestMethod.POST },
        { path: 'apikeys/:id', method: RequestMethod.DELETE },
      );
  }
}
