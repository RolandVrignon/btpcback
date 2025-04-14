import { PrismaService } from '@/prisma/prisma.service';
import { DeliverablesRepository } from '@/deliverables/deliverables.repository';
import { DocumentsRepository } from '@/documents/documents.repository';
import { ProjectsRepository } from '@/projects/projects.repository';
import { ConfigService } from '@nestjs/config';
import { DeliverableStrategy } from '@/deliverables/interfaces/deliverable-strategy.interface';
import { DeliverableContext } from '@/deliverables/interfaces/deliverable-context.interface';
import { Status } from '@prisma/client';
import { PublicDataResponse } from '@/deliverables/interfaces/public-data.interface';
import { JsonValue } from '@prisma/client/runtime/library';
import { Logger } from '@nestjs/common';

export class GeorisquesStrategy implements DeliverableStrategy {
  private readonly logger = new Logger(GeorisquesStrategy.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly deliverablesRepository: DeliverablesRepository,
    private readonly documentsRepository: DocumentsRepository,
    private readonly projectsRepository: ProjectsRepository,
    private readonly configService: ConfigService,
  ) {}

  async generate(context: DeliverableContext): Promise<void> {
    try {
      const startTime = Date.now();
      // Update deliverable status to PROGRESS
      await this.deliverablesRepository.updateStatus(
        context.id,
        Status.PROGRESS,
      );
      // Get project info to retrieve city and address
      const project = await this.projectsRepository.findById(context.projectId);

      if (!project.ai_city || !project.ai_address) {
        throw new Error('Project city or address is not defined');
      }

      this.logger.log(
        'Generating GEORISQUES => Latitude and longitude:',
        project.latitude,
        project.longitude,
      );

      // Call the n8n webhook to get georisques data
      const n8nUrl = this.configService.get<string>('N8N_WEBHOOK_URL');
      const latitude = project.latitude;
      const longitude = project.longitude;
      const url = `${n8nUrl}/public-data`;

      this.logger.log('Generating GEORISQUES => Calling n8n webhook:', url);

      const payload = {
        latitude,
        longitude,
        publicDataType: 'GEORISQUES',
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as PublicDataResponse;

      if (!data) {
        throw new Error('Failed to retrieve georisques data');
      }

      const endTime = Date.now();
      const durationInSeconds = (endTime - startTime) / 1000;

      // Update deliverable with the result
      await this.deliverablesRepository.updateResult(
        context.id,
        Status.COMPLETED,
        data as unknown as JsonValue,
      );

      await this.deliverablesRepository.update(context.id, {
        process_duration_in_seconds: durationInSeconds,
      });
    } catch (error) {
      this.logger.error('Error generating GEORISQUES deliverable:', error);
      await this.deliverablesRepository.updateStatus(context.id, Status.ERROR);
    }
  }
}
