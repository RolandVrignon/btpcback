import { Module } from '@nestjs/common';
import { SearchController } from '@/search/search.controller';
import { SearchService } from '@/search/search.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { EmbeddingsModule } from '@/embeddings/embeddings.module';
import { ProjectsModule } from '@/projects/projects.module';
import { ChunksModule } from '@/chunks/chunks.module';
import { SearchRepository } from '@/search/search.repository';
import { ReferenceDocumentsModule } from '@/reference-documents/reference-documents.module';
import { ReferenceEmbeddingsModule } from '@/reference-embeddings/reference-embeddings.module';

@Module({
  imports: [
    PrismaModule,
    EmbeddingsModule,
    ProjectsModule,
    ChunksModule,
    ReferenceDocumentsModule,
    ReferenceEmbeddingsModule,
  ],
  controllers: [SearchController],
  providers: [SearchService, SearchRepository],
  exports: [SearchService],
})
export class SearchModule {}
