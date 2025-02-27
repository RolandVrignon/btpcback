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
import { ViewDocumentDto } from './dto/view-document.dto';
import { ViewDocumentResponseDto } from './dto/view-document-response.dto';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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

      // Lancer le traitement du document en arrière-plan
      this.processDocumentAsync(document.id);

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

  /**
   * Simule le traitement asynchrone d'un document en passant par différents statuts
   * @param documentId ID du document à traiter
   */
  private async processDocumentAsync(documentId: string): Promise<void> {
    // Définir la séquence des statuts et les délais entre chaque changement
    const statusSequence: Array<{
      status: 'PROCESSING' | 'INDEXING' | 'RAFTING' | 'READY';
      delay: number;
    }> = [
      { status: 'PROCESSING', delay: 2000 },
      { status: 'INDEXING', delay: 3000 },
      { status: 'RAFTING', delay: 3000 },
      { status: 'READY', delay: 0 },
    ];

    // Fonction pour mettre à jour le statut avec un délai
    const updateWithDelay = async (
      status: 'PROCESSING' | 'INDEXING' | 'RAFTING' | 'READY',
      delay: number,
    ): Promise<void> => {
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          this.prisma.document
            .update({
              where: { id: documentId },
              data: { status },
            })
            .then(() => {
              console.log(
                `Document ${documentId} mis à jour avec le statut: ${status}`,
              );
              resolve();
            })
            .catch((error) => {
              console.error(
                `Erreur lors de la mise à jour du statut: ${error}`,
              );
              resolve();
            });
        }, delay);
      });
    };

    // Exécuter la séquence de mises à jour
    for (const step of statusSequence) {
      await updateWithDelay(step.status, step.delay);
    }
  }

  /**
   * Récupère le statut actuel d'un document
   * @param documentId ID du document
   * @param projectId ID du projet
   * @param organizationId ID de l'organisation
   * @returns Le document avec son statut actuel
   */
  async monitorDocumentStatus(
    documentId: string,
    projectId: string,
    organizationId: string,
  ) {
    // Vérifier si le projet existe et appartient à l'organisation
    await this.checkProjectAccess(projectId, organizationId);

    // Récupérer le document
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        filename: true,
        status: true,
        projectId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!document) {
      throw new NotFoundException(
        `Document avec l'ID ${documentId} non trouvé`,
      );
    }

    if (document.projectId !== projectId) {
      throw new ForbiddenException(
        "Ce document n'appartient pas au projet spécifié",
      );
    }

    return {
      ...document,
      message: this.getStatusMessage(document.status),
    };
  }

  /**
   * Génère un message explicatif basé sur le statut du document
   * @param status Statut du document
   * @returns Message explicatif
   */
  private getStatusMessage(status: DocumentStatus): string {
    switch (status) {
      case 'NOT_STARTED':
        return 'Le document est en attente de traitement';
      case 'PROCESSING':
        return 'Le document est en cours de traitement';
      case 'INDEXING':
        return 'Le document est en cours de vectorisation';
      case 'RAFTING':
        return 'Le document est en cours de résumé';
      case 'READY':
        return 'Le document est prêt à être utilisé';
      case 'ERROR':
        return 'Une erreur est survenue lors du traitement du document';
      default:
        return 'Statut inconnu';
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

    // Utiliser une conversion de type sûre pour le statut
    const documentStatus = status as unknown as DocumentStatus;

    return await this.prisma.document.update({
      where: { id: documentId },
      data: { status: documentStatus },
      include: {
        project: true,
      },
    });
  }

  /**
   * Génère une URL présignée pour consulter un document
   * @param dto Informations sur le document à consulter
   * @param organizationId ID de l'organisation qui fait la demande
   * @returns URL présignée pour consulter le document
   * @throws NotFoundException si le projet n'existe pas ou si le fichier n'existe pas
   * @throws ForbiddenException si le projet n'appartient pas à l'organisation
   */
  async getViewUrl(
    dto: ViewDocumentDto,
    organizationId: string,
  ): Promise<ViewDocumentResponseDto> {
    // Vérifier si le projet existe et appartient à l'organisation
    await this.checkProjectAccess(dto.projectId, organizationId);

    // Construire le chemin du fichier sur S3
    const filePath = `ct-toolbox/${dto.projectId}/${dto.fileName}`;

    try {
      // Vérifier si le fichier existe sur S3
      const headObjectCommand = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: filePath,
      });

      await this.s3Client.send(headObjectCommand);

      // Générer l'URL présignée pour consulter le document
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: filePath,
      });

      const expiresIn = 3600; // 1 heure
      const url = await getSignedUrl(this.s3Client, command, { expiresIn });

      return {
        url,
        expiresIn,
      };
    } catch (error) {
      if (error instanceof S3ServiceException) {
        throw new NotFoundException(
          `Fichier non trouvé sur S3: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        );
      }
      throw error;
    }
  }
}
