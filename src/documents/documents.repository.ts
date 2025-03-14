import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { Status, Prisma, Document } from '@prisma/client';

@Injectable()
export class DocumentsRepository {
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

      console.log(
        'updateDataWithoutProjectId.ai_metadata:',
        JSON.stringify(updateDataWithoutProjectId.ai_metadata, null, 2),
      );

      // Traitement spécial pour ai_metadata qui doit être converti en format JSON compatible avec Prisma
      // et préserver l'ordre des champs
      const prismaUpdateData: any = { ...updateDataWithoutProjectId };

      if (updateDataWithoutProjectId.ai_metadata) {
        // Extraire l'ordre des champs et transformer les données pour préserver l'ordre
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        prismaUpdateData.ai_metadata = this.preserveFieldOrder(
          updateDataWithoutProjectId.ai_metadata,
        );
      }

      console.log(
        'prismaUpdateData.ai_metadata:',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        JSON.stringify(prismaUpdateData.ai_metadata, null, 2),
      );

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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        result.ai_metadata = this.restoreFieldOrder(result.ai_metadata);
      }

      return result;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        console.error('[REPOSITORY] Document non trouvé (P2025)');
        throw new NotFoundException('Document non trouvé');
      }
      throw error;
    }
  }

  /**
   * Préserve l'ordre des champs dans un objet JSON en ajoutant des métadonnées
   * @param data Données JSON à traiter
   * @returns Données JSON avec métadonnées d'ordre
   */
  private preserveFieldOrder(data: any): any {
    if (data === null || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      // Pour les tableaux, vérifier si ce sont des objets similaires
      if (data.length > 0 && typeof data[0] === 'object' && !Array.isArray(data[0])) {
        // Vérifier si tous les objets ont les mêmes clés
        const firstItemKeys = Object.keys(data[0]);
        const allSameKeys = data.every(item => 
          typeof item === 'object' && 
          !Array.isArray(item) && 
          Object.keys(item).length === firstItemKeys.length &&
          firstItemKeys.every(key => key in item)
        );

        if (allSameKeys) {
          // Stocker un seul fieldOrder pour tout le tableau
          const processedItems = data.map(item => {
            const processedItem: Record<string, any> = {};
            for (const key of firstItemKeys) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              processedItem[key] = this.preserveFieldOrder(item[key]);
            }
            return processedItem;
          });

          // Retourner un objet avec les données et l'ordre des champs
          return {
            __data: processedItems,
            __fieldOrder: firstItemKeys,
            __isArray: true
          };
        }
      }
      
      // Si ce n'est pas un tableau d'objets similaires, traiter chaque élément individuellement
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return data.map(item => this.preserveFieldOrder(item));
    }

    // Pour les objets
    const fieldOrder = Object.keys(data);
    const processedData: Record<string, any> = {};

    // Traiter chaque champ
    for (const key of fieldOrder) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const processedValue = this.preserveFieldOrder(data[key]);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      processedData[key] = processedValue;
    }

    // Ajouter les métadonnées d'ordre
    return {
      __data: processedData,
      __fieldOrder: fieldOrder,
    };
  }

  /**
   * Restaure l'ordre des champs à partir des métadonnées
   * @param data Données JSON avec métadonnées d'ordre
   * @returns Données JSON avec l'ordre original
   */
  private restoreFieldOrder(data: any): any {
    if (data === null || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      // Pour les tableaux, traiter chaque élément
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return data.map(item => this.restoreFieldOrder(item));
    }

    // Vérifier si c'est un tableau d'objets similaires avec un seul fieldOrder
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (data.__data && data.__fieldOrder && data.__isArray === true) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const items = data.__data;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const fieldOrder = data.__fieldOrder;

      // Reconstruire chaque élément du tableau avec le même ordre de champs
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
      return items.map((item: any) => {
        const result: Record<string, any> = {};
        for (const key of fieldOrder) {
          if (key in item) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            result[key] = this.restoreFieldOrder(item[key]);
          }
        }
        return result;
      });
    }

    // Vérifier si c'est un objet avec métadonnées d'ordre
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (data.__data && data.__fieldOrder && Array.isArray(data.__fieldOrder)) {
      const result: Record<string, any> = {};
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const orderedData = data.__data;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const fieldOrder = data.__fieldOrder;

      // Reconstruire l'objet selon l'ordre des champs
      for (const key of fieldOrder) {
        if (key in orderedData) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          result[key] = this.restoreFieldOrder(orderedData[key]);
        }
      }

      return result;
    }

    // Pour les objets sans métadonnées d'ordre
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      result[key] = this.restoreFieldOrder(value);
    }

    return result;
  }

  /**
   * Supprime un document
   */
  async remove(id: string) {
    try {
      return await this.prisma.executeWithQueue(() =>
        this.prisma.document.delete({
          where: { id },
        }),
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Document non trouvé');
      }
      throw error;
    }
  }

  /**
   * Met à jour le statut d'un document
   */
  async updateStatus(documentId: string, status: Status): Promise<Document> {
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
            status: status as
              | 'DRAFT'
              | 'PROGRESS'
              | 'PENDING'
              | 'COMPLETED'
              | 'ERROR',
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
