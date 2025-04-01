import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Deliverable, Prisma, Status } from '@prisma/client';
import { UpdateDeliverableDto } from './dto/update-deliverable.dto';
import { CreateDeliverableDto } from './dto/create-deliverable.dto';
import { JsonValue } from '@prisma/client/runtime/library';

@Injectable()
export class DeliverablesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDeliverableDto): Promise<Deliverable> {
    // Ajout de logs pour le débogage
    console.log('CreateDeliverableDto reçu:', JSON.stringify(dto, null, 2));
    console.log('documentIds présents:', dto.documentIds?.length || 0);

    if (dto.documentIds && dto.documentIds.length > 0) {
      console.log('documentIds:', dto.documentIds);
    }

    try {
      // Utiliser une transaction pour s'assurer que tout est créé ou rien ne l'est
      return await this.prisma.executeWithQueue(async () => {
        // Étape 1: Créer le Deliverable sans les documents
        const deliverable = await this.prisma.deliverable.create({
          data: {
            type: dto.type,
            status: 'PENDING',
            project: {
              connect: { id: dto.projectId },
            },
          },
        });

        console.log('Deliverable créé avec ID:', deliverable.id);

        // Étape 2: Si des documentIds sont fournis, créer manuellement les DocumentDeliverable
        if (dto.documentIds && dto.documentIds.length > 0) {
          const documentDeliverables = [];

          for (const documentId of dto.documentIds) {
            console.log(
              'Création de DocumentDeliverable pour document:',
              documentId,
            );

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

            console.log('DocumentDeliverable créé avec ID:', docDeliverable.id);
            documentDeliverables.push(docDeliverable);
          }

          console.log(
            `${documentDeliverables.length} DocumentDeliverable créés`,
          );

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
      console.error('ERREUR lors de la création du deliverable:', error);
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
  async updateStatus(id: string, status: Status): Promise<Deliverable> {
    return this.prisma.executeWithQueue(() =>
      this.prisma.deliverable.update({
        where: { id },
        data: {
          status,
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
