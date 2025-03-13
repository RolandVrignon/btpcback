import {
  DeliverableResult,
  DeliverableContext,
} from '../interfaces/deliverable-result.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { DeliverablesRepository } from '../deliverables.repository';
import { ProjectsRepository } from '../../projects/projects.repository';
import { DocumentsRepository } from '../../documents/documents.repository';

@Injectable()
export abstract class BaseDeliverableStrategy {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly deliverablesRepository: DeliverablesRepository,
    protected readonly projectsRepository: ProjectsRepository,
    protected readonly documentsRepository: DocumentsRepository,
  ) {}

  /**
   * Validate if the context is valid for this deliverable type
   */
  abstract validate(context: DeliverableContext): Promise<boolean>;

  /**
   * Generate the deliverable
   */
  abstract generate(context: DeliverableContext): Promise<DeliverableResult>;

  /**
   * Get required document types for this deliverable
   */
  abstract getRequiredDocumentTypes(): string[];

  /**
   * Common method to check if all required documents are present
   */
  protected async validateDocuments(
    context: DeliverableContext,
  ): Promise<boolean> {
    const documents = await this.documentsRepository.findDocuments(
      context.documentIds,
    );

    const requiredTypes = this.getRequiredDocumentTypes();
    const documentTypes = documents.flatMap((doc) => doc.ai_Type_document);

    return requiredTypes.every((type) => documentTypes.includes(type));
  }

  /**
   * Common method to handle errors during generation
   */
  protected handleError(error: Error): DeliverableResult {
    console.error('Error generating deliverable:', error);
    return {
      success: false,
      data: null,
      error: error.message,
    };
  }

  protected async validateProject(
    context: DeliverableContext,
  ): Promise<boolean> {
    try {
      const project = await this.projectsRepository.findById(context.projectId);
      return !!project;
    } catch (error) {
      console.error('Error validating project:', error);
      return false;
    }
  }
}
