import { Injectable } from '@nestjs/common';
import { ReferenceEmbeddingsRepository } from './reference-embeddings.repository';

@Injectable()
export class ReferenceEmbeddingsService {
  constructor(
    private readonly referenceEmbeddingsRepository: ReferenceEmbeddingsRepository,
  ) {}

  async searchSimilar(vector: number[], limit: number = 5) {
    return this.referenceEmbeddingsRepository.searchSimilar(vector, limit);
  }
}
