import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { IndexationQueueService } from './indexation-queue.service';
import { IndexationQueueRepository } from './indexation-queue.repository';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [IndexationQueueService, IndexationQueueRepository],
  exports: [IndexationQueueService],
})
export class IndexationQueueModule {}
