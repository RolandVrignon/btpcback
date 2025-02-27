import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { Prisma, Project } from '@prisma/client';
import { UpdateDocumentDto } from './dto/update-document.dto';

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
}
