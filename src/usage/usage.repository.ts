import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsageDto } from './dto/create-usage.dto';
import { AI_Provider, UsageType } from '@prisma/client';

@Injectable()
export class UsageRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crée un nouvel enregistrement d'utilisation
   * @param createUsageDto Données pour créer l'enregistrement d'utilisation
   * @returns L'enregistrement d'utilisation créé
   */
  async create(createUsageDto: CreateUsageDto) {
    return await this.prisma.usage.create({
      data: createUsageDto,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Vérifie si un projet existe
   * @param projectId ID du projet à vérifier
   * @returns Le projet s'il existe
   * @throws NotFoundException si le projet n'existe pas
   */
  async findProject(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Projet avec l'ID ${projectId} non trouvé`);
    }

    return project;
  }

  /**
   * Crée un enregistrement d'utilisation avec des données brutes
   * @param data Données pour créer l'enregistrement d'utilisation
   * @returns L'enregistrement d'utilisation créé
   */
  async createRaw(data: {
    provider: AI_Provider;
    modelName: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens: number;
    type: UsageType;
    projectId: string;
  }) {
    return await this.prisma.usage.create({
      data,
    });
  }
}
