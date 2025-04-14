import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';
import { IndexationQueueService } from '@/documents/queue/indexation-queue.service';
import { IndexationQueueRepository } from '@/documents/queue/indexation-queue.repository';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [IndexationQueueService, IndexationQueueRepository],
  exports: [IndexationQueueService],
})
export class IndexationQueueModule {}
