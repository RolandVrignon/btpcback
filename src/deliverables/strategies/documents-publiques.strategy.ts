import { PrismaService } from '../../prisma/prisma.service';
import { DeliverablesRepository } from '../deliverables.repository';
import { DocumentsRepository } from '../../documents/documents.repository';
import { ProjectsRepository } from '../../projects/projects.repository';
import { ConfigService } from '@nestjs/config';
import { DeliverableStrategy } from '../interfaces/deliverable-strategy.interface';
import { DeliverableContext } from '../interfaces/deliverable-context.interface';
import { Status } from '@prisma/client';
import { CityDocumentsResponse } from '../interfaces/city-documents.interface';
import { JsonValue } from '@prisma/client/runtime/library';

export class DocumentsPubliquesStrategy implements DeliverableStrategy {
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

      // Get project info to retrieve city
      const project = await this.projectsRepository.findById(context.projectId);

      if (!project.ai_city) {
        throw new Error('Project city is not defined');
      }

      // Call the n8n webhook to get city documents
      const n8nUrl = this.configService.get<string>('N8N_WEBHOOK_URL');
      const city = project.ai_city;
      const url = `${n8nUrl}/public-docs?ville=${city}`;

      const response = await fetch(url, {
        method: 'GET',
      });

      const data = (await response.json()) as CityDocumentsResponse;

      if (!data) {
        throw new Error('Failed to retrieve city documents');
      }

      // Update deliverable with the result
      await this.deliverablesRepository.updateResult(
        context.id,
        Status.COMPLETED,
        data as unknown as JsonValue,
      );

      const endTime = Date.now();
      const durationInSeconds = (endTime - startTime) / 1000;

      await this.deliverablesRepository.update(context.id, {
        process_duration_in_seconds: durationInSeconds,
      });
    } catch (error) {
      console.error('Error generating DOCUMENTS_PUBLIQUES deliverable:', error);
      await this.deliverablesRepository.updateStatus(context.id, Status.ERROR);
    }
  }
}
