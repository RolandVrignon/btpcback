import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ShortUrl } from '@prisma/client';

@Injectable()
export class ShortUrlRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(shortId: string, longUrl: string): Promise<ShortUrl> {
    return this.prisma.executeWithQueue(() =>
      this.prisma.shortUrl.create({
        data: { shortId, longUrl },
      }),
    );
  }

  async findByShortId(shortId: string): Promise<ShortUrl | null> {
    return this.prisma.executeWithQueue(() =>
      this.prisma.shortUrl.findUnique({
        where: { shortId },
      }),
    );
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.executeWithQueue(() =>
      this.prisma.shortUrl.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      }),
    );
    return result.count;
  }
}
