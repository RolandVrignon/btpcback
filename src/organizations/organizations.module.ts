import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import {
  AdminApiKeyMiddleware,
  ApiKeyMiddleware,
} from '../middleware/api-key.middleware';

@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Routes qui nécessitent une API Key admin
    consumer
      .apply(AdminApiKeyMiddleware)
      .forRoutes(
        { path: 'organizations', method: RequestMethod.POST },
        { path: 'organizations', method: RequestMethod.GET },
        { path: 'organizations/:id', method: RequestMethod.GET },
        { path: 'organizations/:id', method: RequestMethod.DELETE },
      );
  }
}
