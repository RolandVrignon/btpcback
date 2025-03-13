import { Module } from '@nestjs/common';
import { UsageService } from './usage.service';
import { UsageController } from './usage.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GuardsModule } from '../common/guards/guards.module';
import { UsageRepository } from './usage.repository';

@Module({
  imports: [PrismaModule, GuardsModule],
  controllers: [UsageController],
  providers: [UsageService, UsageRepository],
  exports: [UsageService],
})
export class UsageModule {}
