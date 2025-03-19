import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Deliverable, Prisma } from '@prisma/client';
import { UpdateDeliverableDto } from './dto/update-deliverable.dto';
import { CreateDeliverableDto } from './dto/create-deliverable.dto';

@Injectable()
export class DeliverablesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDeliverableDto): Promise<Deliverable> {
    return this.prisma.executeWithQueue(() =>
      this.prisma.deliverable.create({
        data: {
          type: dto.type,
          status: 'PENDING',
          project: {
            connect: { id: dto.projectId },
          },
          documents: dto.documentIds
            ? {
                create: dto.documentIds.map((documentId) => ({
                  document: {
                    connect: { id: documentId },
                  },
                  usage: 'primary',
                })),
              }
            : undefined,
        },
        include: {
          documents: {
            include: {
              document: true,
            },
          },
        },
      }),
    );
  }

  async update(id: string, dto: UpdateDeliverableDto): Promise<Deliverable> {
    // Create a copy of DTO to safely modify
    const dtoCopy = { ...dto };

    // Remove fields that are not part of the Prisma schema
    delete dtoCopy.projectId;
    delete dtoCopy.deliverableId;

    const updateData: Prisma.DeliverableUpdateInput = {
      ...dtoCopy,
      updatedAt: new Date(),
    };

    return this.prisma.executeWithQueue(() =>
      this.prisma.deliverable.update({
        where: { id },
        data: updateData,
        include: {
          documents: {
            include: {
              document: true,
            },
          },
        },
      }),
    );
  }

  async findByProject(projectId: string): Promise<Deliverable[]> {
    return this.prisma.executeWithQueue(() =>
      this.prisma.deliverable.findMany({
        where: { projectId },
        include: {
          documents: {
            include: {
              document: true,
            },
          },
        },
      }),
    );
  }

  async findById(id: string): Promise<Deliverable> {
    return this.prisma.executeWithQueue(() =>
      this.prisma.deliverable.findUnique({
        where: { id },
        include: {
          documents: {
            include: {
              document: true,
            },
          },
        },
      }),
    );
  }
}
