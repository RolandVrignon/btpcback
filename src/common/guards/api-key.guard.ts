import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ApikeysRepository } from '@/apikeys/apikeys.repository';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private apikeysRepository: ApikeysRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('API key is missing');
    }

    // Utiliser le repository pour valider la clé API
    const foundApiKey =
      await this.apikeysRepository.findByKeyWithOrganization(apiKey);

    if (!foundApiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Ajouter l'organisation à la requête pour une utilisation ultérieure
    request.organization = foundApiKey.organization;
    request.apiKey = foundApiKey;

    return true;
  }

  private extractApiKey(request: any): string | undefined {
    const apiKey =
      request.headers['x-api-key'] ||
      request.query.apiKey ||
      request.body?.apiKey;
    return apiKey;
  }
}
