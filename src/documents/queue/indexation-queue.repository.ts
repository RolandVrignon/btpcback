import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IndexationQueueRepository {
  private readonly logger = new Logger(IndexationQueueRepository.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Récupère les statistiques de connexion à la base de données
   * @returns Statistiques sur les connexions actives et totales
   */
  async getConnectionStats() {
    try {
      // Utiliser executeWithQueue pour encapsuler la requête SQL brute
      const result = await this.prisma.executeWithQueue(
        () =>
          this.prisma.$queryRaw`
          SELECT
            count(*) FILTER (WHERE state = 'active') as active_connections,
            count(*) as total_connections
          FROM pg_stat_activity
          WHERE datname = current_database()
        `,
      );

      // Utiliser une assertion de type pour éviter l'erreur
      const typedResult = result as Array<{
        active_connections: string;
        total_connections: string;
      }>;

      const activeConnections = parseInt(typedResult[0].active_connections, 10);
      const totalConnections = parseInt(typedResult[0].total_connections, 10);

      return {
        activeConnections,
        totalConnections,
      };
    } catch (error) {
      this.logger.error(
        'Erreur lors de la récupération des statistiques de connexion:',
        error,
      );
      // Retourner null en cas d'erreur
      return null;
    }
  }
}
