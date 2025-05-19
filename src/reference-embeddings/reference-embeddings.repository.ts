import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class ReferenceEmbeddingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recherche vectorielle sur ReferenceEmbedding
   */
  async searchSimilar(vector: number[], limit: number = 5) {
    // Requête SQL brute sur le champ vector de ReferenceEmbedding
    const results = await this.prisma.$queryRawUnsafe(`
      SELECT re.id, re."referenceChunkId", rc.text, rc."referenceDocumentId",
        (re.vector <=> '[${vector.join(',')}]') AS distance
      FROM "ReferenceEmbedding" re
      JOIN "ReferenceChunk" rc ON re."referenceChunkId" = rc.id
      WHERE re.vector IS NOT NULL
      ORDER BY distance ASC
      LIMIT ${limit}
    `);

    return results;
  }
}
