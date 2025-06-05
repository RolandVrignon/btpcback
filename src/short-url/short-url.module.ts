import { Module } from '@nestjs/common';
import { ShortUrlService } from './short-url.service';
import { ShortUrlController } from './short-url.controller';
import { ShortUrlRepository } from './short-url.repository';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ShortUrlService, ShortUrlRepository],
  controllers: [ShortUrlController],
  exports: [ShortUrlService],
})
export class ShortUrlModule {}
