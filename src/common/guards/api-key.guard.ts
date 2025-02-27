import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new UnauthorizedException('Clé API manquante');
    }

    return this.validateApiKey(apiKey, request);
  }

  private async validateApiKey(
    apiKey: string,
    request: Request,
  ): Promise<boolean> {
    const foundApiKey = await this.prisma.apikey.findUnique({
      where: { key: apiKey },
      include: { organization: true },
    });

    if (!foundApiKey) {
      throw new UnauthorizedException('Clé API invalide');
    }

    // Ajouter l'organisation à la requête pour une utilisation ultérieure
    request['organization'] = foundApiKey.organization;

    return true;
  }
}
