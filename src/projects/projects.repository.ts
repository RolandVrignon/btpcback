import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto, ProjectStatus } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * Crée un nouveau projet
   */
  async create(createProjectDto: CreateProjectDto) {
    try {
      if (!createProjectDto.organizationId) {
        throw new Error("L'ID de l'organisation est requis");
      }

      return await this.prisma.executeWithQueue(() =>
        this.prisma.project.create({
          data: {
            name: createProjectDto.name,
            salesforce_id: createProjectDto.salesforce_id,
            status: ProjectStatus.DRAFT,
            tags: createProjectDto.tags,
            organization: {
              connect: {
                id: createProjectDto.organizationId,
              },
            },
          },
        }),
      );
    } catch (error: unknown) {
      throw new Error(
        `Erreur lors de la création du projet: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Récupère tous les projets
   */
  async findAll() {
    try {
      return await this.prisma.executeWithQueue(() =>
        this.prisma.project.findMany({
          include: {
            documents: true,
          },
        }),
      );
    } catch (error: unknown) {
      throw new Error(
        `Erreur lors de la récupération des projets: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Récupère tous les projets d'une organisation
   */
  async findAllByOrganization(organizationId: string) {
    try {
      return await this.prisma.executeWithQueue(() =>
        this.prisma.project.findMany({
          where: {
            organizationId,
          },
          include: {
            documents: true,
          },
        }),
      );
    } catch (error: unknown) {
      throw new Error(
        `Erreur lors de la récupération des projets de l'organisation: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Récupère un projet par son ID
   */
  async findOne(id: string) {
    try {
      const project = await this.prisma.executeWithQueue(() =>
        this.prisma.project.findUnique({
          where: { id },
          include: {
            documents: true,
          },
        }),
      );

      if (!project) {
        throw new NotFoundException(`Projet avec l'ID ${id} non trouvé`);
      }

      return project;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(
        `Erreur lors de la récupération du projet: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Met à jour un projet
   */
  async update(id: string, updateProjectDto: UpdateProjectDto) {
    try {
      // Vérifier si le projet existe
      const existingProject = await this.prisma.executeWithQueue(() =>
        this.prisma.project.findUnique({
          where: { id },
        }),
      );

      if (!existingProject) {
        throw new NotFoundException(`Projet avec l'ID ${id} non trouvé`);
      }

      return await this.prisma.executeWithQueue(() =>
        this.prisma.project.update({
          where: { id },
          data: updateProjectDto,
        }),
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(
        `Erreur lors de la mise à jour du projet: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Supprime un projet
   */
  async remove(id: string) {
    try {
      // Vérifier si le projet existe
      const existingProject = await this.prisma.executeWithQueue(() =>
        this.prisma.project.findUnique({
          where: { id },
        }),
      );

      if (!existingProject) {
        throw new NotFoundException(`Projet avec l'ID ${id} non trouvé`);
      }

      // Supprimer le projet
      return await this.prisma.executeWithQueue(() =>
        this.prisma.project.delete({
          where: { id },
        }),
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(
        `Erreur lors de la suppression du projet: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Vérifie si un projet existe
   */
  async exists(id: string): Promise<boolean> {
    try {
      const project = await this.prisma.executeWithQueue(() =>
        this.prisma.project.findUnique({
          where: { id },
          select: { id: true },
        }),
      );
      return !!project;
    } catch (error: unknown) {
      throw new Error(
        `Erreur lors de la vérification de l'existence du projet: ${(error as Error).message}`,
      );
    }
  }
}
