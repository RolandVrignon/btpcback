import { Module } from '@nestjs/common';
import { ChatIframeController } from '@/chat-iframe/chat-iframe.controller';
import { ChatIframeService } from '@/chat-iframe/chat-iframe.service';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from '@/prisma/prisma.module';
import { SearchModule } from '@/search/search.module';
import { DocumentsModule } from '@/documents/documents.module';
import { ProjectsModule } from '@/projects/projects.module';
import { DeliverablesModule } from '@/deliverables/deliverables.module';

@Module({
  imports: [
    PrismaModule,
    SearchModule,
    DocumentsModule,
    ProjectsModule,
    DeliverablesModule,
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public', 'chat'),
      serveRoot: '/chat',
    }),
  ],
  controllers: [ChatIframeController],
  providers: [ChatIframeService],
})
export class ChatIframeModule {}
