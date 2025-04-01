import { Injectable, Logger } from '@nestjs/common';
import { Status, Document } from '@prisma/client';
import { DeliverableContext } from '../interfaces/deliverable-context.interface';
import { DeliverablesRepository } from '../deliverables.repository';
import { DocumentsRepository } from '../../documents/documents.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseDeliverableStrategy } from './base-deliverable.strategy';
import { ConfigService } from '@nestjs/config';
import { ProjectsRepository } from 'src/projects/projects.repository';

interface FilteredDocument {
  [key: string]: any;
}

@Injectable()
export class TableauDesDocumentsExaminesStrategy extends BaseDeliverableStrategy {
  private readonly logger = new Logger(
    TableauDesDocumentsExaminesStrategy.name,
  );

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly deliverablesRepository: DeliverablesRepository,
    protected readonly documentsRepository: DocumentsRepository,
    protected readonly projectsRepository: ProjectsRepository,
    private readonly configService: ConfigService,
  ) {
    super(
      prisma,
      deliverablesRepository,
      projectsRepository,
      documentsRepository,
    );
  }

  /**
   * Validate if the context is valid for this deliverable type
   */
  async validate(context: DeliverableContext): Promise<boolean> {
    // Validate project exists
    return this.validateProject(context);
  }

  /**
   * Return the required document types for this deliverable
   * No specific document types required for this deliverable
   */
  getRequiredDocumentTypes(): string[] {
    return [];
  }

  async generate(context: DeliverableContext): Promise<void> {
    try {
      this.logger.log('Start generation of Tableau des documents examinés');

      this.logger.log('context:', context);

      const startTime = Date.now();

      await this.deliverablesRepository.update(context.id, {
        status: Status.PROGRESS,
        projectId: context.projectId,
        deliverableId: context.id,
      });

      // Get all documents for the project
      const documents = await this.getProjectDocumentsWithAiFields(
        context.projectId,
      );

      // Format the data as needed for the deliverable
      const result = {
        result: JSON.parse(JSON.stringify(documents)) as FilteredDocument[],
      };

      this.logger.log('result:', result);

      // Update the deliverable with the generated data
      await this.deliverablesRepository.update(context.id, {
        status: Status.COMPLETED,
        projectId: context.projectId,
        deliverableId: context.id,
        short_result: result,
        long_result: [],
      });

      const endTime = Date.now();
      const durationInSeconds = (endTime - startTime) / 1000;

      await this.deliverablesRepository.update(context.id, {
        process_duration_in_seconds: durationInSeconds,
      });
    } catch (error: unknown) {
      this.logger.error(
        'Error generating tableau des documents examinés:',
        error,
      );
      // Update deliverable status to error
      await this.deliverablesRepository.update(context.id, {
        status: Status.ERROR,
        projectId: context.projectId,
        deliverableId: context.id,
        short_result: {
          error:
            error instanceof Error
              ? error.message
              : 'Unknown error during generation',
        },
      });
    }
  }

  private async getProjectDocumentsWithAiFields(
    projectId: string,
  ): Promise<FilteredDocument[]> {
    try {
      // Define AI fields manually instead of using Prisma's internal _dmmf property
      const fields = [
        'filename',
        'ai_lot_identification',
        'ai_Type_document',
        'version',
        'ai_Maitre_ouvrage',
        'ai_Architecte',
        'ai_Autres_societes',
        'ai_societe_editrice_document',
      ];

      // Get all documents for the project (we will filter fields manually)
      const allDocuments =
        await this.documentsRepository.findByProject(projectId);

      // Filter out only the fields we want
      const documents = allDocuments.map((doc: Document) => {
        const filteredDoc: FilteredDocument = {};
        fields.forEach((field: string) => {
          if (field in doc) {
            // Fix for 'any' type safety warning
            filteredDoc[field] = (doc as Record<string, unknown>)[field];
          }
        });
        return filteredDoc;
      });

      return documents;
    } catch (error) {
      this.logger.error('Error fetching documents with AI fields:', error);
      return [];
    }
  }
}
