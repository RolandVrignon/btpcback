import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApiDto } from './dto/create-api.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class ApisService {
  constructor(private prisma: PrismaService) {}

  async create(createApiDto: CreateApiDto) {
    // Vérifier si l'organisation existe
    const organization = await this.prisma.organization.findUnique({
      where: { id: createApiDto.organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organisation non trouvée');
    }

    // Générer une clé API unique
    const apiKey = this.generateApiKey();

    return await this.prisma.apikey.create({
      data: {
        key: apiKey,
        organizationId: createApiDto.organizationId,
      },
    });
  }

  async findAll() {
    return await this.prisma.apikey.findMany({
      include: {
        organization: true,
      },
    });
  }

  async findOne(id: number) {
    const api = await this.prisma.apikey.findUnique({
      where: { id },
      include: {
        organization: true,
      },
    });

    if (!api) {
      throw new NotFoundException('API non trouvée');
    }

    return api;
  }

  async remove(id: number) {
    try {
      return await this.prisma.apikey.delete({
        where: { id },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('API non trouvée');
      }
      throw error;
    }
  }

  private generateApiKey(): string {
    return randomBytes(32).toString('hex');
  }
}