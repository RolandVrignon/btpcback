import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsageDto } from './dto/create-usage.dto';
import { UsageType, AI_Provider } from '@prisma/client';

/**
 * Interface pour définir la structure de l'objet usage retourné par les APIs d'IA
 */
interface ModelUsage {
  // Format pour les embeddings
  tokens?: number;
  // Format pour text-to-text (comme Gemini)
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crée un nouvel enregistrement d'utilisation
   * @param createUsageDto Données pour créer l'enregistrement d'utilisation
   * @returns L'enregistrement d'utilisation créé
   */
  async create(createUsageDto: CreateUsageDto) {
    // Vérifier si le projet existe
    const project = await this.prisma.project.findUnique({
      where: { id: createUsageDto.projectId },
    });

    if (!project) {
      throw new NotFoundException(
        `Projet avec l'ID ${createUsageDto.projectId} non trouvé`,
      );
    }

    // Vérifier que le total des tokens est cohérent
    if (
      createUsageDto.totalTokens !==
      createUsageDto.promptTokens + createUsageDto.completionTokens
    ) {
      throw new BadRequestException(
        'Le total des tokens doit être égal à la somme des tokens de prompt et de complétion',
      );
    }

    try {
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
    } catch (error) {
      console.error(
        "Erreur lors de la création de l'enregistrement d'utilisation:",
        error,
      );
      throw error;
    }
  }

  /**
   * Enregistre l'utilisation d'un modèle dans la base de données
   * Gère les deux formats possibles (embedding ou text-to-text)
   *
   * @param modelName Nom du modèle utilisé
   * @param usage Informations d'utilisation du modèle (peut être au format embedding ou text-to-text)
   * @param projectId ID du projet associé
   * @param type Type d'utilisation (TEXT_TO_TEXT ou EMBEDDING)
   */
  async logUsage(
    provider: AI_Provider,
    modelName: string,
    usage: ModelUsage,
    projectId: string,
    type: UsageType = 'TEXT_TO_TEXT',
  ): Promise<void> {
    try {
      // Vérifier si le projet existe
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        console.error(`Projet avec l'ID ${projectId} non trouvé`);
        return;
      }

      // Préparer les données selon le format de l'objet usage
      const data = {
        provider,
        modelName,
        promptTokens: usage.promptTokens || 0,
        completionTokens: usage.completionTokens || 0,
        totalTokens: usage.totalTokens || usage.tokens || 0,
        type,
        projectId,
      };

      // Créer l'enregistrement d'utilisation
      await this.prisma.usage.create({
        data,
      });
    } catch (error) {
      console.error(
        "Erreur lors de l'enregistrement de l'utilisation du modèle:",
        error,
      );
    }
  }
}
