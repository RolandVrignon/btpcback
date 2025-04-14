import { Injectable, Logger } from '@nestjs/common';
import { BaseDeliverableStrategy } from './base-deliverable.strategy';
import { DeliverableContext } from '@/deliverables/interfaces/deliverable-context.interface';
import { PrismaService } from '@/prisma/prisma.service';
import { Document, DeliverableType } from '@prisma/client';
import { DeliverablesRepository } from '@/deliverables/deliverables.repository';
import { ConfigService } from '@nestjs/config';
import { DocumentsRepository } from '@/documents/documents.repository';
import { ProjectsRepository } from '@/projects/projects.repository';
import { JSONValue } from 'ai';

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
    ai_metadata: JSONValue;
  }[];
  userPrompt: string;
}

@Injectable()
export class DescriptifSommaireDesTravauxStrategy extends BaseDeliverableStrategy {
  protected readonly logger = new Logger(
    DescriptifSommaireDesTravauxStrategy.name,
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

  async validate(context: DeliverableContext): Promise<boolean> {
    return this.validateDocuments(context);
  }

  getRequiredDocumentTypes(): string[] {
    return ['CCTP', 'CCAP'];
  }

  async generate(context: DeliverableContext): Promise<void> {
    try {
      this.logger.log('Document IDs received:', context.documentIds);

      let documents: Document[];

      // If no document IDs are provided, fetch all documents from the project
      if (!context.documentIds || context.documentIds.length === 0) {
        this.logger.log(
          'No document IDs provided, fetching all project documents',
        );
        documents = await this.documentsRepository.findByProject(
          context.projectId,
        );
        this.logger.log('Found', documents.length, 'documents in the project');
      } else {
        documents = await this.documentsRepository.findDocumentsWithChunks(
          context.documentIds,
        );
      }
      this.logger.log('Documents found:', documents.length);

      if (!documents.length) {
        this.logger.warn('No documents found for the project or provided IDs');
      } else {
        this.logger.log('First document ID:', documents[0].id);
        // Check if chunks exist in a type-safe way
        const firstDoc = documents[0];
        const hasChunks =
          'chunks' in firstDoc &&
          Array.isArray((firstDoc as Document & { chunks?: unknown[] }).chunks);
        this.logger.log(
          'First document has chunks:',
          hasChunks
            ? (firstDoc as Document & { chunks?: unknown[] }).chunks.length
            : 'No chunks property',
        );
      }

      await this.generateWorkSummary(documents, context);
    } catch (error: unknown) {
      this.logger.error('Error generating deliverable:', error);
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
    context: DeliverableContext,
  ): Promise<WorkSummary> {
    this.logger.log('START DESCRIPTIF SOMMAIRE DES TRAVAUX');

    // Trigger the webhook
    await this.triggerWebhook(documents, context);

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
    this.logger.log('Analyzing documents:', documents.length);
    await Promise.resolve();
  }

  private async triggerWebhook(
    documents: Document[],
    context: DeliverableContext,
  ): Promise<void> {
    this.logger.log('triggerWebhook called with documents:', documents.length);

    // Get project details to include the long_summary
    const project = await this.projectsRepository.findById(context.projectId);

    // Ensure project is valid before using it
    if (!project || typeof project !== 'object') {
      this.logger.warn('Project not found or invalid');
      return;
    }

    // Prepare document data for the webhook
    const documentData = await Promise.all(
      documents.map((doc) => {
        const metadata = this.documentsRepository.restoreFieldOrder(
          doc.ai_metadata,
        ) as JSONValue;

        return {
          id: doc.id,
          filename: doc.filename,
          ai_metadata: metadata,
        };
      }),
    );

    // Prepare the webhook payload
    const payload: WebhookPayload = {
      projectId: context.projectId,
      deliverableType: DeliverableType.DESCRIPTIF_SOMMAIRE_DES_TRAVAUX,
      deliverableId: context.deliverableId,
      projectSummary: project.long_summary,
      documents: documentData,
      userPrompt: context.user_prompt,
    };

    const n8nPromise = (async () => {
      try {
        const startTime = Date.now();
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
        this.logger.log('Nombre de documents:', payload.documents.length);
        this.logger.log(
          `Taille du payload: ${payloadSizeInBytes} octets (${payloadSizeInKB.toFixed(2)} KB, ${payloadSizeInMB.toFixed(2)} MB)`,
        );

        const n8nWebhookUrl = this.configService.get<string>('N8N_WEBHOOK_URL');
        this.logger.log('n8nWebhookUrl:', n8nWebhookUrl);

        if (!n8nWebhookUrl) {
          this.logger.warn(
            'N8N_WEBHOOK_URL is not defined in environment variables',
          );
          return;
        }

        this.logger.log('n8nWebhookUrl', `${n8nWebhookUrl}/deliverable`);
        this.logger.log('Sending data to n8n webhook...');
        const url = `${n8nWebhookUrl}/deliverable`;
        this.logger.log('url:', url);

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
              this.logger.log('Data successfully sent to n8n webhook.');
            } else {
              this.logger.error(
                'Error sending data to n8n webhook:',
                res.status,
                res.statusText,
              );
            }
            return res;
          } catch (error) {
            this.logger.error('Error sending data to n8n webhook:', error);
            throw error;
          }
        })();

        const endTime = Date.now();
        const durationInSeconds = (endTime - startTime) / 1000;

        if (n8nResponse.ok) {
          this.logger.log('Webhook n8n completed successfully.');
          await this.deliverablesRepository.update(context.deliverableId, {
            process_duration_in_seconds: durationInSeconds,
          });
        } else {
          this.logger.error('Webhook n8n failed.');
        }
      } catch (error) {
        this.logger.error('Error sending data to n8n webhook:', error);
      }
    })();

    await n8nPromise;

    return;
  }
}
