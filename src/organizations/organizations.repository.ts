import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateOrganizationDto } from '@/organizations/dto/create-organization.dto';
import { UpdateOrganizationDto } from '@/organizations/dto/update-organization.dto';

@Injectable()
export class OrganizationsRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * Crée une nouvelle organisation
   */
  async create(createOrganizationDto: CreateOrganizationDto) {
    try {
      return await this.prisma.executeWithQueue(() =>
        this.prisma.organization.create({
          data: {
            ...createOrganizationDto,
          },
        }),
      );
    } catch (error: unknown) {
      throw new Error(
        `Erreur lors de la création de l'organisation: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Récupère toutes les organisations
   */
  async findAll() {
    try {
      return await this.prisma.executeWithQueue(() =>
        this.prisma.organization.findMany({
          include: {
            projects: true,
          },
        }),
      );
    } catch (error: unknown) {
      throw new Error(
        `Erreur lors de la récupération des organisations: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Récupère une organisation par son ID
   */
  async findOne(id: string) {
    try {
      const organization = await this.prisma.executeWithQueue(() =>
        this.prisma.organization.findUnique({
          where: { id },
          include: {
            projects: true,
          },
        }),
      );

      if (!organization) {
        throw new NotFoundException(`Organisation avec l'ID ${id} non trouvée`);
      }

      return organization;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(
        `Erreur lors de la récupération de l'organisation: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Met à jour une organisation
   */
  async update(id: string, updateOrganizationDto: UpdateOrganizationDto) {
    try {
      // Vérifier si l'organisation existe
      const existingOrganization = await this.prisma.executeWithQueue(() =>
        this.prisma.organization.findUnique({
          where: { id },
        }),
      );

      if (!existingOrganization) {
        throw new NotFoundException(`Organisation avec l'ID ${id} non trouvée`);
      }

      return await this.prisma.executeWithQueue(() =>
        this.prisma.organization.update({
          where: { id },
          data: updateOrganizationDto,
        }),
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(
        `Erreur lors de la mise à jour de l'organisation: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Supprime une organisation
   */
  async remove(id: string) {
    try {
      // Vérifier si l'organisation existe
      const existingOrganization = await this.prisma.executeWithQueue(() =>
        this.prisma.organization.findUnique({
          where: { id },
        }),
      );

      if (!existingOrganization) {
        throw new NotFoundException(`Organisation avec l'ID ${id} non trouvée`);
      }

      // Supprimer l'organisation
      return await this.prisma.executeWithQueue(() =>
        this.prisma.organization.delete({
          where: { id },
        }),
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(
        `Erreur lors de la suppression de l'organisation: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Vérifie si une organisation existe
   */
  async exists(id: string): Promise<boolean> {
    try {
      const organization = await this.prisma.executeWithQueue(() =>
        this.prisma.organization.findUnique({
          where: { id },
          select: { id: true },
        }),
      );
      return !!organization;
    } catch (error: unknown) {
      throw new Error(
        `Erreur lors de la vérification de l'existence de l'organisation: ${(error as Error).message}`,
      );
    }
  }
}
