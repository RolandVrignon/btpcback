import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { IndexationQueueService } from './indexation-queue.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [IndexationQueueService],
  exports: [IndexationQueueService],
})
export class IndexationQueueModule {}
