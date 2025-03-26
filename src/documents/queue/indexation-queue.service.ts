import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IndexationQueueRepository } from './indexation-queue.repository';

interface IndexationTask {
  id: string;
  execute: () => Promise<void>;
  priority: number;
  createdAt: number;
}

@Injectable()
export class IndexationQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IndexationQueueService.name);
  private queue: IndexationTask[] = [];
  private isProcessing = false;
  private concurrentTasks = 0;
  private maxConcurrentTasks: number;
  private reservedConnectionsPercentage: number;
  private maxIndexationConnectionsPercentage: number;
  private interval: NodeJS.Timeout;
  private connectionPoolSize: number;
  private taskPerformance: Record<
    string,
    { startTime: number; endTime?: number }
  > = {};
  private totalTasksProcessed = 0;
  private totalProcessingTime = 0;

  constructor(
    private configService: ConfigService,
    private indexationQueueRepository: IndexationQueueRepository,
  ) {
    // Récupérer les paramètres depuis les variables d'environnement
    this.connectionPoolSize = parseInt(
      this.configService.get<string>('DATABASE_CONNECTION_POOL_SIZE', '65'),
      10,
    );

    this.reservedConnectionsPercentage = parseInt(
      this.configService.get<string>('RESERVED_CONNECTIONS_PERCENTAGE', '10'),
      10,
    );

    this.maxIndexationConnectionsPercentage = parseInt(
      this.configService.get<string>(
        'MAX_INDEXATION_CONNECTIONS_PERCENTAGE',
        '70',
      ),
      10,
    );

    // Calculer le nombre maximum de tâches concurrentes
    const idealConcurrentTasks = Math.max(
      1, // Garantir au moins 1 connexion pour l'indexation
      Math.floor(
        (this.connectionPoolSize * this.maxIndexationConnectionsPercentage) /
          100,
      ),
    );

    // Initialiser avec la valeur idéale
    this.maxConcurrentTasks = idealConcurrentTasks;

    this.logger.log(`Taille du pool de connexions: ${this.connectionPoolSize}`);
    this.logger.log(
      `Pourcentage réservé pour les autres opérations: ${this.reservedConnectionsPercentage}%`,
    );
    this.logger.log(
      `Pourcentage maximum pour l'indexation: ${this.maxIndexationConnectionsPercentage}%`,
    );
    this.logger.log(
      `Nombre maximum de tâches d'indexation concurrentes: ${this.maxConcurrentTasks}`,
    );
  }

  onModuleInit() {
    // Démarrer la surveillance de l'utilisation des connexions
    this.interval = setInterval(() => {
      void this.monitorConnectionUsage();
    }, 5000);
  }

  onModuleDestroy() {
    clearInterval(this.interval);
  }

  private async monitorConnectionUsage() {
    try {
      // Obtenir des statistiques sur l'utilisation des connexions via le repository
      const stats = await this.getConnectionStats();

      // Ajuster le nombre maximum de tâches concurrentes en fonction de l'utilisation
      this.adjustConcurrency(stats.activeConnections, stats.totalConnections);

      // Mettre à jour les priorités des tâches en attente
      this.updateQueuePriorities();
    } catch (error) {
      this.logger.error(
        'Erreur lors de la surveillance des connexions:',
        error,
      );
    }
  }

  private async getConnectionStats() {
    // Utiliser le repository pour obtenir les statistiques de connexion
    const stats = await this.indexationQueueRepository.getConnectionStats();

    if (stats) {
      return stats;
    }

    // Valeurs par défaut en cas d'erreur - utiliser la valeur configurée
    return {
      activeConnections: this.concurrentTasks,
      totalConnections: this.connectionPoolSize,
    };
  }

  private adjustConcurrency(
    activeConnections?: number,
    totalConnections?: number,
  ) {
    if (!activeConnections || !totalConnections) {
      // Si pas de statistiques, utiliser les valeurs par défaut
      return;
    }

    // Utiliser la taille du pool configurée plutôt que la valeur dynamique
    // qui peut être incorrecte dans certains cas
    const effectiveTotalConnections = Math.max(
      totalConnections,
      this.connectionPoolSize,
    );

    // Calculer le pourcentage d'utilisation actuel
    const usagePercentage =
      (activeConnections / effectiveTotalConnections) * 100;

    // Calculer le nombre de connexions disponibles pour l'indexation
    const reservedConnections = Math.ceil(
      (effectiveTotalConnections * this.reservedConnectionsPercentage) / 100,
    );

    // Calculer le nombre maximum de tâches concurrentes en fonction de l'utilisation actuelle
    const nonIndexationConnections = activeConnections - this.concurrentTasks;

    // Calculer le nombre idéal de connexions pour l'indexation
    const idealIndexationConnections = Math.max(
      1,
      Math.floor(
        (effectiveTotalConnections * this.maxIndexationConnectionsPercentage) /
          100,
      ),
    );
    // S'assurer que les autres opérations ont au moins le pourcentage réservé
    if (nonIndexationConnections < reservedConnections) {
      // Augmenter le nombre de connexions disponibles pour les autres opérations
      const newMaxConcurrent = Math.max(
        1, // Garantir au moins 1 connexion pour l'indexation
        Math.min(
          idealIndexationConnections, // Ne pas dépasser le nombre idéal
          activeConnections - reservedConnections,
        ),
      );

      if (newMaxConcurrent !== this.maxConcurrentTasks) {
        this.maxConcurrentTasks = newMaxConcurrent;
      }
    } else {
      // Si les autres opérations ont suffisamment de connexions, augmenter progressivement
      // le nombre maximum de tâches concurrentes jusqu'à la limite idéale
      if (
        this.maxConcurrentTasks < idealIndexationConnections &&
        usagePercentage < 80
      ) {
        // Augmenter progressivement (pas plus de 5 à la fois pour éviter les pics)
        const increment = Math.min(
          5,
          idealIndexationConnections - this.maxConcurrentTasks,
        );
        this.maxConcurrentTasks = Math.min(
          this.maxConcurrentTasks + increment,
          idealIndexationConnections,
        );
        this.logger.log(
          `Augmentation du nombre maximum de tâches concurrentes à ${this.maxConcurrentTasks} (idéal: ${idealIndexationConnections})`,
        );
      }
    }

    // Démarrer le traitement si nécessaire
    void this.processQueue();
  }

  addTask(task: () => Promise<void>, priority = 0): Promise<string> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    this.queue.push({
      id: taskId,
      execute: task,
      priority,
      createdAt: Date.now(),
    });

    // Trier la file d'attente par priorité (plus la valeur est élevée, plus la priorité est haute)
    this.queue.sort((a, b) => b.priority - a.priority);

    // Démarrer le traitement si ce n'est pas déjà en cours
    if (!this.isProcessing) {
      void this.processQueue();
    }

    return Promise.resolve(taskId);
  }

  private processQueue(): void {
    // Si déjà en train de traiter, ou si la queue est vide, ou si le nombre maximum de tâches est atteint
    if (
      this.isProcessing ||
      this.queue.length === 0 ||
      this.concurrentTasks >= this.maxConcurrentTasks
    ) {
      // Si la file d'attente n'est pas vide mais que nous ne pouvons pas traiter de tâches,
      // afficher un message de diagnostic
      if (
        this.queue.length > 0 &&
        this.concurrentTasks >= this.maxConcurrentTasks
      ) {
        this.logger.log(
          `File d'attente bloquée: ${this.queue.length} tâches en attente, ${this.concurrentTasks}/${this.maxConcurrentTasks} tâches en cours`,
        );
      }
      return;
    }

    // Forcer au moins une tâche concurrente si la file d'attente n'est pas vide
    if (this.maxConcurrentTasks === 0 && this.queue.length > 0) {
      this.maxConcurrentTasks = 1;
      this.logger.log(
        "Forçage du nombre maximum de tâches concurrentes à 1 pour débloquer la file d'attente",
      );
    }

    this.isProcessing = true;

    try {
      // Traiter les tâches tant qu'il y en a et que le nombre maximum n'est pas atteint
      while (
        this.queue.length > 0 &&
        this.concurrentTasks < this.maxConcurrentTasks
      ) {
        const task = this.queue.shift();

        if (task) {
          this.concurrentTasks++;
          this.logger.log(
            `Démarrage de la tâche ${task.id} (${this.concurrentTasks}/${this.maxConcurrentTasks} tâches en cours)`,
          );

          // Exécuter la tâche de manière asynchrone
          void this.executeTask(task).finally(() => {
            this.concurrentTasks--;
            this.logger.log(
              `Fin de la tâche ${task.id} (${this.concurrentTasks}/${this.maxConcurrentTasks} tâches en cours, ${this.queue.length} en attente)`,
            );

            // Vérifier s'il y a encore des tâches à traiter
            if (this.queue.length > 0) {
              // Continuer à traiter la file d'attente après un court délai
              // pour éviter de bloquer le thread principal
              setTimeout(() => this.processQueue(), 0);
            }
          });
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeTask(task: IndexationTask): Promise<void> {
    const startTime = Date.now();
    this.taskPerformance[task.id] = { startTime };

    try {
      this.logger.log(
        `Exécution de la tâche ${task.id} (priorité: ${task.priority})`,
      );

      // Exécuter la tâche avec un timeout pour éviter les tâches bloquantes
      await Promise.race([
        task.execute(),
        new Promise((_, reject) => {
          // Timeout après 30 minutes (ajustable selon vos besoins)
          const timeoutMs = 30 * 60 * 1000;
          setTimeout(
            () =>
              reject(
                new Error(`Tâche ${task.id} annulée après ${timeoutMs}ms`),
              ),
            timeoutMs,
          );
        }),
      ]);

      const endTime = Date.now();
      this.taskPerformance[task.id].endTime = endTime;

      const processingTime = endTime - startTime;
      this.totalTasksProcessed++;
      this.totalProcessingTime += processingTime;

      const avgProcessingTime =
        this.totalProcessingTime / this.totalTasksProcessed;

      this.logger.log(`Tâche ${task.id} terminée en ${processingTime}ms`);
      this.logger.log(
        `Temps moyen de traitement: ${avgProcessingTime.toFixed(2)}ms`,
      );

      // Nettoyer les données de performance après un certain temps
      setTimeout(() => {
        delete this.taskPerformance[task.id];
      }, 3600000); // 1 heure
    } catch (error) {
      const endTime = Date.now();
      this.taskPerformance[task.id].endTime = endTime;

      const processingTime = endTime - startTime;

      this.logger.error(
        `Erreur lors de l'exécution de la tâche ${task.id} (après ${processingTime}ms):`,
        error,
      );

      // Enregistrer quand même les statistiques pour les tâches en erreur
      this.totalTasksProcessed++;
      this.totalProcessingTime += processingTime;
    }
  }

  private updateQueuePriorities() {
    const now = Date.now();

    // Augmenter la priorité des tâches qui attendent depuis longtemps
    this.queue.forEach((task) => {
      const waitTime = now - task.createdAt;
      const waitTimeMinutes = waitTime / (1000 * 60);

      // Augmenter la priorité de manière progressive
      // Plus une tâche attend, plus sa priorité augmente rapidement
      if (waitTimeMinutes >= 1) {
        // Formule: priorité augmente de façon exponentielle avec le temps d'attente
        // 1 minute = +1, 2 minutes = +2, 5 minutes = +5, 10 minutes = +10, etc.
        const priorityIncrease = Math.floor(waitTimeMinutes);

        // Limiter l'augmentation de priorité à 100 pour éviter des valeurs extrêmes
        task.priority += Math.min(priorityIncrease, 100);

        // Log pour les tâches qui attendent depuis longtemps
        if (waitTimeMinutes > 5) {
          this.logger.log(
            `Tâche ${task.id} en attente depuis ${waitTimeMinutes.toFixed(1)} minutes, priorité augmentée à ${task.priority}`,
          );
        }
      }
    });

    // Trier à nouveau la file d'attente
    this.queue.sort((a, b) => b.priority - a.priority);

    // Afficher des statistiques sur la queue
    if (this.queue.length > 0) {
      const oldestTask = this.queue.reduce(
        (oldest, task) => (task.createdAt < oldest.createdAt ? task : oldest),
        this.queue[0],
      );

      const oldestWaitTime = (now - oldestTask.createdAt) / (1000 * 60);

      if (oldestWaitTime > 1) {
        this.logger.log(
          `File d'attente: ${this.queue.length} tâches, la plus ancienne attend depuis ${oldestWaitTime.toFixed(1)} minutes (priorité: ${oldestTask.priority})`,
        );
      }
    }
  }

  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      concurrentTasks: this.concurrentTasks,
      maxConcurrentTasks: this.maxConcurrentTasks,
      averageProcessingTime:
        this.totalTasksProcessed > 0
          ? this.totalProcessingTime / this.totalTasksProcessed
          : 0,
    };
  }
}
