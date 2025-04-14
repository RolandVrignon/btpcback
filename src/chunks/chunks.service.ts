import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateChunkDto } from '@/chunks/dto/create-chunk.dto';
import { UpdateChunkDto } from '@/chunks/dto/update-chunk.dto';
import { ChunksRepository } from '@/chunks/chunks.repository';

@Injectable()
export class ChunksService {
  constructor(private readonly chunksRepository: ChunksRepository) {}

  async create(createChunkDto: CreateChunkDto) {
    return this.chunksRepository.create(createChunkDto);
  }

  async createMany(createChunkDtos: CreateChunkDto[]) {
    return this.chunksRepository.createMany(createChunkDtos);
  }

  async findAll() {
    return this.chunksRepository.findAll();
  }

  async findOne(id: string) {
    return this.chunksRepository.findOne(id);
  }

  async findByDocument(documentId: string) {
    return this.chunksRepository.findByDocument(documentId);
  }

  async update(id: string, updateChunkDto: UpdateChunkDto) {
    return this.chunksRepository.update(id, updateChunkDto);
  }

  async remove(id: string) {
    return this.chunksRepository.remove(id);
  }

  /**
   * Recherche dans le texte des chunks
   * @param query Texte à rechercher
   * @param limit Nombre maximum de résultats à retourner
   * @returns Les chunks correspondant à la recherche
   */
  async searchFullText(query: string, limit: number = 10) {
    // Déléguer la recherche au repository des embeddings qui contient la logique de recherche
    // Si vous n'avez pas de repository d'embeddings avec cette méthode, vous devrez l'implémenter ici
    // ou dans le repository des chunks
    try {
      // Exemple d'implémentation simple
      return await this.chunksRepository.findMany({
        where: {
          text: {
            contains: query,
            mode: 'insensitive',
          },
        },
        take: limit,
        include: {
          document: true,
        },
      });
    } catch (error: unknown) {
      throw new Error(
        `Erreur lors de la recherche de texte: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Génère des chunks à partir d'un texte
   */
  async generateChunksFromText(
    text: string,
    documentId: string,
    options: {
      chunkSize?: number;
      chunkOverlap?: number;
      separator?: string;
    } = {},
  ) {
    try {
      // Vérifier si le document existe
      // Cette vérification est déjà faite dans le repository lors de la création des chunks

      // Paramètres par défaut
      const chunkSize = options.chunkSize || 1000;
      const chunkOverlap = options.chunkOverlap || 200;
      const separator = options.separator || '\n';

      // Diviser le texte en chunks
      const chunks = this.splitTextIntoChunks(
        text,
        chunkSize,
        chunkOverlap,
        separator,
      );

      // Créer les chunks dans la base de données
      const chunkDtos = chunks.map((chunkText, index) => ({
        text: chunkText,
        documentId,
        page: 1, // Par défaut, page 1 si non spécifié
        order: index,
      }));

      return await this.chunksRepository.createMany(chunkDtos);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(
        `Erreur lors de la génération des chunks: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Divise un texte en chunks avec chevauchement
   */
  private splitTextIntoChunks(
    text: string,
    chunkSize: number,
    chunkOverlap: number,
    separator: string,
  ): string[] {
    // Diviser le texte en segments basés sur le séparateur
    const segments = text.split(separator);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const segment of segments) {
      // Si l'ajout du segment dépasse la taille du chunk
      if (
        currentChunk.length + segment.length + separator.length > chunkSize &&
        currentChunk.length > 0
      ) {
        // Ajouter le chunk actuel à la liste
        chunks.push(currentChunk);

        // Commencer un nouveau chunk avec chevauchement
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(
          Math.max(0, words.length - chunkOverlap / 10),
        );
        currentChunk = overlapWords.join(' ') + separator + segment;
      } else {
        // Ajouter le segment au chunk actuel
        if (currentChunk.length > 0) {
          currentChunk += separator;
        }
        currentChunk += segment;
      }
    }

    // Ajouter le dernier chunk s'il n'est pas vide
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    return chunks;
  }
}
