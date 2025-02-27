import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApikeyDto } from './dto/create-apikey.dto';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ApikeysService {
  constructor(private prisma: PrismaService) {}

  async create(createApikeyDto: CreateApikeyDto) {
    // Vérifier si l'organisation existe
    const organization = await this.prisma.organization.findUnique({
      where: { id: createApikeyDto.organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organisation non trouvée');
    }

    // Générer une clé API unique
    const apiKey = this.generateApiKey();

    return await this.prisma.apikey.create({
      data: {
        key: apiKey,
        organizationId: createApikeyDto.organizationId,
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

  async findByOrganization(organizationId: string) {
    return await this.prisma.apikey.findMany({
      where: { organizationId },
      include: {
        organization: true,
      },
    });
  }

  async findOne(id: string, organizationId: string) {
    const apikey = await this.prisma.apikey.findUnique({
      where: { id },
      include: {
        organization: true,
      },
    });

    if (!apikey) {
      throw new NotFoundException('Clé API non trouvée');
    }

    // Vérifier si l'utilisateur a accès à cette clé API
    if (apikey.organizationId !== organizationId) {
      throw new ForbiddenException('Accès non autorisé à cette clé API');
    }

    return apikey;
  }

  async remove(id: string) {
    try {
      return await this.prisma.apikey.delete({
        where: { id },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Clé API non trouvée');
      }
      throw error;
    }
  }

  private generateApiKey(): string {
    return randomBytes(32).toString('hex');
  }
}
