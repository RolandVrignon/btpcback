import { Module } from '@nestjs/common';
import { ShortUrlService } from './short-url.service';
import { ShortUrlController } from './short-url.controller';
import { ShortUrlRepository } from './short-url.repository';
import { PrismaService } from '@/prisma/prisma.service';

@Module({
  providers: [ShortUrlService, ShortUrlRepository, PrismaService],
  controllers: [ShortUrlController],
  exports: [ShortUrlService],
})
export class ShortUrlModule {}
