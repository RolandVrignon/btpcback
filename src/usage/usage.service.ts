import { Injectable, Logger } from '@nestjs/common';
import { UsageRepository } from './usage.repository';
import { AI_Provider, UsageType } from '@prisma/client';

/**
 * Interface pour définir la structure de l'objet usage retourné par les APIs d'IA
 */
export interface ModelUsage {
  // Format pour les embeddings
  tokens?: number;
  // Format pour text-to-text (comme Gemini)
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(private readonly usageRepository: UsageRepository) {}

  /**
   * Crée un enregistrement d'utilisation
   */
  async create(data: {
    provider: AI_Provider;
    modelName: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens: number;
    type: UsageType;
    projectId: string;
  }) {
    try {
      return await this.usageRepository.createRaw(data);
    } catch (error) {
      this.logger.error(
        "Erreur lors de la création de l'enregistrement d'utilisation:",
        error,
      );
      throw error;
    }
  }

  /**
   * Enregistre l'utilisation d'un modèle d'embedding
   * @param provider Le fournisseur du modèle (OPENAI, GEMINI, etc.)
   * @param modelName Le nom du modèle utilisé
   * @param usage Les informations d'utilisation (tokens)
   * @param projectId L'ID du projet associé
   */
  async logEmbeddingUsage(
    provider: AI_Provider,
    modelName: string,
    usage: ModelUsage,
    projectId: string,
  ) {
    try {
      // Vérifier si le projet existe
      await this.usageRepository.findProject(projectId);

      // Préparer les données pour l'insertion
      const data = {
        provider,
        modelName,
        promptTokens: usage.promptTokens || null,
        completionTokens: usage.completionTokens || null,
        totalTokens: usage.totalTokens || null,
        type: UsageType.EMBEDDING,
        projectId,
      };

      // Créer l'enregistrement d'utilisation
      return await this.usageRepository.create(data);
    } catch (error) {
      this.logger.error(
        "Erreur lors de l'enregistrement de l'utilisation d'embedding:",
        error,
      );
      throw error;
    }
  }

  /**
   * Enregistre l'utilisation d'un modèle de text-to-text
   * @param provider Le fournisseur du modèle (OPENAI, GEMINI, etc.)
   * @param modelName Le nom du modèle utilisé
   * @param usage Les informations d'utilisation (tokens)
   * @param projectId L'ID du projet associé
   */
  async logTextToTextUsage(
    provider: AI_Provider,
    modelName: string,
    usage: ModelUsage,
    projectId: string,
  ) {
    try {
      // Vérifier si le projet existe
      await this.usageRepository.findProject(projectId);

      // Préparer les données pour l'insertion
      const data = {
        provider,
        modelName,
        promptTokens: usage.promptTokens || null,
        completionTokens: usage.completionTokens || null,
        totalTokens: usage.totalTokens || null,
        type: UsageType.TEXT_TO_TEXT,
        projectId,
      };

      // Créer l'enregistrement d'utilisation
      return await this.usageRepository.createRaw(data);
    } catch (error) {
      this.logger.error(
        "Erreur lors de l'enregistrement de l'utilisation de text-to-text:",
        error,
      );
      throw error;
    }
  }

  /**
   * Enregistre l'utilisation d'un modèle (embedding ou text-to-text)
   * @deprecated Utilisez logEmbeddingUsage ou logTextToTextUsage à la place
   */
  async logUsage(
    provider: AI_Provider,
    modelName: string,
    usage: ModelUsage,
    projectId: string,
    type: string,
  ) {
    if (type === 'EMBEDDING') {
      return this.logEmbeddingUsage(provider, modelName, usage, projectId);
    } else if (type === 'TEXT_TO_TEXT') {
      return this.logTextToTextUsage(provider, modelName, usage, projectId);
    } else {
      throw new Error(`Type d'utilisation non reconnu: ${type}`);
    }
  }
}
