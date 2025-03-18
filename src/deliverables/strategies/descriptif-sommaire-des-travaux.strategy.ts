import { Injectable } from '@nestjs/common';
import { BaseDeliverableStrategy } from './base-deliverable.strategy';
import { DeliverableResult } from '../interfaces/deliverable-result.interface';
import { DeliverableContext } from '../interfaces/deliverable-context.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { Document, DeliverableType } from '@prisma/client';
import { DeliverablesRepository } from '../deliverables.repository';
import { ConfigService } from '@nestjs/config';
import { DocumentsRepository } from '../../documents/documents.repository';
import { ProjectsRepository } from '../../projects/projects.repository';

interface WorkSummary {
  title: string;
  sections: {
    title: string;
    content: string;
  }[];
  status: string;
  message: string;
}

interface WebhookPayload {
  projectId: string;
  deliverableType: string;
  deliverableId: string;
  projectSummary: string | null;
  documents: {
    id: string;
    filename: string;
    ai_metadata: any;
  }[];
}

@Injectable()
export class DescriptifSommaireDesTravauxStrategy extends BaseDeliverableStrategy {
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

  async validate(context: DeliverableContext): Promise<boolean> {
    return this.validateDocuments(context);
  }

  getRequiredDocumentTypes(): string[] {
    return ['CCTP', 'CCAP'];
  }

  async generate(context: DeliverableContext): Promise<void> {
    try {
      console.log('Document IDs received:', context.documentIds);

      let documents;

      // If no document IDs are provided, fetch all documents from the project
      if (!context.documentIds || context.documentIds.length === 0) {
        console.log('No document IDs provided, fetching all project documents');
        documents = await this.documentsRepository.findByProject(
          context.projectId,
        );
        console.log(
          'Found',
          documents?.length || 0,
          'documents in the project',
        );
      } else {
        documents = await this.documentsRepository.findDocumentsWithChunks(
          context.documentIds,
        );
      }
      console.log('Documents found:', documents?.length || 0);

      if (!documents?.length) {
        console.warn('No documents found for the project or provided IDs');
      } else {
        console.log('First document ID:', documents[0]?.id);
        // Check if chunks exist in a type-safe way
        const firstDoc = documents[0] as any;
        console.log(
          'First document has chunks:',
          firstDoc?.chunks && Array.isArray(firstDoc.chunks)
            ? firstDoc.chunks.length
            : 'No chunks property',
        );
      }

      await this.generateWorkSummary(documents, context.projectId, context.id);
    } catch (error: unknown) {
      console.error('Error generating deliverable:', error);
      // Don't return anything in the error case since the return type is void
      if (error instanceof Error) {
        this.handleError(error);
      } else {
        // Update the deliverable with an error status
        await this.deliverablesRepository.update(context.id, {
          status: 'ERROR',
          error: 'Une erreur inattendue est survenue',
        } as any);
      }
    }
  }

  private async generateWorkSummary(
    documents: Document[],
    projectId: string,
    deliverableId: string,
  ): Promise<WorkSummary> {
    console.log('START DESCRIPTIF SOMMAIRE DES TRAVAUX');

    // Trigger the webhook
    await this.triggerWebhook(documents, projectId, deliverableId);

    // Return a placeholder result until the webhook processes the data
    return {
      title: 'Descriptif Sommaire des Travaux',
      sections: [
        {
          title: 'Traitement en cours',
          content:
            'Le descriptif sommaire des travaux est en cours de génération.',
        },
      ],
      status: 'PROGRESS',
      message: 'Traitement en cours via le service externe',
    };
  }

  private async analyzeDocuments(documents: Document[]): Promise<void> {
    console.log('Analyzing documents:', documents.length);
    await Promise.resolve();
  }

  private async triggerWebhook(
    documents: Document[],
    projectId: string,
    deliverableId: string,
  ): Promise<void> {
    console.log(
      'triggerWebhook called with documents:',
      documents?.length || 0,
    );

    // Get project details to include the long_summary
    const project = await this.projectsRepository.findById(projectId);

    // Ensure project is valid before using it
    if (!project || typeof project !== 'object') {
      console.warn('Project not found or invalid');
      return;
    }
    // Prepare document data for the webhook
    const documentData = await Promise.all(
      documents.map((doc) => {
        let result;

        if (doc.ai_metadata && typeof doc.ai_metadata === 'object') {
          const data = doc.ai_metadata['__data'];
          if (data && typeof data === 'object') {
            const procedes = data['Procédés à risque'];
            if (procedes && typeof procedes === 'object') {
              result = {
                'Procédés à risques': procedes['__data'],
              };
            }
          }
        }

        return {
          id: doc.id,
          filename: doc.filename,
          ai_metadata: result,
        };
      }),
    );

    // Prepare the webhook payload
    const payload: WebhookPayload = {
      projectId,
      deliverableType: DeliverableType.DESCRIPTIF_SOMMAIRE_DES_TRAVAUX,
      deliverableId,
      projectSummary: project.long_summary,
      documents: documentData,
    };

    const n8nPromise = (async () => {
      try {
        // Convertir le payload en JSON
        const payloadStringified = JSON.stringify(payload);

        // Calculer la taille du payload en octets
        const payloadSizeInBytes = new TextEncoder().encode(
          payloadStringified,
        ).length;

        // Convertir en KB et MB pour une meilleure lisibilité
        const payloadSizeInKB = payloadSizeInBytes / 1024;
        const payloadSizeInMB = payloadSizeInKB / 1024;

        // Afficher la taille du payload
        console.log('Nombre de documents:', payload.documents?.length || 0);
        console.log(
          `Taille du payload: ${payloadSizeInBytes} octets (${payloadSizeInKB.toFixed(2)} KB, ${payloadSizeInMB.toFixed(2)} MB)`,
        );

        const n8nWebhookUrl = this.configService.get<string>(
          'N8N_WEBHOOK_URL_PROD',
        );
        console.log('n8nWebhookUrl:', n8nWebhookUrl);

        if (!n8nWebhookUrl) {
          console.warn(
            'N8N_WEBHOOK_URL is not defined in environment variables',
          );
          return;
        }

        console.log('n8nWebhookUrl', `${n8nWebhookUrl}/deliverable`);
        console.log('Sending data to n8n webhook...');
        const url = `${n8nWebhookUrl}/deliverable`;
        console.log('url:', url);

        // Créer une promesse pour la requête n8n
        const n8nResponse = await (async () => {
          try {
            const res = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: payloadStringified,
            });

            if (res.ok) {
              console.log('Data successfully sent to n8n webhook.');
            } else {
              console.error(
                'Error sending data to n8n webhook:',
                res.status,
                res.statusText,
              );
            }
            return res;
          } catch (error) {
            console.error('Error sending data to n8n webhook:', error);
            throw error;
          }
        })();

        if (n8nResponse.ok) {
          console.log('Webhook n8n completed successfully.');
        } else {
          console.error('Webhook n8n failed.');
        }
      } catch (error) {
        console.error('Error sending data to n8n webhook:', error);
      }
    })();

    await n8nPromise;

    return;
  }
}
