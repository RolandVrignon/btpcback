import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ApikeysModule } from './apikeys/apikeys.module';
import { ProjectsModule } from './projects/projects.module';
import { DocumentsModule } from './documents/documents.module';
import { ChunksModule } from './chunks/chunks.module';
import { EmbeddingsModule } from './embeddings/embeddings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    OrganizationsModule,
    ApikeysModule,
    ProjectsModule,
    DocumentsModule,
    ChunksModule,
    EmbeddingsModule,
  ],
})
export class AppModule {}
