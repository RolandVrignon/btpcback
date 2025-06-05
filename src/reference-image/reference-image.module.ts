import { Module } from '@nestjs/common';
import { ReferenceImageController } from './reference-image.controller';
import { ReferenceImageService } from './reference-image.service';
import { ReferenceImageRepository } from './reference-image.repository';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReferenceImageController],
  providers: [ReferenceImageService, ReferenceImageRepository],
  exports: [ReferenceImageService],
})
export class ReferenceImageModule {}
