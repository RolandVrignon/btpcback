import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateDocumentDto } from '@/documents/dto/create-document.dto';
import { UpdateDocumentDto } from '@/documents/dto/update-document.dto';
import { Status, Prisma, Document } from '@prisma/client';
import { preserveFieldOrder, restoreFieldOrder } from '@/utils/fieldOrder';
import { JsonValue } from '@prisma/client/runtime/library';

@Injectable()
export class DocumentsRepository {
  private readonly logger = new Logger(DocumentsRepository.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Crée un nouveau document dans la base de données
   */
  async create(data: CreateDocumentDto): Promise<Document> {
    return this.prisma.executeWithQueue<Document>(async () => {
      return await this.prisma.document.create({
        data,
        include: {
          project: true,
        },
      });
    });
  }

  /**
   * Récupère tous les documents
   */
  async findAll() {
    try {
      return await this.prisma.executeWithQueue(() =>
        this.prisma.document.findMany({
          include: {
            project: true,
          },
        }),
      );
    } catch (error) {
      throw new Error(
        `Erreur lors de la récupération des documents: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Récupère tous les documents d'une organisation
   */
  async findAllByOrganization(organizationId: string) {
    try {
      // Récupérer tous les projets de l'organisation
      const projects = await this.prisma.executeWithQueue(() =>
        this.prisma.project.findMany({
          where: { organizationId },
          select: { id: true },
        }),
      );

      const projectIds = projects.map((project) => project.id);

      // Récupérer tous les documents des projets de l'organisation
      return await this.prisma.executeWithQueue(() =>
        this.prisma.document.findMany({
          where: {
            projectId: {
              in: projectIds,
            },
          },
          include: {
            project: true,
          },
        }),
      );
    } catch (error) {
      throw new Error(
        `Erreur lors de la récupération des documents de l'organisation: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Récupère un document par son ID
   */
  async findOne(id: string) {
    try {
      const document = await this.prisma.executeWithQueue(() =>
        this.prisma.document.findUnique({
          where: { id },
          include: {
            project: {
              include: {
                organization: true,
              },
            },
          },
        }),
      );

      if (!document) {
        throw new NotFoundException('Document non trouvé');
      }

      return document;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(
        `Erreur lors de la récupération du document: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Récupère tous les documents d'un projet
   */
  async findByProject(projectId: string): Promise<Document[]> {
    return this.prisma.executeWithQueue(() =>
      this.prisma.document.findMany({
        where: {
          projectId,
        },
        include: {
          chunks: true,
        },
      }),
    );
  }

  /**
   * Met à jour un document
   */
  async update(id: string, updateData: UpdateDocumentDto) {
    try {
      // On extrait projectId car il ne peut pas être modifié dans une opération update
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { projectId, ...updateDataWithoutProjectId } = updateData;

      // Traitement spécial pour ai_metadata qui doit être converti en format JSON compatible avec Prisma
      // et préserver l'ordre des champs
      const prismaUpdateData: any = { ...updateDataWithoutProjectId };

      if (updateDataWithoutProjectId.ai_metadata) {
        // Extraire l'ordre des champs et transformer les données pour préserver l'ordre
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        prismaUpdateData.ai_metadata = preserveFieldOrder(
          updateDataWithoutProjectId.ai_metadata,
        );
      }

      const result = await this.prisma.executeWithQueue(() =>
        this.prisma.document.update({
          where: { id },
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: prismaUpdateData,
          include: {
            project: true,
          },
        }),
      );

      // Si le résultat contient ai_metadata avec l'ordre préservé, restaurer l'ordre original
      if (result.ai_metadata) {
        result.ai_metadata = restoreFieldOrder(result.ai_metadata) as JsonValue;
      }

      return result;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        this.logger.error('[REPOSITORY] Document non trouvé (P2025)');
        throw new NotFoundException('Document non trouvé');
      }
      throw error;
    }
  }

  /**
   * Met à jour le statut d'un document
   */
  async updateStatus(
    documentId: string,
    status: Status | null,
    indexationStatus: Status | null,
    code?: number,
    message_status?: string,
    message_indexation?: string,
  ): Promise<{
    projectId: string;
    documentId: string;
    status: Status;
    indexation_status: Status;
    message_status?: string;
    message_indexation?: string;
    code?: number;
    updated_at: Date;
  }> {
    try {
      // Build the update data object dynamically
      const updateData: {
        status?: Status;
        indexation_status?: Status;
        code?: number;
        message_status?: string;
        message_indexation?: string;
      } = {};

      if (status !== null) {
        updateData.status = status;
      }
      if (indexationStatus !== null) {
        updateData.indexation_status = indexationStatus;
      }
      if (code !== null) {
        updateData.code = code;
      }
      if (message_status !== null) {
        updateData.message_status = message_status;
      }
      if (message_indexation !== null) {
        updateData.message_indexation = message_indexation;
      }

      // Typing the result to avoid unsafe any access
      const document: {
        id: string;
        status: Status;
        indexation_status: Status;
        message_status?: string;
        message_indexation?: string;
        code?: number;
        project: { id: string };
      } = await this.prisma.executeWithQueue(() =>
        this.prisma.document.update({
          where: { id: documentId },
          data: updateData,
          select: {
            id: true,
            status: true,
            indexation_status: true,
            project: {
              select: { id: true },
            },
            message_status: true,
            message_indexation: true,
            code: true,
          },
        }),
      );

      return {
        projectId: document.project.id,
        documentId: document.id,
        status: document.status,
        indexation_status: document.indexation_status,
        message_status: document.message_status,
        message_indexation: document.message_indexation,
        code: document.code,
        updated_at: new Date(),
      };
    } catch (error) {
      this.logger.error(
        'Document Repository error : ',
        JSON.stringify(error, null, 2),
      );
      return {
        projectId: '',
        documentId: '',
        status: 'ERROR',
        indexation_status: 'ERROR',
        message_status:
          'Erreur lors de la mise à jour du statut du document dans le repository updateStatus',
        message_indexation:
          "Erreur lors de la mise à jour du statut de l'indexation dans le repository updateStatus",
        updated_at: new Date(),
      };
    }
  }

  async updateIndexationStatus(
    documentId: string,
    status: Status,
  ): Promise<Document> {
    try {
      const document = await this.prisma.executeWithQueue(() =>
        this.prisma.document.findUnique({
          where: { id: documentId },
        }),
      );

      if (!document) {
        throw new NotFoundException(
          `Document avec l'ID ${documentId} non trouvé`,
        );
      }

      return await this.prisma.executeWithQueue(() =>
        this.prisma.document.update({
          where: { id: documentId },
          data: {
            indexation_status: status,
          },
          include: {
            project: true,
          },
        }),
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(
        `Erreur lors de la mise à jour du statut du document: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Récupère un document par son nom de fichier et son projet
   */
  async findByFilenameAndProject(
    projectId: string,
    fileName: string,
    filePath: string,
  ) {
    try {
      return await this.prisma.executeWithQueue(() =>
        this.prisma.document.findFirst({
          where: {
            projectId,
            filename: fileName,
            path: filePath,
          },
          select: {
            id: true,
            filename: true,
            status: true,
            ai_metadata: true,
          },
        }),
      );
    } catch (error) {
      throw new Error(
        `Erreur lors de la recherche du document par nom de fichier: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Met à jour les métadonnées AI d'un document
   */
  async updateAiMetadata(
    documentId: string,
    metadata: Record<string, unknown>,
  ) {
    try {
      return await this.prisma.executeWithQueue(() =>
        this.prisma.document.update({
          where: { id: documentId },
          data: {
            ai_metadata: metadata as Prisma.JsonValue,
          },
        }),
      );
    } catch (error) {
      throw new Error(
        `Erreur lors de la mise à jour des métadonnées AI: ${(error as Error).message}`,
      );
    }
  }

  async findDocuments(documentIds: string[]): Promise<Document[]> {
    return this.prisma.executeWithQueue(() =>
      this.prisma.document.findMany({
        where: {
          id: {
            in: documentIds,
          },
        },
      }),
    );
  }

  async findDocumentsWithChunks(documentIds: string[]): Promise<Document[]> {
    return this.prisma.executeWithQueue(() =>
      this.prisma.document.findMany({
        where: {
          id: {
            in: documentIds,
          },
        },
        include: {
          chunks: true,
        },
      }),
    );
  }

  async findProjectWithOrganization(projectId: string) {
    return this.prisma.executeWithQueue(() =>
      this.prisma.project.findUnique({
        where: { id: projectId },
        include: {
          organization: true,
        },
      }),
    );
  }

  async findProjectByIdAndOrganization(
    projectId: string,
    organizationId: string,
  ) {
    return this.prisma.executeWithQueue(() =>
      this.prisma.project.findFirst({
        where: {
          id: projectId,
          organization: {
            id: organizationId,
          },
        },
      }),
    );
  }

  async findByProjectIdAndFileName(projectId: string, fileName: string) {
    return this.prisma.executeWithQueue(() =>
      this.prisma.document.findFirst({
        where: {
          projectId,
          filename: fileName,
        },
      }),
    );
  }
}
