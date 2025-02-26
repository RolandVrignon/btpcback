import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

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

  async findAllByOrganization(organizationId: number) {
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

  async findOne(id: number, organizationId: number) {
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

    // Vérifier si le document appartient à l'organisation
    if (document.project.organizationId !== organizationId) {
      throw new ForbiddenException('Accès non autorisé à ce document');
    }

    return document;
  }

  async findByProject(projectId: number, organizationId: number) {
    // Vérifier si le projet existe et appartient à l'organisation
    await this.checkProjectAccess(projectId, organizationId);

    return await this.prisma.document.findMany({
      where: { projectId },
      include: {
        project: true,
      },
    });
  }

  async remove(id: number, organizationId: number) {
    // Vérifier si le document existe et appartient à l'organisation
    await this.findOne(id, organizationId);

    try {
      return await this.prisma.document.delete({
        where: { id },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Document non trouvé');
      }
      throw error;
    }
  }

  async checkProjectAccess(projectId: number, organizationId: number) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        organization: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Projet non trouvé');
    }

    if (project.organizationId !== organizationId) {
      throw new ForbiddenException('Accès non autorisé à ce projet');
    }

    return project;
  }
}
