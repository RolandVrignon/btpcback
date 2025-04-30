import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DeliverableFactory } from '@/deliverables/factories/deliverable.factory';
import { CreateDeliverableDto } from '@/deliverables/dto/create-deliverable.dto';
import { DeliverablesRepository } from '@/deliverables/deliverables.repository';
import { DeliverableType } from '@prisma/client';
import { DeliverableContext } from '@/deliverables/interfaces/deliverable-context.interface';
import { DeliverableQueueService } from '@/deliverables/services/deliverable-queue.service';
import { OrganizationEntity } from '@/types';
import { ProjectsRepository } from '@/projects/projects.repository';
import { DocumentsRepository } from '@/documents/documents.repository';
import { UpdateDeliverableDto } from '@/deliverables/dto/update-deliverable.dto';
import { Status } from '@prisma/client';

interface DeliverableProcessEvent {
  deliverableId: string;
  type: DeliverableType;
  projectId: string;
  documentIds: string[];
  user_prompt?: string;
  webhookUrl?: string;
}

@Injectable()
export class DeliverablesService {
  private readonly logger = new Logger(DeliverablesService.name);

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
          user_prompt: data.user_prompt,
          deliverableId: data.deliverableId,
          webhookUrl: data.webhookUrl,
        };
        await strategy.generate(context);
      } catch (error) {
        this.logger.error('Error processing deliverable:', error);
        await this.updateStatus(
          data.deliverableId,
          Status.ERROR,
          'Deliverable failed to generate at processDeliverable in deliverables.service.ts',
          403,
          data.webhookUrl,
        );
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
    const new_deliverable = createDeliverableDto.new || false;

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

    if (!new_deliverable) {
      const existingDeliverables =
        await this.deliverablesRepository.findByProject(projectId);

      const existingDeliverable = existingDeliverables.find(
        (deliverable) => deliverable.type === type,
      );

      if (existingDeliverable) {
        return existingDeliverable;
      }
    }

    const userPrompt = createDeliverableDto.user_prompt || '';

    // Utiliser la relation documents avec create pour ajouter les DocumentDeliverable
    const deliverable = await this.deliverablesRepository.create({
      type,
      projectId,
      documentIds,
      new: new_deliverable,
      user_prompt: userPrompt,
    });

    if (!deliverable) {
      throw new BadRequestException('Failed to create deliverable');
    }

    this.eventEmitter.emit('deliverable.process', {
      deliverableId: deliverable.id.toString(),
      type: deliverable.type,
      projectId: deliverable.projectId,
      documentIds,
      user_prompt: userPrompt,
      webhookUrl: createDeliverableDto.webhookUrl
        ? createDeliverableDto.webhookUrl
        : null,
    });

    return deliverable;
  }

  async findAll(projectId: string, organization: OrganizationEntity) {
    // Verify project access
    const project = await this.projectsRepository.findById(projectId);
    this.logger.log('project', project);
    this.logger.log('organization', organization);
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

  /**
   * Trouve un délivrable existant ou en crée un nouveau et attend sa complétion avec un timeout de 5 minutes
   * @param createDeliverableDto DTO pour la création du délivrable
   * @param organization Organisation qui fait la demande
   * @returns Le délivrable complété
   */
  async findOrCreateAndWaitForDeliverable(
    createDeliverableDto: CreateDeliverableDto,
    organization: OrganizationEntity,
  ) {
    const { projectId, type, new: skipExistenceCheck } = createDeliverableDto;

    if (!skipExistenceCheck) {
      const existingDeliverables =
        await this.deliverablesRepository.findByProject(projectId);

      const existingDeliverable = existingDeliverables.filter(
        (deliverable) => deliverable.type === type,
      );

      const selectedDeliverable =
        existingDeliverable[existingDeliverable.length - 1];

      if (selectedDeliverable && selectedDeliverable.status === 'COMPLETED') {
        this.logger.log(
          `Délivrable existant trouvé de type ${type} pour le projet ${projectId}`,
        );
        return selectedDeliverable;
      }
    } else {
      this.logger.log(
        `Vérification d'existence désactivée, création d'un nouveau délivrable de type ${type} pour le projet ${projectId}`,
      );
    }

    // Création du délivrable
    const deliverable = await this.create(createDeliverableDto, organization);

    // Timeout de 5 minutes (300000 ms)
    const timeoutDuration = 300000;
    const pollInterval = 2000; // 2 secondes entre chaque vérification
    const maxAttempts = timeoutDuration / pollInterval;

    let attempts = 0;

    // Fonction pour vérifier périodiquement l'état du délivrable
    const checkDeliverableStatus = async () => {
      attempts++;

      this.logger.log(`Vérification de l'état du délivrable ${deliverable.id}`);

      const currentDeliverable = await this.findOne(
        deliverable.id,
        organization,
      );

      if (currentDeliverable.status === 'COMPLETED') {
        return currentDeliverable;
      }

      if (currentDeliverable.status === 'ERROR') {
        throw new HttpException(
          'Le délivrable a rencontré une erreur lors de sa génération',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      if (attempts >= maxAttempts) {
        throw new HttpException(
          "Le délai d'attente pour la complétion du délivrable a été dépassé",
          HttpStatus.REQUEST_TIMEOUT,
        );
      }

      // Attendre et réessayer
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      return checkDeliverableStatus();
    };

    // Commencer la vérification
    return checkDeliverableStatus();
  }

  async updateStatus(
    id: string,
    status: Status,
    message?: string,
    code?: number,
    webhookUrl?: string,
  ) {
    const deliverable = await this.deliverablesRepository.updateStatus(
      id,
      status,
      code,
      message,
    );

    const body = {
      id: deliverable.id,
      type: deliverable.type,
      status: deliverable.status,
      code: deliverable.code,
      message: deliverable.message,
      projectId: deliverable.projectId,
      updated_at: deliverable.updated_at,
    };

    if (webhookUrl) {
      try {
        this.logger.log(
          `DELIVERABLE [${id}] = ${deliverable.type} - Envoi au webhook [${webhookUrl}] : \n ${JSON.stringify(body, null, 2)}`,
        );
        await fetch(webhookUrl, {
          method: 'POST',
          body: JSON.stringify(body),
        });
      } catch {
        this.logger.error(
          `DELIVERABLE [${id}] = ${deliverable.type} - Erreur lors de l'envoi au webhook [${webhookUrl}] : \n ${JSON.stringify(body, null, 2)}`,
        );
      }
    }
  }
}
