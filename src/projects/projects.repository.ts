import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateProjectDto } from '@/projects/dto/create-project.dto';
import { UpdateProjectDto } from '@/projects/dto/update-project.dto';
import { UpdateAddressDto } from '@/projects/dto/update-address.dto';
import { Project } from '@prisma/client';
import { Status } from '@prisma/client';
import { Logger } from '@nestjs/common';

@Injectable()
export class ProjectsRepository {
  private readonly logger = new Logger(ProjectsRepository.name);

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
            status: Status.DRAFT,
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
   * Met à jour l'adresse d'un projet
   */
  async updateAddress(id: string, updateAddressDto: UpdateAddressDto) {
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
          data: {
            ai_address: updateAddressDto.closest_formatted_address,
            closest_formatted_address:
              updateAddressDto.closest_formatted_address,
            latitude: updateAddressDto.latitude,
            longitude: updateAddressDto.longitude,
            altitude: updateAddressDto.altitude,
            ai_city: updateAddressDto.ai_city,
            ai_zip_code: updateAddressDto.ai_zip_code,
            ai_country: updateAddressDto.ai_country,
          },
        }),
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(
        `Erreur lors de la mise à jour de l'adresse du projet: ${(error as Error).message}`,
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

  async findById(projectId: string): Promise<Project> {
    const project = await this.prisma.executeWithQueue(() =>
      this.prisma.project.findUnique({
        where: { id: projectId },
      }),
    );

    if (!project) {
      return null;
    }

    return project;
  }

  async findProjectByIdAndOrganization(
    projectId: string,
    organizationId: string,
  ) {
    return this.prisma.executeWithQueue(() =>
      this.prisma.project.findFirst({
        where: {
          id: projectId,
          organizationId,
        },
        include: {
          organization: true,
        },
      }),
    );
  }

  /**
   * Update the status of a project
   */
  async updateStatus(
    projectId: string,
    status: Status,
    code?: number,
    message?: string,
  ): Promise<{
    projectId: string;
    status: Status;
    code?: number;
    message?: string;
    updated_at: Date;
  }> {
    void code;
    void message;

    const updateData: {
      status?: Status;
      code?: number;
      message?: string;
    } = {};

    if (status !== null) {
      updateData.status = status;
    }
    // if (code !== null) {
    //   updateData.code = code;
    // }
    // if (message !== null) {
    //   updateData.message = message;
    // }

    try {
      const project = await this.prisma.executeWithQueue(() =>
        this.prisma.project.update({
          where: { id: projectId },
          data: updateData,
          select: { id: true, status: true },
        }),
      );
      return {
        projectId: project.id,
        status: project.status,
        code,
        message,
        updated_at: new Date(),
      };
    } catch (error) {
      this.logger.error(
        'Project Repository error : ',
        JSON.stringify(error, null, 2),
      );
      return {
        projectId: '',
        status: Status.ERROR,
        code,
        message:
          'Erreur lors de la mise à jour du statut du projet dans le repository updateStatus',
        updated_at: new Date(),
      };
    }
  }
}
