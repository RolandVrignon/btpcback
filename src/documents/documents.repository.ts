import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentStatus, Prisma } from '@prisma/client';

@Injectable()
export class DocumentsRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * Crée un nouveau document dans la base de données
   */
  async create(createDocumentDto: CreateDocumentDto) {
    try {
      return await this.prisma.executeWithQueue(() =>
        this.prisma.document.create({
          data: createDocumentDto,
          include: {
            project: true,
          },
        }),
      );
    } catch (error) {
      throw new Error(
        `Erreur lors de la création du document: ${(error as Error).message}`,
      );
    }
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
  async findByProject(projectId: string) {
    try {
      return await this.prisma.executeWithQueue(() =>
        this.prisma.document.findMany({
          where: { projectId },
          include: {
            project: true,
          },
        }),
      );
    } catch (error) {
      throw new Error(
        `Erreur lors de la récupération des documents du projet: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Met à jour un document
   */
  async update(id: string, updateData: UpdateDocumentDto) {
    try {
      return await this.prisma.executeWithQueue(() =>
        this.prisma.document.update({
          where: { id },
          data: updateData,
          include: {
            project: true,
          },
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
  async updateStatus(documentId: string, status: DocumentStatus) {
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
            status: status,
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
}
