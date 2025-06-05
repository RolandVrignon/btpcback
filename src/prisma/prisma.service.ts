import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private static MAX_CONCURRENT_OPERATIONS: number;
  private operationQueue: Array<() => Promise<unknown>> = [];
  private runningOperations = 0;
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService?: ConfigService) {
    const dbUrl = process.env.DATABASE_URL || '';

    // Récupérer la taille du pool de connexions depuis la variable d'environnement
    const poolSize = parseInt(
      process.env.DATABASE_CONNECTION_POOL_SIZE ||
        configService?.get<string>('DATABASE_CONNECTION_POOL_SIZE', '10') ||
        '10',
      10,
    );

    // Récupérer le timeout de connexion depuis la variable d'environnement (en secondes)
    const connectionTimeout = parseInt(
      process.env.DATABASE_CONNECTION_TIMEOUT ||
        configService?.get<string>('DATABASE_CONNECTION_TIMEOUT', '30') ||
        '30',
      10,
    );

    // Ajouter les paramètres connection_limit et connection_timeout à l'URL
    let modifiedDbUrl = dbUrl;

    // Ajouter connection_limit si ce n'est pas déjà fait
    if (!modifiedDbUrl.includes('connection_limit=')) {
      modifiedDbUrl = modifiedDbUrl.includes('?')
        ? `${modifiedDbUrl}&connection_limit=${poolSize}`
        : `${modifiedDbUrl}?connection_limit=${poolSize}`;
    }

    // Ajouter connection_timeout
    if (!modifiedDbUrl.includes('connection_timeout=')) {
      modifiedDbUrl = modifiedDbUrl.includes('?')
        ? `${modifiedDbUrl}&connection_timeout=${connectionTimeout}`
        : `${modifiedDbUrl}?connection_timeout=${connectionTimeout}`;
    }

    super({
      log: ['info', 'warn', 'error'],
      // Configurer les options de connexion avec la limite de connexions et le timeout
      datasourceUrl: modifiedDbUrl,
    });

    // Définir la valeur statique après l'appel à super
    PrismaService.MAX_CONCURRENT_OPERATIONS = poolSize;

    this.logger.log(
      `Initialisation du pool PostgreSQL avec ${poolSize} connexions et un timeout de ${connectionTimeout} secondes`,
    );
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    this.logger.log('Déconnexion de la base de données.');
    await this.$disconnect();
  }

  /**
   * Exécute une opération en utilisant une file d'attente pour limiter
   * le nombre d'opérations concurrentes sur la base de données
   */
  async executeWithQueue<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      retryDelay?: number;
      currentRetry?: number;
    } = {},
  ): Promise<T> {
    // Paramètres par défaut
    const maxRetries = options.maxRetries ?? 3;
    const retryDelay = options.retryDelay ?? 5000; // 5 secondes par défaut
    const currentRetry = options.currentRetry ?? 0;

    return new Promise<T>((resolve, reject) => {
      // Ajouter l'opération à la file d'attente
      this.operationQueue.push(async () => {
        try {
          const result = await operation();
          resolve(result);
          return result;
        } catch (error) {
          this.logger.error(
            `Erreur lors de l'exécution de l'opération (tentative ${currentRetry + 1}/${maxRetries}): ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
            error instanceof Error ? error.stack : undefined,
          );

          // Si on n'a pas dépassé le nombre maximum de tentatives, réessayer
          if (currentRetry < maxRetries - 1) {
            this.logger.log(`Réessai de l'opération dans ${retryDelay}ms...`);

            // Programmation d'une nouvelle tentative après un délai
            setTimeout(() => {
              void this.executeWithQueue(operation, {
                maxRetries,
                retryDelay,
                currentRetry: currentRetry + 1,
              })
                .then(resolve)
                .catch(reject);
            }, retryDelay);
          } else {
            // On a épuisé toutes les tentatives, rejeter la promesse
            this.logger.error(
              `Abandon après ${maxRetries} tentatives échouées.`,
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
          }
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
        operation().catch((error) => {
          this.logger.error(
            `Erreur non gérée dans processQueue: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
            error instanceof Error ? error.stack : undefined,
          );
        });
      }
    }
  }
}
