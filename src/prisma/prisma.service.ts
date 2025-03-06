import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private static readonly MAX_CONCURRENT_OPERATIONS = 50;
  private operationQueue: Array<() => Promise<unknown>> = [];
  private runningOperations = 0;
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    /* eslint-disable @typescript-eslint/no-unsafe-call */
    const dbUrl = process.env.DATABASE_URL || '';
    const connectionLimit = 64; // 80% de la limite de 81 connexions

    // Ajouter le paramètre connection_limit à l'URL si ce n'est pas déjà fait
    const dbUrlWithConnectionLimit = dbUrl.includes('connection_limit=')
      ? dbUrl
      : dbUrl.includes('?')
        ? `${dbUrl}&connection_limit=${connectionLimit}`
        : `${dbUrl}?connection_limit=${connectionLimit}`;

    super({
      log: ['info', 'warn', 'error'],
      // Configurer les options de connexion avec la limite de connexions
      datasourceUrl: dbUrlWithConnectionLimit,
    });

    this.logger.log(
      `Pool de connexions configuré avec connection_limit=${connectionLimit}`,
    );
    this.logger.log(
      `File d'attente d'opérations configurée: max=${PrismaService.MAX_CONCURRENT_OPERATIONS}`,
    );
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Exécute une opération en utilisant une file d'attente pour limiter
   * le nombre d'opérations concurrentes sur la base de données
   */
  async executeWithQueue<T>(operation: () => Promise<T>): Promise<T> {
    // Utiliser le logger au lieu de console.log pour une meilleure gestion des logs
    this.logger.debug(
      `Ajout d'une opération à la file d'attente (${this.operationQueue.length} en attente)`,
    );

    return new Promise<T>((resolve, reject) => {
      // Ajouter l'opération à la file d'attente
      this.operationQueue.push(async () => {
        this.logger.debug(`Exécution d'une opération depuis la file d'attente`);

        try {
          const result = await operation();
          this.logger.debug('Opération réussie');
          resolve(result);
          return result;
        } catch (error) {
          this.logger.error(
            `Erreur lors de l'exécution de l'opération: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
            error instanceof Error ? error.stack : undefined,
          );

          // S'assurer que l'erreur est une instance d'Error
          const errorToReject =
            error instanceof Error
              ? error
              : new Error(
                  typeof error === 'string'
                    ? error
                    : 'Une erreur inconnue est survenue',
                );
          reject(errorToReject);
          throw errorToReject;
        } finally {
          this.runningOperations--;
          this.logger.debug(
            `Opérations en cours: ${this.runningOperations}, en attente: ${this.operationQueue.length}`,
          );
          this.processQueue();
        }
      });

      // Traiter la file d'attente
      this.processQueue();
    });
  }

  /**
   * Traite les opérations en attente dans la file
   */
  private processQueue(): void {
    // Utiliser le logger au lieu de console.log pour une meilleure gestion des logs
    this.logger.debug(
      `État de la file: ${this.runningOperations}/${PrismaService.MAX_CONCURRENT_OPERATIONS} opérations en cours, ${this.operationQueue.length} en attente`,
    );

    if (
      this.operationQueue.length > 0 &&
      this.runningOperations < PrismaService.MAX_CONCURRENT_OPERATIONS
    ) {
      const operation = this.operationQueue.shift();
      if (operation) {
        this.runningOperations++;
        this.logger.debug(
          `Démarrage d'une nouvelle opération, total en cours: ${this.runningOperations}`,
        );

        // Exécuter l'opération sans attendre sa résolution ici
        // car elle est déjà gérée dans executeWithQueue
        operation().catch((error) => {
          this.logger.error(
            `Erreur non gérée dans processQueue: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
            error instanceof Error ? error.stack : undefined,
          );
          // Les erreurs sont déjà gérées dans executeWithQueue
          // Cette capture est juste pour éviter les erreurs non gérées
        });
      }
    } else if (this.operationQueue.length > 0) {
      this.logger.debug(
        `Limite d'opérations concurrentes atteinte (${this.runningOperations}/${PrismaService.MAX_CONCURRENT_OPERATIONS}), ${this.operationQueue.length} en attente`,
      );
    }
  }
}
