import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ApikeysRepository } from '@/apikeys/apikeys.repository';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apikeysRepository: ApikeysRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('API key is missing');
    }

    const isValid = await this.validateApiKey(apiKey);

    if (!isValid) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }

  private extractApiKey(request: any): string | undefined {
    // Check for API key in Authorization header (Bearer token)
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check for API key in custom header
    return request.headers['x-api-key'];
  }

  private async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const key = await this.apikeysRepository.findByKey(apiKey);
      return !!key;
    } catch (error) {
      return false;
    }
  }
}
