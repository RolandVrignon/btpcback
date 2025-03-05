import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private static readonly MAX_CONCURRENT_OPERATIONS = 20;
  private operationQueue: Array<() => Promise<unknown>> = [];
  private runningOperations = 0;

  constructor() {
    /* eslint-disable @typescript-eslint/no-unsafe-call */
    super({
      log: ['info', 'warn', 'error'],
      // Configurer les options de connexion
      datasourceUrl: process.env.DATABASE_URL,
    });
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
    return new Promise<T>((resolve, reject) => {
      // Ajouter l'opération à la file d'attente
      this.operationQueue.push(async () => {
        try {
          const result = await operation();
          resolve(result);
          return result;
        } catch (error) {
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
    if (
      this.operationQueue.length > 0 &&
      this.runningOperations < PrismaService.MAX_CONCURRENT_OPERATIONS
    ) {
      const operation = this.operationQueue.shift();
      if (operation) {
        this.runningOperations++;
        // Exécuter l'opération sans attendre sa résolution ici
        // car elle est déjà gérée dans executeWithQueue
        operation().catch(() => {
          // Les erreurs sont déjà gérées dans executeWithQueue
          // Cette capture est juste pour éviter les erreurs non gérées
        });
      }
    }
  }
}
