import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChunkDto } from './dto/create-chunk.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ChunksService {
  constructor(private prisma: PrismaService) {}

  async create(createChunkDto: CreateChunkDto) {
    // Vérifier si le document existe
    const document = await this.prisma.document.findUnique({
      where: { id: createChunkDto.documentId },
    });

    if (!document) {
      throw new NotFoundException('Document non trouvé');
    }

    return await this.prisma.chunk.create({
      data: createChunkDto,
      include: {
        document: true,
      },
    });
  }

  async createMany(createChunkDtos: CreateChunkDto[]) {
    // Vérifier si tous les documents existent
    const documentIds = [...new Set(createChunkDtos.map(dto => dto.documentId))];
    const documents = await this.prisma.document.findMany({
      where: { id: { in: documentIds } },
    });

    if (documents.length !== documentIds.length) {
      throw new NotFoundException('Un ou plusieurs documents non trouvés');
    }

    // Créer les chunks en batch
    const createdChunks = await this.prisma.$transaction(
      createChunkDtos.map(dto =>
        this.prisma.chunk.create({
          data: dto,
        })
      )
    );

    return createdChunks;
  }

  async findAll() {
    return await this.prisma.chunk.findMany({
      include: {
        document: true,
        embeddings: true,
      },
    });
  }

  async findOne(id: number) {
    const chunk = await this.prisma.chunk.findUnique({
      where: { id },
      include: {
        document: true,
        embeddings: true,
      },
    });

    if (!chunk) {
      throw new NotFoundException('Chunk non trouvé');
    }

    return chunk;
  }

  async findByDocument(documentId: number) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document non trouvé');
    }

    return await this.prisma.chunk.findMany({
      where: { documentId },
      include: {
        embeddings: true,
      },
    });
  }

  async searchFullText(query: string, limit: number = 10) {
    // Exécuter une requête SQL brute pour la recherche full-text
    const results = await this.prisma.$queryRaw`
      SELECT c.id, c.text, c.page, c."documentId",
             ts_rank(to_tsvector('french', c.text), plainto_tsquery('french', ${query})) AS rank
      FROM "Chunk" c
      WHERE to_tsvector('french', c.text) @@ plainto_tsquery('french', ${query})
      ORDER BY rank DESC
      LIMIT ${limit}
    `;

    return results;
  }

  async remove(id: number) {
    try {
      return await this.prisma.chunk.delete({
        where: { id },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Chunk non trouvé');
      }
      throw error;
    }
  }
}