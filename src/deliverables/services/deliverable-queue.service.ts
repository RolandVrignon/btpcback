import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Semaphore } from 'async-mutex';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DeliverableQueueService {
  private semaphore: Semaphore;
  private currentTasks = 0;
  private readonly MAX_CONCURRENT_TASKS: number;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {
    this.MAX_CONCURRENT_TASKS = this.configService.get<number>(
      'MAXIMUM_DELIVERABLES_CONCURRENT_TASKS',
      3,
    );
    this.semaphore = new Semaphore(this.MAX_CONCURRENT_TASKS);
  }

  async processTask<T>(task: () => Promise<T>): Promise<T> {
    const [, release] = await this.semaphore.acquire();
    this.currentTasks++;

    try {
      return await task();
    } finally {
      this.currentTasks--;
      release();
    }
  }

  getAvailableSlots(): number {
    return this.MAX_CONCURRENT_TASKS - this.currentTasks;
  }

  getCurrentLoad(): number {
    return this.currentTasks;
  }

  getMaxConcurrentTasks(): number {
    return this.MAX_CONCURRENT_TASKS;
  }
}
