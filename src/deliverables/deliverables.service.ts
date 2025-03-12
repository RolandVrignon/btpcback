import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DeliverableFactory } from './factories/deliverable.factory';
import { CreateDeliverableDto } from './dto/create-deliverable.dto';
import { DeliverableResult } from './interfaces/deliverable-result.interface';
import { DeliverablesRepository } from './deliverables.repository';
import { Deliverable, DeliverableType } from '@prisma/client';
import { DeliverableContext } from './interfaces/deliverable-context.interface';
import { DeliverableQueueService } from './services/deliverable-queue.service';

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
        const strategy = this.deliverableFactory.getStrategy(data.type);
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

  async create(dto: CreateDeliverableDto): Promise<DeliverableResult> {
    const projectId = dto.projectId;
    const type = dto.type;
    const documentIds = dto.documentIds || [];

    if (documentIds.length) {
      const documents =
        await this.deliverablesRepository.findDocuments(documentIds);

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

    const deliverable = (await this.deliverablesRepository.create({
      type,
      projectId,
    })) as Deliverable;

    if (!deliverable) {
      throw new BadRequestException('Failed to create deliverable');
    }

    this.eventEmitter.emit('deliverable.process', {
      deliverableId: deliverable.id.toString(),
      type: deliverable.type,
      projectId: deliverable.projectId,
      documentIds,
    });

    const currentLoad = this.queueService.getCurrentLoad();
    const availableSlots = this.queueService.getAvailableSlots();

    return {
      success: true,
      data: {
        status: 'PENDING',
        message: `Deliverable creation initiated (Queue: ${currentLoad}/${currentLoad + availableSlots} tasks running)`,
      },
      metadata: {
        id: deliverable.id,
        type: deliverable.type,
        projectId: deliverable.projectId,
      }
    };
  }

  async findAll(projectId: string): Promise<Deliverable[]> {
    return this.deliverablesRepository.findByProject(projectId);
  }

  async findOne(id: string): Promise<Deliverable> {
    const deliverable = (await this.deliverablesRepository.findById(
      id,
    )) as Deliverable;
    if (!deliverable) {
      throw new NotFoundException(`Deliverable #${id} not found`);
    }
    return deliverable;
  }
}
