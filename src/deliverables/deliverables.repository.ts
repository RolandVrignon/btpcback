import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Deliverable, Prisma, Document, DeliverableType } from '@prisma/client';
import { UpdateDeliverableDto } from './dto/update-deliverable.dto';

@Injectable()
export class DeliverablesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    projectId: string;
    type: DeliverableType;
  }): Promise<Deliverable> {
    const createData = {
      type: data.type,
      project: {
        connect: { id: data.projectId },
      },
      status: 'DRAFT',
    } satisfies Prisma.DeliverableCreateInput;

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
  }

  async update(id: number, data: UpdateDeliverableDto): Promise<Deliverable> {
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
  }

  async findById(id: number): Promise<Deliverable | null> {
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
  }

  async findDocuments(documentIds: string[]): Promise<Document[]> {
    return await this.prisma.document.findMany({
      where: {
        id: {
          in: documentIds,
        },
      },
    });
  }
}
