import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { ReferenceDocumentsRepository } from '@/reference-documents/reference-documents.repository';
import { ReferenceDocumentsService } from '@/reference-documents/reference-documents.service';
import { ReferenceDocumentsController } from '@/reference-documents/reference-documents.controller';
import { PrismaService } from '@/prisma/prisma.service';

@Module({
  imports: [PrismaModule],
  providers: [
    ReferenceDocumentsRepository,
    ReferenceDocumentsService,
    PrismaService,
  ],
  controllers: [ReferenceDocumentsController],
  exports: [ReferenceDocumentsRepository, ReferenceDocumentsService],
})
export class ReferenceDocumentsModule {}
