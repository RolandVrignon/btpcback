import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DeliverableFactory } from './factories/deliverable.factory';
import { CreateDeliverableDto } from './dto/create-deliverable.dto';
import { DeliverablesRepository } from './deliverables.repository';
import { Deliverable, DeliverableType } from '@prisma/client';
import { DeliverableContext } from './interfaces/deliverable-context.interface';
import { DeliverableQueueService } from './services/deliverable-queue.service';
import { OrganizationEntity } from '../types';
import { ProjectsRepository } from '../projects/projects.repository';
import { DocumentsRepository } from '../documents/documents.repository';
import { UpdateDeliverableDto } from './dto/update-deliverable.dto';

interface DeliverableProcessEvent {
  deliverableId: string;
  type: DeliverableType;
  projectId: string;
  documentIds: string[];
}

@Injectable()
export class DeliverablesService {
  constructor(
    private readonly deliverablesRepository: DeliverablesRepository,
    private readonly deliverableFactory: DeliverableFactory,
    private readonly eventEmitter: EventEmitter2,
    private readonly queueService: DeliverableQueueService,
    private readonly projectsRepository: ProjectsRepository,
    private readonly documentsRepository: DocumentsRepository,
  ) {
    this.eventEmitter.on(
      'deliverable.process',
      (data: DeliverableProcessEvent) => {
        void this.processDeliverable(data);
      },
    );
  }

  private async processDeliverable(
    data: DeliverableProcessEvent,
  ): Promise<void> {
    await this.queueService.processTask(async () => {
      try {
        const strategy = this.deliverableFactory.createStrategy(data.type);
        const context: DeliverableContext = {
          id: data.deliverableId,
          type: data.type,
          projectId: data.projectId,
          documentIds: data.documentIds,
        };
        await strategy.generate(context);
      } catch (error) {
        console.error('Error processing deliverable:', error);
        // Ici, vous pourriez mettre à jour le statut du livrable en ERROR
      }
    });
  }

  async create(
    createDeliverableDto: CreateDeliverableDto,
    organization: OrganizationEntity,
  ) {
    // Verify project access
    const project = await this.projectsRepository.findById(
      createDeliverableDto.projectId,
    );

    if (project.organizationId !== organization.id) {
      throw new ForbiddenException('Accès non autorisé au projet');
    }

    const projectId = createDeliverableDto.projectId;
    const type = createDeliverableDto.type;
    const documentIds = createDeliverableDto.documentIds || [];

    if (documentIds.length) {
      const documents =
        await this.documentsRepository.findDocuments(documentIds);

      if (documents.length !== documentIds.length) {
        throw new BadRequestException('Some documents were not found');
      }

      const invalidDocuments = documents.filter(
        (doc) => doc.projectId !== projectId,
      );
      if (invalidDocuments.length > 0) {
        throw new BadRequestException(
          'Some documents do not belong to the project',
        );
      }
    }

    const deliverable = await this.deliverablesRepository.create({
      type,
      projectId,
    });

    if (!deliverable) {
      throw new BadRequestException('Failed to create deliverable');
    }

    this.eventEmitter.emit('deliverable.process', {
      deliverableId: deliverable.id.toString(),
      type: deliverable.type,
      projectId: deliverable.projectId,
      documentIds,
    });

    return deliverable;
  }

  async findAll(projectId: string, organization: OrganizationEntity) {
    // Verify project access
    const project = await this.projectsRepository.findById(projectId);
    if (project.organizationId !== organization.id) {
      throw new ForbiddenException('Accès non autorisé au projet');
    }

    return this.deliverablesRepository.findByProject(projectId);
  }

  async findOne(id: string, organization: OrganizationEntity) {
    const deliverable = await this.deliverablesRepository.findById(id);
    if (!deliverable) {
      throw new NotFoundException(`Deliverable #${id} not found`);
    }

    // Verify project access
    const project = await this.projectsRepository.findById(
      deliverable.projectId,
    );
    if (project.organizationId !== organization.id) {
      throw new ForbiddenException('Accès non autorisé au livrable');
    }

    return deliverable;
  }

  async updateDeliverable(updateDeliverableDto: UpdateDeliverableDto) {
    // First, verify the deliverable belongs to the specified project
    const deliverable = await this.deliverablesRepository.findById(
      updateDeliverableDto.deliverableId,
    );

    if (!deliverable) {
      throw new NotFoundException(
        `Deliverable with ID ${updateDeliverableDto.deliverableId} not found`,
      );
    }

    if (deliverable.projectId !== updateDeliverableDto.projectId) {
      throw new ForbiddenException(
        `Deliverable with ID ${updateDeliverableDto.deliverableId} does not belong to project with ID ${updateDeliverableDto.projectId}`,
      );
    }

    // Prepare update data (remove projectId and deliverableId from the update payload)
    const updatePayload = Object.fromEntries(
      Object.entries(updateDeliverableDto).filter(([key]) => {
        return key !== 'projectId' && key !== 'deliverableId';
      }),
    );

    // Update the deliverable
    const updatedDeliverable = await this.deliverablesRepository.update(
      updateDeliverableDto.deliverableId,
      updatePayload as UpdateDeliverableDto,
    );

    return {
      success: true,
      data: updatedDeliverable,
    };
  }
}
