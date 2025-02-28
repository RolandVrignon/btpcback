import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApikeyDto } from './dto/create-apikey.dto';
import { UpdateApikeyDto } from './dto/update-apikey.dto';
import * as crypto from 'crypto';

@Injectable()
export class ApikeysRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * Crée une nouvelle clé API
   */
  async create(createApikeyDto: CreateApikeyDto) {
    try {
      // Générer une clé API aléatoire
      const apiKey = crypto.randomBytes(32).toString('hex');

      // Créer l'entrée dans la base de données
      const createdApiKey = await this.prisma.apikey.create({
        data: {
          ...createApikeyDto,
          key: apiKey,
        },
        include: {
          organization: true,
        },
      });

      return createdApiKey;
    } catch (error) {
      throw new Error(
        `Erreur lors de la création de la clé API: ${error.message}`,
      );
    }
  }

  /**
   * Récupère toutes les clés API
   */
  async findAll() {
    try {
      return await this.prisma.apikey.findMany();
    } catch (error) {
      throw new Error(
        `Erreur lors de la récupération des clés API: ${error.message}`,
      );
    }
  }

  /**
   * Récupère toutes les clés API d'une organisation
   */
  async findAllByOrganization(organizationId: string) {
    try {
      return await this.prisma.apikey.findMany({
        where: {
          organizationId,
        },
        include: {
          organization: true,
        },
      });
    } catch (error) {
      throw new Error(
        `Erreur lors de la récupération des clés API: ${error.message}`,
      );
    }
  }

  /**
   * Récupère une clé API par son ID
   */
  async findOne(id: string) {
    try {
      const apiKey = await this.prisma.apikey.findUnique({
        where: { id },
        include: {
          organization: true,
        },
      });

      if (!apiKey) {
        throw new NotFoundException(`Clé API avec l'ID ${id} non trouvée`);
      }

      return apiKey;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(
        `Erreur lors de la récupération de la clé API: ${error.message}`,
      );
    }
  }

  /**
   * Valide une clé API et retourne l'organisation associée
   */
  async validateApiKey(key: string) {
    try {
      const apiKey = await this.prisma.apikey.findFirst({
        where: {
          key,
        },
        include: {
          organization: true,
        },
      });

      if (!apiKey) {
        throw new NotFoundException('Clé API invalide');
      }

      return apiKey;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(
        `Erreur lors de la validation de la clé API: ${error.message}`,
      );
    }
  }

  /**
   * Met à jour une clé API
   */
  async update(id: string, updateApikeyDto: UpdateApikeyDto) {
    try {
      // Vérifier si la clé API existe
      const existingApiKey = await this.prisma.apikey.findUnique({
        where: { id },
      });

      if (!existingApiKey) {
        throw new NotFoundException(`Clé API avec l'ID ${id} non trouvée`);
      }

      // Mettre à jour la clé API
      return await this.prisma.apikey.update({
        where: { id },
        data: updateApikeyDto,
        include: {
          organization: true,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(
        `Erreur lors de la mise à jour de la clé API: ${error.message}`,
      );
    }
  }

  /**
   * Supprime une clé API
   */
  async remove(id: string) {
    try {
      // Vérifier si la clé API existe
      const existingApiKey = await this.prisma.apikey.findUnique({
        where: { id },
      });

      if (!existingApiKey) {
        throw new NotFoundException(`Clé API avec l'ID ${id} non trouvée`);
      }

      // Supprimer la clé API
      return await this.prisma.apikey.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(
        `Erreur lors de la suppression de la clé API: ${error.message}`,
      );
    }
  }

  /**
   * Désactive une clé API
   */
  async deactivate(id: string) {
    try {
      // Vérifier si la clé API existe
      const existingApiKey = await this.prisma.apikey.findUnique({
        where: { id },
      });

      if (!existingApiKey) {
        throw new NotFoundException(`Clé API avec l'ID ${id} non trouvée`);
      }

      // Désactiver la clé API en la supprimant
      return await this.prisma.apikey.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(
        `Erreur lors de la désactivation de la clé API: ${error.message}`,
      );
    }
  }
}
