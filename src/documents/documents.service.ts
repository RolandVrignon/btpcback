import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { Prisma, Project, DocumentStatus } from '@prisma/client';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  HeadObjectCommand,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';

@Injectable()
export class DocumentsService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION', 'eu-west-3'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
          '',
        ),
      },
    });
    this.bucketName = this.configService.get<string>(
      'AWS_S3_BUCKET',
      'btpc-documents',
    );
  }

  async create(createDocumentDto: CreateDocumentDto) {
    // Vérifier si le projet existe
    const project = await this.prisma.project.findUnique({
      where: { id: createDocumentDto.projectId },
    });

    if (!project) {
      throw new NotFoundException('Projet non trouvé');
    }

    return await this.prisma.document.create({
      data: createDocumentDto,
      include: {
        project: true,
      },
    });
  }

  async findAll() {
    return await this.prisma.document.findMany({
      include: {
        project: true,
      },
    });
  }

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

  async findOne(id: string, organizationId: string) {
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

    // Vérifier si le document a un projet associé
    if (!document.project) {
      throw new NotFoundException('Projet associé au document non trouvé');
    }

    // Vérifier si le document appartient à l'organisation
    const project = document.project as Project & { organizationId: string };
    if (project.organizationId !== organizationId) {
      throw new ForbiddenException('Accès non autorisé à ce document');
    }

    return document;
  }

  async findByProject(projectId: string, organizationId: string) {
    // Vérifier si le projet existe et appartient à l'organisation
    await this.checkProjectAccess(projectId, organizationId);

    return await this.prisma.document.findMany({
      where: { projectId },
      include: {
        project: true,
      },
    });
  }

  async remove(id: string, organizationId: string) {
    // Vérifier si le document existe et appartient à l'organisation
    await this.findOne(id, organizationId);

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

  async checkProjectAccess(projectId: string, organizationId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        organization: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Projet non trouvé');
    }

    const projectWithOrg = project as Project & { organizationId: string };
    if (projectWithOrg.organizationId !== organizationId) {
      throw new ForbiddenException('Accès non autorisé à ce projet');
    }

    return project;
  }

  async update(
    id: string,
    updateData: UpdateDocumentDto,
    organizationId: string,
  ) {
    // Vérifier si le document existe et appartient à l'organisation
    await this.findOne(id, organizationId);

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
   * Confirme l'upload d'un fichier sur S3 et crée un document dans la base de données
   * @param dto Informations sur le fichier uploadé
   * @param organizationId ID de l'organisation qui fait la demande
   * @returns Le document créé
   * @throws NotFoundException si le projet n'existe pas ou si le fichier n'est pas trouvé sur S3
   * @throws ForbiddenException si le projet n'appartient pas à l'organisation
   * @throws BadRequestException si une erreur survient lors de la vérification du fichier
   */
  async confirmUpload(dto: ConfirmUploadDto, organizationId: string) {
    // Vérifier si le projet existe et appartient à l'organisation
    const project = await this.prisma.project.findFirst({
      where: {
        id: dto.projectId,
        organization: {
          id: organizationId,
        },
      },
    });

    if (!project) {
      throw new NotFoundException(
        "Projet non trouvé ou n'appartient pas à votre organisation",
      );
    }

    // Construire le chemin du fichier sur S3
    const filePath = `ct-toolbox/${dto.projectId}/${dto.fileName}`;
    console.log('filePath:', filePath);

    try {
      // Vérifier si le fichier existe sur S3
      const headObjectCommand = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: filePath,
      });

      await this.s3Client.send(headObjectCommand);

      // Si le fichier existe, créer un document dans la base de données
      const document = await this.prisma.document.create({
        data: {
          filename: dto.fileName,
          path: filePath,
          mimetype: 'application/octet-stream', // À déterminer en fonction du nom de fichier
          size: 0, // Taille inconnue à ce stade
          projectId: dto.projectId,
          status: 'NOT_STARTED', // Statut initial
        },
        include: {
          project: true,
        },
      });

      return document;
    } catch (error) {
      if (error instanceof S3ServiceException) {
        throw new BadRequestException(
          `Fichier non trouvé sur S3: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        );
      }
      throw error;
    }
  }

  async updateDocumentStatus(documentId: string, status: DocumentStatus) {
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
}
