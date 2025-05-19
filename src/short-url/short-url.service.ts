import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ShortUrlRepository } from '@/short-url/short-url.repository';
import { ShortUrl } from '@prisma/client';

@Injectable()
export class ShortUrlService {
  private readonly logger = new Logger(ShortUrlService.name);

  constructor(private readonly repository: ShortUrlRepository) {}

  // Generates a short random id
  generateShortId(length = 7): string {
    return Math.random()
      .toString(36)
      .substring(2, 2 + length);
  }

  // Stores the mapping and returns the id
  async createShortUrl(longUrl: string): Promise<string> {
    const shortId = this.generateShortId();
    await this.repository.create(shortId, longUrl);
    this.logger.debug(`Short URL created: ${shortId}`);
    return shortId;
  }

  // Retrieves the long url from the id
  async getLongUrl(shortId: string): Promise<string> {
    const record: ShortUrl | null =
      await this.repository.findByShortId(shortId);
    if (!record || record.expiresAt < new Date()) {
      throw new NotFoundException('URL not found');
    }
    return record.longUrl;
  }
}
