import { Injectable, Logger } from '@nestjs/common';
import { Status, Document } from '@prisma/client';
import { DeliverableContext } from '@/deliverables/interfaces/deliverable-context.interface';
import { DeliverablesRepository } from '@/deliverables/deliverables.repository';
import { DocumentsRepository } from '@/documents/documents.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { BaseDeliverableStrategy } from './base-deliverable.strategy';
import { ConfigService } from '@nestjs/config';
import { ProjectsRepository } from '@/projects/projects.repository';
import { preserveFieldOrder } from '@/utils/fieldOrder';
import { FieldOrderObject } from '@/types';
import { JsonValue } from '@prisma/client/runtime/library';
import { DeliverablesService } from '@/deliverables/deliverables.service';

interface FilteredDocument {
  [key: string]: any;
}

interface FieldMapping {
  dbField: string;
  frontField: string;
}

@Injectable()
export class TableauDesDocumentsExaminesStrategy extends BaseDeliverableStrategy {
  protected readonly logger = new Logger(
    TableauDesDocumentsExaminesStrategy.name,
  );

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly deliverablesRepository: DeliverablesRepository,
    protected readonly deliverablesService: DeliverablesService,
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

      const startTime = Date.now();

      await this.deliverablesService.updateStatus(
        context.id,
        Status.PROGRESS,
        'Generating TABLEAU_DES_DOCUMENTS_EXAMINES',
        200,
        context.webhookUrl ? context.webhookUrl : null,
      );

      // Get all documents for the project
      const documents = await this.getProjectDocumentsWithAiFields(
        context.documentIds,
      );

      // Format the data as needed for the deliverable and convert to valid JSON
      const result = JSON.parse(
        JSON.stringify({ result: documents }),
      ) as JsonValue;

      // Update the deliverable with the generated data
      await this.deliverablesRepository.update(context.id, {
        long_result: result,
      });

      await this.deliverablesService.updateStatus(
        context.id,
        Status.COMPLETED,
        'TABLEAU_DES_DOCUMENTS_EXAMINES generated',
        200,
        context.webhookUrl ? context.webhookUrl : null,
      );

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
        short_result: {
          error:
            error instanceof Error
              ? error.message
              : 'Unknown error during generation',
        },
      });

      await this.deliverablesService.updateStatus(
        context.id,
        Status.ERROR,
        'Error generating TABLEAU_DES_DOCUMENTS_EXAMINES deliverable in tableau-des-documents-examines.strategy.ts',
        500,
        context.webhookUrl ? context.webhookUrl : null,
      );
    }
  }

  private async getProjectDocumentsWithAiFields(
    documentIds: string[],
  ): Promise<FieldOrderObject> {
    try {
      // Define fields mapping with exact order matching front-end table columns
      const fieldMappings: FieldMapping[] = [
        { dbField: 'ai_titre_document', frontField: 'Titre du document' },
        { dbField: 'ai_Type_document', frontField: 'Type de document' },
        { dbField: 'ai_lot_identification', frontField: 'Lot' },
        { dbField: 'ai_Version_document', frontField: 'Version' },
        {
          dbField: 'ai_societe_editrice_document',
          frontField: 'Société éditrice',
        },
        { dbField: 'createdAt', frontField: "Date d'upload" },
      ];

      this.logger.log('documentIds:', documentIds);

      // Get all documents for the project
      const allDocuments = await Promise.all(
        documentIds.map(async (id) => {
          const doc = await this.documentsRepository.findOne(id);
          return doc;
        }),
      );

      this.logger.log('allDocuments:', allDocuments);

      // Filter out only the fields we want and rename them for the front-end
      // The order of fields in the output will match the order in fieldMappings
      const documents = allDocuments.map((doc: Document) => {
        const filteredDoc: FilteredDocument = {};

        // Process fields in the specific order defined in fieldMappings
        fieldMappings.forEach((mapping: FieldMapping) => {
          if (mapping.dbField in doc) {
            // Special handling for date field
            if (mapping.dbField === 'createdAt') {
              // Format date as DD/MM/YYYY à HH:MM
              const date = new Date(
                (doc as Record<string, unknown>)[mapping.dbField] as
                  | string
                  | number
                  | Date,
              );
              const day = date.getDate().toString().padStart(2, '0');
              const month = (date.getMonth() + 1).toString().padStart(2, '0');
              const year = date.getFullYear();
              const hours = date.getHours().toString().padStart(2, '0');
              const minutes = date.getMinutes().toString().padStart(2, '0');

              filteredDoc[mapping.frontField] =
                `${day}/${month}/${year} à ${hours}:${minutes}`;
            } else {
              // Normal field handling
              filteredDoc[mapping.frontField] = (
                doc as Record<string, unknown>
              )[mapping.dbField];
            }
          }
        });

        return filteredDoc;
      });

      const result = preserveFieldOrder(documents) as FieldOrderObject;

      return result;
    } catch (error) {
      this.logger.error('Error fetching documents with AI fields:', error);
      return {
        __data: [],
        __fieldOrder: [],
        __isArray: false,
      };
    }
  }
}
