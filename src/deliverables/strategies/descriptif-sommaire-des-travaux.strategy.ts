import { Injectable } from '@nestjs/common';
import { BaseDeliverableStrategy } from './base-deliverable.strategy';
import { DeliverableResult } from '../interfaces/deliverable-result.interface';
import { DeliverableContext } from '../interfaces/deliverable-context.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { Document, DeliverableType, Prisma } from '@prisma/client';

interface WorkSummary {
  title: string;
  sections: {
    title: string;
    content: string;
  }[];
  status: string;
  message: string;
}

@Injectable()
export class DescriptifSommaireDesTravauxStrategy extends BaseDeliverableStrategy {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  async validate(context: DeliverableContext): Promise<boolean> {
    return this.validateDocuments(context);
  }

  getRequiredDocumentTypes(): string[] {
    return ['CCTP', 'CCAP'];
  }

  async generate(context: DeliverableContext): Promise<DeliverableResult> {
    try {
      const documents = await this.prisma.document.findMany({
        where: {
          id: { in: context.documentIds },
        },
        include: {
          chunks: true,
        },
      });

      const summary = await this.generateWorkSummary(documents);
      const jsonResult = JSON.stringify(summary);

      // Mettre à jour le livrable existant
      const updatedDeliverable = await this.prisma.deliverable.update({
        where: {
          id: context.id,
        },
        data: {
          type: DeliverableType.DESCRIPTIF_SOMMAIRE_DES_TRAVAUX,
          result: jsonResult as Prisma.JsonValue,
          status: 'COMPLETED',
          updatedAt: new Date(),
        },
      });

      console.log('Updated deliverable:', updatedDeliverable);

      return {
        success: true,
        data: {
          status: summary.status,
          message: summary.message,
        },
        metadata: {
          documentCount: documents.length,
          generatedAt: new Date().toISOString(),
          deliverableId: updatedDeliverable.id,
          title: summary.title,
          sections: summary.sections,
        },
      };
    } catch (error) {
      console.error('Error generating deliverable:', error);
      if (error instanceof Error) {
        return this.handleError(error);
      }
      return {
        success: false,
        data: null,
        error: 'Une erreur inattendue est survenue',
      };
    }
  }

  private async generateWorkSummary(
    documents: Document[],
  ): Promise<WorkSummary> {
    console.log('START DESCRIPTIF SOMMAIRE DES TRAVAUX');
    await this.analyzeDocuments(documents);

    const result: WorkSummary = {
      title: 'Descriptif Sommaire des Travaux',
      status: 'COMPLETED',
      message: 'Génération réussie',
      sections: [
        {
          title: 'Présentation du Projet',
          content: 'À implémenter',
        },
        {
          title: 'Description des Travaux',
          content: 'À implémenter',
        },
        {
          title: 'Points Clés',
          content: 'À implémenter',
        },
      ],
    };

    return result;
  }

  private async analyzeDocuments(documents: Document[]): Promise<void> {
    // Cette méthode sera implémentée pour analyser le contenu des documents
    console.log('Analyzing documents:', documents.length);
    await Promise.resolve();
  }
}
