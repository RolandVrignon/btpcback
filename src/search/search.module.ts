import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { ProjectsModule } from '../projects/projects.module';
import { SearchRepository } from './search.repository';

@Module({
  imports: [PrismaModule, EmbeddingsModule, ProjectsModule],
  controllers: [SearchController],
  providers: [SearchService, SearchRepository],
  exports: [SearchService],
})
export class SearchModule {}
