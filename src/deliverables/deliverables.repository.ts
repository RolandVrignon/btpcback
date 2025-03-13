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
        type: dto.type,
        status: 'PENDING',
        project: {
          connect: { id: dto.projectId }
        },
        documents: dto.documentIds ? {
          create: dto.documentIds.map(documentId => ({
            document: {
              connect: { id: documentId }
            },
            usage: 'primary'
          }))
        } : undefined
      },
      include: {
        documents: {
          include: {
            document: true
          }
        }
      }
    });
  }

  async update(id: string, dto: UpdateDeliverableDto): Promise<Deliverable> {
    const updateData: Prisma.DeliverableUpdateInput = {
      ...dto,
      updatedAt: new Date(),
    };

    return this.prisma.deliverable.update({
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
  }

  async findByProject(projectId: string): Promise<Deliverable[]> {
    return this.prisma.deliverable.findMany({
      where: { projectId },
      include: {
        documents: {
          include: {
            document: true
          }
        }
      }
    });
  }

  async findById(id: string): Promise<Deliverable> {
    return this.prisma.deliverable.findUnique({
      where: { id },
      include: {
        documents: {
          include: {
            document: true
          }
        }
      }
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
