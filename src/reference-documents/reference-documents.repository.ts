import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateReferenceDocumentDto } from './dto/create-reference-document.dto';

@Injectable()
export class ReferenceDocumentsRepository {
  private readonly logger = new Logger(ReferenceDocumentsRepository.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Crée un nouveau document de référence dans la base de données
   */
  async create(data: CreateReferenceDocumentDto) {
    return this.prisma.executeWithQueue(async () => {
      return await this.prisma.referenceDocument.create({
        data: {
          ...data,
          path: data.path || '',
        },
      });
    });
  }

  /**
   * Récupère tous les documents de référence
   */
  async findAll() {
    try {
      return await this.prisma.executeWithQueue(() =>
        this.prisma.referenceDocument.findMany(),
      );
    } catch (error) {
      throw new Error(
        `Erreur lors de la récupération des documents de référence: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Récupère un document de référence par son ID
   */
  async findOne(id: string) {
    try {
      const doc = await this.prisma.executeWithQueue(() =>
        this.prisma.referenceDocument.findUnique({ where: { id } }),
      );
      if (!doc) throw new NotFoundException('Reference document not found');
      return doc;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new Error(
        `Erreur lors de la récupération du document de référence: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Met à jour un document de référence
   */
  async update(id: string, data: Prisma.ReferenceDocumentUpdateInput) {
    try {
      return await this.prisma.executeWithQueue(() =>
        this.prisma.referenceDocument.update({ where: { id }, data }),
      );
    } catch (error) {
      this.logger.error(
        `[REPOSITORY] ReferenceDocument non trouvé ou erreur: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Supprime un document de référence
   */
  async remove(id: string) {
    try {
      return await this.prisma.executeWithQueue(() =>
        this.prisma.referenceDocument.delete({ where: { id } }),
      );
    } catch (error) {
      this.logger.error(
        `[REPOSITORY] ReferenceDocument non trouvé ou erreur: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Recherche vectorielle sur ReferenceDocument
   */
  async searchSimilar(vector: number[], limit: number = 5) {
    // Requête SQL brute sur application_domain_vector
    const results = await this.prisma.$queryRawUnsafe(`
      SELECT id, title, application_domain,
        (application_domain_vector <=> '[${vector.join(',')}]') AS distance
      FROM "ReferenceDocument"
      WHERE application_domain_vector IS NOT NULL
      ORDER BY distance ASC
      LIMIT ${limit}
    `);

    return results;
  }

  /**
   * Recherche le document de référence dont le titre est le plus proche (recherche full text ou LIKE)
   */
  async findByTitleSimilarity(title: string) {
    // Recherche simple avec ILIKE pour trouver le titre le plus proche
    const results = await this.prisma.executeWithQueue(() =>
      this.prisma.referenceDocument.findMany({
        where: {
          title: {
            contains: title,
            mode: 'insensitive',
          },
        },
        orderBy: {
          title: 'asc',
        },
        take: 5,
      }),
    );
    // Retourner le plus proche (premier résultat)
    return results[0] || null;
  }
}
