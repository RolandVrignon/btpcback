import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApiKeyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ApiKeyMiddleware.name);

  constructor(private prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new UnauthorizedException('Clé API manquante');
    }

    try {
      // Try to find the specific API key
      const apiKeyData = await this.prisma.executeWithQueue(() =>
        this.prisma.apikey.findUnique({
          where: { key: apiKey },
          include: {
            organization: true,
          },
        }),
      );

      if (!apiKeyData) {
        throw new UnauthorizedException('Clé API invalide');
      }

      // Ajouter les informations de l'organisation à la requête
      req['organization'] = apiKeyData.organization;

      next();
    } catch (error) {
      this.logger.error('API key verification error', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(
        'Erreur lors de la vérification de la clé API',
      );
    }
  }
}

@Injectable()
export class AdminApiKeyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AdminApiKeyMiddleware.name);

  constructor(private prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new UnauthorizedException('Clé API manquante');
    }

    try {
      // Rechercher la clé API dans la base de données
      const apiKeyData = await this.prisma.executeWithQueue(() =>
        this.prisma.apikey.findUnique({
          where: { key: apiKey },
          include: {
            organization: true,
          },
        }),
      );

      if (!apiKeyData) {
        throw new UnauthorizedException('Clé API invalide');
      }

      // Vérifier si l'organisation a le scope ADMIN
      if (apiKeyData.organization.scope !== 'ADMIN') {
        throw new ForbiddenException('Accès réservé aux administrateurs');
      }

      // Ajouter les informations de l'organisation à la requête
      req['organization'] = apiKeyData.organization;

      next();
    } catch (error) {
      this.logger.error('Admin API key verification error', error);
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new UnauthorizedException(
        'Erreur lors de la vérification de la clé API',
      );
    }
  }
}
