import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ApikeysModule } from './apikeys/apikeys.module';
import { ProjectsModule } from './projects/projects.module';
import { DocumentsModule } from './documents/documents.module';
import { ChunksModule } from './chunks/chunks.module';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { StorageModule } from './storage/storage.module';
import { UsageModule } from './usage/usage.module';
import { SearchModule } from './search/search.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DeliverablesModule } from './deliverables/deliverables.module';
import { SharedModule } from './shared/shared.module';
import { ChatIframeModule } from './chat-iframe/chat-iframe.module';
import { ShortUrlModule } from './short-url/short-url.module';
import { ReferenceImageModule } from './reference-image/reference-image.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    SharedModule,
    OrganizationsModule,
    ApikeysModule,
    ProjectsModule,
    DocumentsModule,
    ChunksModule,
    EmbeddingsModule,
    StorageModule,
    UsageModule,
    SearchModule,
    DeliverablesModule,
    ChatIframeModule,
    ShortUrlModule,
    ReferenceImageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
