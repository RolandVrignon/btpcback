import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChunkDto } from './dto/create-chunk.dto';
import { UpdateChunkDto } from './dto/update-chunk.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ChunksRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * Crée un nouveau chunk
   */
  async create(createChunkDto: CreateChunkDto) {
    return await this.prisma.chunk.create({
      data: createChunkDto,
      include: {
        document: true,
      },
    });
  }

  /**
   * Crée plusieurs chunks en une seule opération
   */
  async createMany(createChunkDtos: CreateChunkDto[]) {
    const createdChunks: Array<{ id: string; text: string }> = [];

    // Créer les chunks un par un pour pouvoir récupérer leurs IDs
    for (const dto of createChunkDtos) {
      const chunk = await this.prisma.chunk.create({
        data: dto,
        select: {
          id: true,
          text: true,
        },
      });
      createdChunks.push(chunk);
    }

    return createdChunks;
  }

  /**
   * Récupère tous les chunks
   */
  async findAll() {
    return await this.prisma.chunk.findMany({
      include: {
        document: true,
      },
    });
  }

  /**
   * Récupère un chunk par son ID
   */
  async findOne(id: string) {
    const chunk = await this.prisma.chunk.findUnique({
      where: { id },
      include: {
        document: true,
      },
    });

    if (!chunk) {
      throw new NotFoundException(`Chunk avec l'ID ${id} non trouvé`);
    }

    return chunk;
  }

  /**
   * Récupère tous les chunks d'un document
   */
  async findByDocument(documentId: string) {
    return await this.prisma.chunk.findMany({
      where: { documentId },
      include: {
        document: true,
      },
    });
  }

  /**
   * Recherche des chunks selon des critères spécifiques
   */
  async findMany(params: {
    where?: Prisma.ChunkWhereInput;
    take?: number;
    skip?: number;
    orderBy?: Prisma.ChunkOrderByWithRelationInput;
    include?: Prisma.ChunkInclude;
  }) {
    const { where, take, skip, orderBy, include } = params;
    return await this.prisma.chunk.findMany({
      where,
      take,
      skip,
      orderBy,
      include,
    });
  }

  /**
   * Met à jour un chunk
   */
  async update(id: string, updateChunkDto: UpdateChunkDto) {
    try {
      return await this.prisma.chunk.update({
        where: { id },
        data: updateChunkDto,
        include: {
          document: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Chunk avec l'ID ${id} non trouvé`);
      }
      throw error;
    }
  }

  /**
   * Supprime un chunk
   */
  async remove(id: string) {
    try {
      return await this.prisma.chunk.delete({
        where: { id },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Chunk avec l'ID ${id} non trouvé`);
      }
      throw error;
    }
  }
}
