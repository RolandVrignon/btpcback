import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { ReferenceEmbeddingsRepository } from '@/reference-embeddings/reference-embeddings.repository';
import { ReferenceEmbeddingsService } from '@/reference-embeddings/reference-embeddings.service';

@Module({
  imports: [PrismaModule],
  providers: [ReferenceEmbeddingsRepository, ReferenceEmbeddingsService],
  exports: [ReferenceEmbeddingsRepository, ReferenceEmbeddingsService],
})
export class ReferenceEmbeddingsModule {}
