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
    return await this.prisma.document.create({
      data: createDocumentDto,
      include: {
        project: true,
      },
    });
  }

  /**
   * Récupère tous les documents
   */
  async findAll() {
    return await this.prisma.document.findMany({
      include: {
        project: true,
      },
    });
  }

  /**
   * Récupère tous les documents d'une organisation
   */
  async findAllByOrganization(organizationId: string) {
    // Récupérer tous les projets de l'organisation
    const projects = await this.prisma.project.findMany({
      where: { organizationId },
      select: { id: true },
    });

    const projectIds = projects.map((project) => project.id);

    // Récupérer tous les documents des projets de l'organisation
    return await this.prisma.document.findMany({
      where: {
        projectId: {
          in: projectIds,
        },
      },
      include: {
        project: true,
      },
    });
  }

  /**
   * Récupère un document par son ID
   */
  async findOne(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document non trouvé');
    }

    return document;
  }

  /**
   * Récupère tous les documents d'un projet
   */
  async findByProject(projectId: string) {
    return await this.prisma.document.findMany({
      where: { projectId },
      include: {
        project: true,
      },
    });
  }

  /**
   * Met à jour un document
   */
  async update(id: string, updateData: UpdateDocumentDto) {
    try {
      return await this.prisma.document.update({
        where: { id },
        data: updateData,
        include: {
          project: true,
        },
      });
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
      return await this.prisma.document.delete({
        where: { id },
      });
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
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(
        `Document avec l'ID ${documentId} non trouvé`,
      );
    }

    return await this.prisma.document.update({
      where: { id: documentId },
      data: {
        status: status,
      },
      include: {
        project: true,
      },
    });
  }

  /**
   * Récupère un document par son nom de fichier et son projet
   */
  async findByFilenameAndProject(
    projectId: string,
    fileName: string,
    filePath: string,
  ) {
    return await this.prisma.document.findFirst({
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
    });
  }

  /**
   * Met à jour les métadonnées AI d'un document
   */
  async updateAiMetadata(
    documentId: string,
    metadata: Record<string, unknown>,
  ) {
    return await this.prisma.document.update({
      where: { id: documentId },
      data: {
        ai_metadata: metadata as Prisma.JsonValue,
      },
    });
  }
}
