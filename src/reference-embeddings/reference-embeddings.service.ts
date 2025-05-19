import { Injectable } from '@nestjs/common';
import { ReferenceEmbeddingsRepository } from './reference-embeddings.repository';
import { SearchSimilarResult } from './interface/SearchSimilarResult';
@Injectable()
export class ReferenceEmbeddingsService {
  constructor(
    private readonly referenceEmbeddingsRepository: ReferenceEmbeddingsRepository,
  ) {}

  async searchSimilar(
    vector: number[],
    limit: number = 5,
  ): Promise<SearchSimilarResult[]> {
    return this.referenceEmbeddingsRepository.searchSimilar(vector, limit);
  }
}
