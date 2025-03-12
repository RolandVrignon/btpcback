import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Deliverable,
  Prisma,
  Document,
  DeliverableType,
  DocumentCategory,
} from '@prisma/client';
import { UpdateDeliverableDto } from './dto/update-deliverable.dto';

@Injectable()
export class DeliverablesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    projectId: string;
    type: DeliverableType;
    documentIds?: string[];
  }): Promise<Deliverable> {
    return this.prisma.executeWithQueue<Deliverable>(async () => {
      // First, get all PROJECT documents if no specific documents are provided
      const documentsToConnect = data.documentIds
        ? await this.prisma.document.findMany({
            where: {
              id: {
                in: data.documentIds,
              },
              projectId: data.projectId,
            },
            select: { id: true },
          })
        : await this.prisma.document.findMany({
            where: {
              projectId: data.projectId,
              category: DocumentCategory.PROJECT,
            },
            select: { id: true },
          });

      const createData: Prisma.DeliverableCreateInput = {
        type: data.type,
        project: {
          connect: { id: data.projectId },
        },
        status: 'DRAFT',
        documents: {
          create: documentsToConnect.map((doc) => ({
            documentId: doc.id,
            usage: 'primary',
          })),
        },
      };

      return await this.prisma.deliverable.create({
        data: createData,
        include: {
          project: true,
          documents: {
            include: {
              document: true,
            },
          },
        },
      });
    });
  }

  async update(id: string, data: UpdateDeliverableDto): Promise<Deliverable> {
    const updateData: Prisma.DeliverableUpdateInput = {
      ...data,
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
    return this.prisma.executeWithQueue<Deliverable[]>(async () => {
      return await this.prisma.deliverable.findMany({
        where: { projectId },
        include: {
          documents: {
            include: {
              document: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });
  }

  async findById(id: string): Promise<Deliverable | null> {
    return this.prisma.executeWithQueue<Deliverable | null>(async () => {
      return await this.prisma.deliverable.findUnique({
        where: { id },
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

  async findDocuments(documentIds: string[]): Promise<Document[]> {
    return this.prisma.executeWithQueue<Document[]>(async () => {
      return await this.prisma.document.findMany({
        where: {
          id: {
            in: documentIds,
          },
        },
      });
    });
  }

  async findDocumentsWithChunks(documentIds: string[]): Promise<Document[]> {
    return this.prisma.executeWithQueue<Document[]>(async () => {
      return await this.prisma.document.findMany({
        where: {
          id: {
            in: documentIds,
          },
        },
        include: {
          chunks: true,
        },
      });
    });
  }
}
