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
import { OrganizationsRepository } from './organizations.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrganizationsRepository],
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
