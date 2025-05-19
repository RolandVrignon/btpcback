import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SearchSimilarResult } from './interface/SearchSimilarResult';
@Injectable()
export class ReferenceEmbeddingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recherche vectorielle sur ReferenceEmbedding
   */
  async searchSimilar(
    vector: number[],
    limit: number = 5,
  ): Promise<SearchSimilarResult[]> {
    // Requête SQL brute sur le champ vector de ReferenceEmbedding
    const results = await this.prisma.$queryRawUnsafe(`
      SELECT re.id, re."referenceChunkId", rc.text, rc."referenceDocumentId", rc.page, rd.title AS "referenceDocumentTitle",
        (re.vector <=> '[${vector.join(',')}]') AS distance
      FROM "ReferenceEmbedding" re
      JOIN "ReferenceChunk" rc ON re."referenceChunkId" = rc.id
      JOIN "ReferenceDocument" rd ON rc."referenceDocumentId" = rd.id
      WHERE re.vector IS NOT NULL
      ORDER BY distance ASC
      LIMIT ${limit}
    `);

    console.log('results:', JSON.stringify(results, null, 2));

    return results as SearchSimilarResult[];
  }
}
