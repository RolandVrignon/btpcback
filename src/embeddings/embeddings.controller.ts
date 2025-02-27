import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { EmbeddingsService } from './embeddings.service';
import { CreateEmbeddingDto } from './dto/create-embedding.dto';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  ArrayMinSize,
  IsNumber,
  IsOptional,
  IsString,
  IsNotEmpty,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// Créer un DTO pour la recherche vectorielle
class VectorSearchDto {
  @ApiProperty({
    description: 'Le vecteur de recherche',
    example: [0.1, 0.2, 0.3, 0.4, 0.5],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  @Type(() => Number)
  vector: number[];

  @ApiProperty({
    description: 'Nom du modèle à utiliser pour la recherche',
    example: 'text-embedding-3-small',
  })
  @IsString()
  @IsNotEmpty()
  modelName: string;

  @ApiProperty({
    description: 'Version du modèle',
    example: 'v1',
  })
  @IsString()
  @IsNotEmpty()
  modelVersion: string;

  @ApiProperty({
    description: 'Nombre maximum de résultats à retourner',
    example: 10,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @ApiProperty({
    description: 'Seuil de distance maximale (optionnel)',
    example: 0.3,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  threshold?: number;
}

// DTO pour la recherche hybride
class HybridSearchDto extends VectorSearchDto {
  @ApiProperty({
    description: 'Requête textuelle pour la recherche hybride',
    example: 'isolation thermique',
  })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiProperty({
    description: 'Poids de la recherche vectorielle (0-1)',
    example: 0.7,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  vectorWeight?: number;
}

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

  @Post('search')
  @ApiOperation({
    summary: 'Rechercher des embeddings similaires',
    description: 'Recherche les chunks les plus similaires à un vecteur donné en utilisant la distance euclidienne'
  })
  @ApiResponse({
    status: 200,
    description: 'Résultats de la recherche vectorielle.'
  })
  searchSimilar(@Body() searchDto: VectorSearchDto) {
    return this.embeddingsService.searchSimilar(
      searchDto.vector,
      searchDto.modelName,
      searchDto.modelVersion,
      searchDto.limit,
      searchDto.threshold,
    );
  }

  @Post('search/dot-product')
  @ApiOperation({
    summary: 'Rechercher des embeddings similaires avec le produit scalaire',
    description: 'Recherche les chunks les plus similaires à un vecteur donné en utilisant le produit scalaire (dot product)'
  })
  @ApiResponse({
    status: 200,
    description: 'Résultats de la recherche vectorielle par produit scalaire.'
  })
  searchSimilarDotProduct(@Body() searchDto: VectorSearchDto) {
    return this.embeddingsService.searchSimilarDotProduct(
      searchDto.vector,
      searchDto.modelName,
      searchDto.modelVersion,
      searchDto.limit,
    );
  }

  @Post('search/hybrid')
  @ApiOperation({
    summary: 'Recherche hybride (vectorielle + full-text)',
    description: 'Combine la recherche vectorielle et la recherche full-text pour des résultats plus pertinents'
  })
  @ApiResponse({
    status: 200,
    description: 'Résultats de la recherche hybride.'
  })
  searchHybrid(@Body() searchDto: HybridSearchDto) {
    return this.embeddingsService.searchHybrid(
      searchDto.vector,
      searchDto.query,
      searchDto.modelName,
      searchDto.modelVersion,
      searchDto.limit,
      searchDto.vectorWeight,
    );
  }

  @Get('by-chunk/:chunkId')
  @ApiOperation({ summary: 'Récupérer les embeddings par chunk' })
  @ApiParam({ name: 'chunkId', description: "L'ID du chunk" })
  @ApiResponse({
    status: 200,
    description: 'Les embeddings associés au chunk.',
  })
  @ApiResponse({ status: 404, description: 'Chunk non trouvé.' })
  findByChunk(@Param('chunkId') chunkId: string) {
    return this.embeddingsService.findByChunk(chunkId);
  }

  @Get('by-model')
  @ApiOperation({ summary: 'Récupérer les embeddings par modèle' })
  @ApiQuery({ name: 'modelName', description: 'Nom du modèle' })
  @ApiQuery({ name: 'modelVersion', description: 'Version du modèle' })
  @ApiResponse({
    status: 200,
    description: 'Les embeddings associés au modèle.',
  })
  findByModel(
    @Query('modelName') modelName: string,
    @Query('modelVersion') modelVersion: string,
  ) {
    return this.embeddingsService.findByModel(modelName, modelVersion);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un embedding' })
  @ApiParam({ name: 'id', description: "L'ID de l'embedding" })
  @ApiResponse({
    status: 200,
    description: 'Embedding supprimé avec succès.',
  })
  @ApiResponse({ status: 404, description: 'Embedding non trouvé.' })
  remove(@Param('id') id: string) {
    return this.embeddingsService.remove(id);
  }
}
