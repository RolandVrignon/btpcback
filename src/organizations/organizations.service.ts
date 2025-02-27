/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';

// Interface pour les erreurs Prisma
interface PrismaError {
  code: string;
  meta?: Record<string, unknown>;
  message: string;
}

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async create(createOrganizationDto: CreateOrganizationDto) {
    try {
      return await this.prisma.organization.create({
        data: createOrganizationDto,
      });
    } catch (error) {
      if ((error as PrismaError).code === 'P2002') {
        throw new ConflictException('Une organisation avec ce nom existe déjà');
      }
      throw error;
    }
  }

  async findAll() {
    return await this.prisma.organization.findMany({
      include: {
        apikeys: true,
      },
    });
  }

  async findOne(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        apikeys: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organisation non trouvée');
    }

    return organization;
  }

  async remove(id: string) {
    try {
      // Vérifier si l'organisation existe
      const organization = await this.prisma.organization.findUnique({
        where: { id },
      });

      if (!organization) {
        throw new NotFoundException('Organisation non trouvée');
      }

      // Supprimer l'organisation (la suppression en cascade est gérée par Prisma)
      return await this.prisma.organization.delete({
        where: { id },
      });
    } catch (error) {
      if ((error as PrismaError).code === 'P2025') {
        throw new NotFoundException('Organisation non trouvée');
      }
      throw error;
    }
  }
}
