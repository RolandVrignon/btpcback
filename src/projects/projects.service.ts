import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(createProjectDto: CreateProjectDto) {
    // Vérifier si l'organisation existe
    const organization = await this.prisma.organization.findUnique({
      where: { id: createProjectDto.organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organisation non trouvée');
    }

    return await this.prisma.project.create({
      data: {
        ...createProjectDto,
        status: createProjectDto.status || 'DRAFT',
        tags: createProjectDto.tags || [],
      },
      include: {
        organization: true,
      },
    });
  }

  async findAll() {
    return await this.prisma.project.findMany({
      include: {
        organization: true,
      },
    });
  }

  async findOne(id: number, organizationId: number) {
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

  async findByOrganization(organizationId: number) {
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
    id: number,
    updateProjectDto: UpdateProjectDto,
    organizationId: number,
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
      if (error.code === 'P2025') {
        throw new NotFoundException('Projet non trouvé');
      }
      throw error;
    }
  }

  async remove(id: number, organizationId: number) {
    // Vérifier si le projet existe et appartient à l'organisation
    await this.findOne(id, organizationId);

    try {
      return await this.prisma.project.delete({
        where: { id },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Projet non trouvé');
      }
      throw error;
    }
  }
}
