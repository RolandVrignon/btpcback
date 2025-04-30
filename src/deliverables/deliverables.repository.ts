import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Deliverable, DeliverableType, Prisma, Status } from '@prisma/client';
import { UpdateDeliverableDto } from '@/deliverables/dto/update-deliverable.dto';
import { CreateDeliverableDto } from '@/deliverables/dto/create-deliverable.dto';
import { JsonValue } from '@prisma/client/runtime/library';
import { Logger } from '@nestjs/common';

@Injectable()
export class DeliverablesRepository {
  private readonly logger = new Logger(DeliverablesRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDeliverableDto): Promise<Deliverable> {
    try {
      return await this.prisma.executeWithQueue(async () => {
        const deliverable = await this.prisma.deliverable.create({
          data: {
            type: dto.type,
            status: 'PENDING',
            project: {
              connect: { id: dto.projectId },
            },
            user_prompt: dto.user_prompt ? dto.user_prompt : '',
            new: dto.new ? dto.new : false,
          },
        });

        if (dto.documentIds && dto.documentIds.length > 0) {
          const documentDeliverables = [];

          for (const documentId of dto.documentIds) {
            // Créer chaque DocumentDeliverable un par un
            const docDeliverable = await this.prisma.documentDeliverable.create(
              {
                data: {
                  document: {
                    connect: { id: documentId },
                  },
                  deliverable: {
                    connect: { id: deliverable.id },
                  },
                  usage: 'primary',
                },
              },
            );
            documentDeliverables.push(docDeliverable);
          }

          // Récupérer le deliverable avec ses relations
          return this.prisma.deliverable.findUnique({
            where: { id: deliverable.id },
            include: {
              documents: {
                include: {
                  document: true,
                },
              },
            },
          });
        }

        // Si pas de documentIds, retourner simplement le deliverable
        return deliverable;
      });
    } catch (error) {
      // Capturer et afficher toute erreur lors de la création
      this.logger.error('ERREUR lors de la création du deliverable:', error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateDeliverableDto): Promise<Deliverable> {
    // Create a copy of DTO to safely modify
    const dtoCopy = { ...dto };

    // Remove fields that are not part of the Prisma schema
    // Use optional chaining to safely handle potentially undefined properties
    if ('projectId' in dtoCopy) delete dtoCopy.projectId;
    if ('deliverableId' in dtoCopy) delete dtoCopy.deliverableId;

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

  /**
   * Update only the status of a deliverable
   * @param id Deliverable ID
   * @param status New status
   * @returns Updated deliverable
   */
  async updateStatus(
    id: string,
    status: Status,
    code?: number,
    message?: string,
  ): Promise<{
    id: string;
    status: Status;
    code: number;
    message: string;
    type: DeliverableType | null;
    updated_at: Date;
    projectId: string;
  }> {
    const updateData: {
      status?: Status;
      code?: number;
      message?: string;
    } = {};

    if (status !== null) {
      updateData.status = status;
    }
    if (code !== null) {
      updateData.code = code;
    }
    if (message !== null) {
      updateData.message = message;
    }

    try {
      const deliverable = await this.prisma.executeWithQueue(() =>
        this.prisma.deliverable.update({
          where: { id: id },
          data: updateData,
          select: {
            id: true,
            status: true,
            code: true,
            message: true,
            type: true,
            projectId: true,
          },
        }),
      );
      return {
        id: deliverable.id,
        status: deliverable.status,
        code: deliverable.code,
        message: deliverable.message,
        type: deliverable.type,
        updated_at: new Date(),
        projectId: deliverable.projectId,
      };
    } catch (error) {
      this.logger.error(
        'Deliverable Repository error : ',
        JSON.stringify(error, null, 2),
      );
      return {
        id: '',
        status: Status.ERROR,
        code,
        message:
          'Erreur lors de la mise à jour du statut du deliverable dans le repository updateStatus',
        updated_at: new Date(),
        type: null,
        projectId: '',
      };
    }
  }

  /**
   * Update the result of a deliverable
   * @param id Deliverable ID
   * @param status New status
   * @param result Result data
   * @returns Updated deliverable
   */
  async updateResult(
    id: string,
    status: Status,
    result: JsonValue,
  ): Promise<Deliverable> {
    return this.prisma.executeWithQueue(() =>
      this.prisma.deliverable.update({
        where: { id },
        data: {
          status,
          short_result: result,
          long_result: result,
          updatedAt: new Date(),
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
