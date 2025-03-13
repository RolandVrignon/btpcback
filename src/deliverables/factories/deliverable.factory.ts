import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DeliverablesRepository } from '../deliverables.repository';
import { DeliverableType } from '@prisma/client';
import { DescriptifSommaireDesTravauxStrategy } from '../strategies/descriptif-sommaire-des-travaux.strategy';
import { DocumentsRepository } from '../../documents/documents.repository';
import { ProjectsRepository } from '../../projects/projects.repository';
import { ChunksRepository } from '../../chunks/chunks.repository';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class DeliverableFactory {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deliverablesRepository: DeliverablesRepository,
    private readonly documentsRepository: DocumentsRepository,
    private readonly projectsRepository: ProjectsRepository,
    private readonly chunksRepository: ChunksRepository,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  createStrategy(type: DeliverableType) {
    switch (type) {
      case DeliverableType.DESCRIPTIF_SOMMAIRE_DES_TRAVAUX:
        return new DescriptifSommaireDesTravauxStrategy(
          this.prisma,
          this.deliverablesRepository,
          this.documentsRepository,
          this.projectsRepository,
          this.configService,
        );
      // Add other cases as needed
      default:
        throw new Error(`Unsupported deliverable type: ${type}`);
    }
  }
}
