import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

// Interface pour les erreurs Prisma
interface PrismaError {
  code: string;
  meta?: Record<string, unknown>;
  message: string;
}

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(createProjectDto: CreateProjectDto, organizationId: string) {
    // Vérifier si l'organisation existe
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organisation non trouvée');
    }

    const project = await this.prisma.project.create({
      data: {
        name: createProjectDto.name || '',
        salesforce_id: createProjectDto.salesforce_id,
        status: createProjectDto.status || 'DRAFT',
        tags: createProjectDto.tags || [],
        organization: {
          connect: {
            id: organizationId,
          },
        },
      },
    });

    return {
      id: project.id,
      name: project.name,
      date: project.createdAt,
      status: project.status,
    };
  }

  async findAll() {
    return await this.prisma.project.findMany({
      include: {
        organization: true,
      },
    });
  }

  async findOne(id: string, organizationId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        organization: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Projet non trouvé');
    }

    // Vérifier si l'utilisateur a accès à ce projet
    if (project.organizationId !== organizationId) {
      throw new ForbiddenException('Accès non autorisé à ce projet');
    }

    return project;
  }

  async findByOrganization(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organisation non trouvée');
    }

    return await this.prisma.project.findMany({
      where: { organizationId },
      include: {
        organization: true,
      },
    });
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    organizationId: string,
  ) {
    // Vérifier si le projet existe et appartient à l'organisation
    await this.findOne(id, organizationId);

    try {
      return await this.prisma.project.update({
        where: { id },
        data: updateProjectDto,
        include: {
          organization: true,
        },
      });
    } catch (error) {
      if ((error as PrismaError).code === 'P2025') {
        throw new NotFoundException('Projet non trouvé');
      }
      throw error;
    }
  }

  async remove(id: string, organizationId: string) {
    // Vérifier si le projet existe et appartient à l'organisation
    await this.findOne(id, organizationId);

    try {
      return await this.prisma.project.delete({
        where: { id },
      });
    } catch (error) {
      if ((error as PrismaError).code === 'P2025') {
        throw new NotFoundException('Projet non trouvé');
      }
      throw error;
    }
  }
}
