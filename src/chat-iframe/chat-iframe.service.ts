import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ChatIframeService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Vérifie si l'APIKey est valide et renvoie l'organisation associée
   */
  async validateApiKeyAndGetOrganization(apiKey: string) {
    if (!apiKey) {
      throw new UnauthorizedException('APIKey non fournie');
    }

    const apiKeyRecord = await this.prisma.apikey.findUnique({
      where: { key: apiKey },
      include: { organization: true },
    });

    if (!apiKeyRecord) {
      throw new UnauthorizedException('APIKey invalide');
    }

    return apiKeyRecord.organization;
  }

  /**
   * Vérifie si le projet existe et s'il appartient à l'organisation
   */
  async validateProjectAccess(projectId: string, organizationId: string) {
    if (!projectId) {
      throw new NotFoundException('ID du projet non fourni');
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Projet avec l'ID ${projectId} non trouvé`);
    }

    if (project.organizationId !== organizationId) {
      throw new UnauthorizedException("Vous n'avez pas accès à ce projet");
    }

    return project;
  }

  /**
   * Vérifie à la fois l'APIKey et l'accès au projet
   */
  async validateAccessAndGetProject(apiKey: string, projectId: string) {
    const organization = await this.validateApiKeyAndGetOrganization(apiKey);
    const project = await this.validateProjectAccess(
      projectId,
      organization.id,
    );

    return { organization, project };
  }

  /**
   * Traite un message utilisateur et génère une réponse via le LLM
   */
  async processMessage(projectId: string, message: string) {
    // Récupérer le projet pour obtenir des informations contextuelles si nécessaire
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Projet avec l'ID ${projectId} non trouvé`);
    }

    try {
      // Configurer le provider OpenAI
      const openai = createOpenAI({
        apiKey: this.configService.get<string>('OPENAI_API_KEY'),
        compatibility: 'strict',
      });

      // Générer une réponse avec AI SDK
      const result = await generateText({
        model: openai('gpt-4'),
        messages: [
          {
            role: 'system',
            content: `Tu es un assistant IA pour un projet nommé "${project.name}". Ton objectif est d'aider l'utilisateur avec ses questions concernant ce projet. Sois concis et précis dans tes réponses.`,
          },
          { role: 'user', content: message },
        ],
      });

      // Enregistrer l'utilisation pour la facturation/le suivi
      await this.prisma.usage.create({
        data: {
          provider: 'OPENAI',
          modelName: 'gpt-4',
          type: 'TEXT_TO_TEXT',
          projectId: projectId,
          // Note: dans une implémentation réelle, vous pourriez capturer et stocker
          // les informations de token à partir de la réponse de l'API
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
      });

      return result.text;
    } catch (error) {
      console.error('Erreur lors de la génération de texte:', error);
      throw new Error('Erreur lors du traitement du message');
    }
  }
}
