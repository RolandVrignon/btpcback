import { Inject, forwardRef, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { DeliverablesRepository } from '@/deliverables/deliverables.repository';
import { DeliverableType } from '@prisma/client';
import { DescriptifSommaireDesTravauxStrategy } from '@/deliverables/strategies/descriptif-sommaire-des-travaux.strategy';
import { TableauDesDocumentsExaminesStrategy } from '@/deliverables/strategies/tableau-des-documents-examines.strategy';
import { DocumentsRepository } from '@/documents/documents.repository';
import { ProjectsRepository } from '@/projects/projects.repository';
import { ChunksRepository } from '@/chunks/chunks.repository';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { DocumentsPubliquesStrategy } from '@/deliverables/strategies/documents-publiques.strategy';
import { GeorisquesStrategy } from '@/deliverables/strategies/georisques.strategy';
import { DeliverablesService } from '@/deliverables/deliverables.service';
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
    @Inject(forwardRef(() => DeliverablesService))
    private readonly deliverablesService: DeliverablesService,
  ) {}

  createStrategy(type: DeliverableType) {
    switch (type) {
      case DeliverableType.DESCRIPTIF_SOMMAIRE_DES_TRAVAUX:
        return new DescriptifSommaireDesTravauxStrategy(
          this.prisma,
          this.deliverablesRepository,
          this.deliverablesService,
          this.documentsRepository,
          this.projectsRepository,
          this.configService,
        );
      case DeliverableType.TABLEAU_DES_DOCUMENTS_EXAMINES:
        return new TableauDesDocumentsExaminesStrategy(
          this.prisma,
          this.deliverablesRepository,
          this.deliverablesService,
          this.documentsRepository,
          this.projectsRepository,
          this.configService,
        );
      case DeliverableType.DOCUMENTS_PUBLIQUES:
        return new DocumentsPubliquesStrategy(
          this.prisma,
          this.deliverablesRepository,
          this.deliverablesService,
          this.documentsRepository,
          this.projectsRepository,
          this.configService,
        );
      case DeliverableType.GEORISQUES:
        return new GeorisquesStrategy(
          this.prisma,
          this.deliverablesRepository,
          this.deliverablesService,
          this.documentsRepository,
          this.projectsRepository,
          this.configService,
        );
      default:
        throw new Error(`Unsupported deliverable type: ${type}`);
    }
  }
}
