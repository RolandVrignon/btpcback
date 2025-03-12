import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Deliverable,
  Prisma,
  Document,
  DeliverableType,
  DocumentCategory,
  Project,
} from '@prisma/client';
import { UpdateDeliverableDto } from './dto/update-deliverable.dto';
import { CreateDeliverableDto } from './dto/create-deliverable.dto';

@Injectable()
export class DeliverablesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDeliverableDto): Promise<Deliverable> {
    return this.prisma.deliverable.create({
      data: {
        projectId: dto.projectId,
        type: dto.type,
        status: 'PENDING',
        documentIds: dto.documentIds || [],
      },
    });
  }

  async update(id: string, dto: UpdateDeliverableDto): Promise<Deliverable> {
    const updateData: Prisma.DeliverableUpdateInput = {
      ...dto,
      updatedAt: new Date(),
    };

    return this.prisma.executeWithQueue<Deliverable>(async () => {
      return await this.prisma.deliverable.update({
        where: { id },
        data: updateData,
        include: {
          documents: {
            include: {
              document: true,
            },
          },
        },
      });
    });
  }

  async findByProject(projectId: string): Promise<Deliverable[]> {
    return this.prisma.deliverable.findMany({
      where: { projectId },
    });
  }

  async findById(id: string): Promise<Deliverable> {
    return this.prisma.deliverable.findUnique({
      where: { id },
    });
  }

  async findDocuments(documentIds: string[]): Promise<Document[]> {
    return this.prisma.document.findMany({
      where: {
        id: {
          in: documentIds,
        },
      },
    });
  }

  async findDocumentsWithChunks(documentIds: string[]): Promise<Document[]> {
    return this.prisma.document.findMany({
      where: {
        id: {
          in: documentIds,
        },
      },
      include: {
        chunks: true,
      },
    });
  }

  async findProject(projectId: string): Promise<Project> {
    return this.prisma.project.findUnique({
      where: { id: projectId },
    });
  }
}
