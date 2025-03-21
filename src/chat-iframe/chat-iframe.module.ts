import { Module } from '@nestjs/common';
import { ChatIframeController } from './chat-iframe.controller';
import { ChatIframeService } from './chat-iframe.service';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'public', 'chat-iframe'),
      serveRoot: '/chat',
    }),
  ],
  controllers: [ChatIframeController],
  providers: [ChatIframeService],
})
export class ChatIframeModule {}
