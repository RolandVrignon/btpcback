import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EmbeddingsService } from './embeddings.service';
import { CreateEmbeddingDto } from './dto/create-embedding.dto';

@ApiTags('embeddings')
@Controller('embeddings')
export class EmbeddingsController {
  constructor(private readonly embeddingsService: EmbeddingsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un nouvel embedding' })
  @ApiResponse({ status: 201, description: 'Embedding créé avec succès.' })
  @ApiResponse({ status: 404, description: 'Chunk non trouvé.' })
  @ApiResponse({
    status: 409,
    description: 'Un embedding avec ce modèle existe déjà pour ce chunk.',
  })
  create(@Body() createEmbeddingDto: CreateEmbeddingDto) {
    return this.embeddingsService.create(createEmbeddingDto);
  }

  @Post('batch')
  @ApiOperation({ summary: 'Créer plusieurs embeddings en une seule requête' })
  @ApiResponse({ status: 201, description: 'Embeddings créés avec succès.' })
  @ApiResponse({
    status: 404,
    description: 'Un ou plusieurs chunks non trouvés.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Un ou plusieurs embeddings existent déjà pour ces chunks et modèles.',
  })
  createMany(@Body() createEmbeddingDtos: CreateEmbeddingDto[]) {
    return this.embeddingsService.createMany(createEmbeddingDtos);
  }

  // @Get('by-chunk/:chunkId')
  // @ApiOperation({ summary: 'Récupérer les embeddings par chunk' })
  // @ApiParam({ name: 'chunkId', description: "L'ID du chunk" })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Les embeddings associés au chunk.',
  // })
  // @ApiResponse({ status: 404, description: 'Chunk non trouvé.' })
  // findByChunk(@Param('chunkId') chunkId: string) {
  //   return this.embeddingsService.findByChunk(chunkId);
  // }

  // @Get('by-model')
  // @ApiOperation({ summary: 'Récupérer les embeddings par modèle' })
  // @ApiQuery({ name: 'modelName', description: 'Nom du modèle' })
  // @ApiQuery({ name: 'modelVersion', description: 'Version du modèle' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Les embeddings associés au modèle.',
  // })
  // findByModel(
  //   @Query('modelName') modelName: string,
  //   @Query('modelVersion') modelVersion: string,
  // ) {
  //   return this.embeddingsService.findByModel(modelName, modelVersion);
  // }
}
