import { Module } from '@nestjs/common';
import { ReferenceImageController } from './reference-image.controller';
import { ReferenceImageService } from './reference-image.service';
import { ReferenceImageRepository } from './reference-image.repository';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ReferenceImageController],
  providers: [ReferenceImageService, ReferenceImageRepository, PrismaService],
  exports: [ReferenceImageService],
})
export class ReferenceImageModule {}
