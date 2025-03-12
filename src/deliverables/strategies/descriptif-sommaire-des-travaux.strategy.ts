import { Injectable } from '@nestjs/common';
import { BaseDeliverableStrategy } from './base-deliverable.strategy';
import {
  DeliverableResult,
  DeliverableContext,
} from '../interfaces/deliverable-result.interface';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DescriptifSommaireDesTravauxStrategy extends BaseDeliverableStrategy {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  async validate(context: DeliverableContext): Promise<boolean> {
    // Vérifier si les documents requis sont présents
    return this.validateDocuments(context);
  }

  getRequiredDocumentTypes(): string[] {
    return ['CCTP', 'CCAP']; // Documents requis pour un descriptif sommaire
  }

  async generate(context: DeliverableContext): Promise<DeliverableResult> {
    try {
      // 1. Récupérer les documents
      const documents = await this.prisma.document.findMany({
        where: {
          id: { in: context.documentIds },
        },
        include: {
          chunks: true, // Inclure les chunks pour l'analyse
        },
      });

      // 2. Analyser les documents et générer le résumé
      const summary = await this.generateWorkSummary(documents);

      // 3. Retourner le résultat
      return {
        success: true,
        data: summary,
        metadata: {
          documentCount: documents.length,
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async generateWorkSummary(documents: any[]): Promise<any> {
    // TODO: Implémenter la logique spécifique pour générer le résumé des travaux
    // Cette méthode devrait :
    // 1. Extraire les informations pertinentes des documents
    // 2. Organiser les informations de manière structurée
    // 3. Générer un résumé cohérent

    return {
      title: 'Descriptif Sommaire des Travaux',
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
  }
}
