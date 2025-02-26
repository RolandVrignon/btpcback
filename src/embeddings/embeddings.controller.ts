import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
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
    example: 'openai/text-embedding-ada-002',
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
}

// Créer un DTO pour la recherche full-text
class TextSearchDto {
  @ApiProperty({
    description: 'Le texte à rechercher',
    example: 'construction écologique',
  })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiProperty({
    description: 'Nombre maximum de résultats à retourner',
    example: 10,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number;
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

  @Get()
  @ApiOperation({ summary: 'Récupérer tous les embeddings' })
  @ApiResponse({
    status: 200,
    description: 'Liste des embeddings récupérée avec succès.',
  })
  findAll() {
    return this.embeddingsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un embedding par son ID' })
  @ApiResponse({ status: 200, description: 'Embedding récupéré avec succès.' })
  @ApiResponse({ status: 404, description: 'Embedding non trouvé.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.embeddingsService.findOne(id);
  }

  @Get('chunk/:id')
  @ApiOperation({ summary: "Récupérer tous les embeddings d'un chunk" })
  @ApiResponse({
    status: 200,
    description: 'Liste des embeddings récupérée avec succès.',
  })
  @ApiResponse({ status: 404, description: 'Chunk non trouvé.' })
  findByChunk(@Param('id', ParseIntPipe) id: number) {
    return this.embeddingsService.findByChunk(id);
  }

  @Get('model/:modelName/:modelVersion')
  @ApiOperation({
    summary: "Récupérer tous les embeddings d'un modèle spécifique",
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des embeddings récupérée avec succès.',
  })
  findByModel(
    @Param('modelName') modelName: string,
    @Param('modelVersion') modelVersion: string,
  ) {
    return this.embeddingsService.findByModel(modelName, modelVersion);
  }

  @Post('search')
  @ApiOperation({ summary: 'Rechercher des embeddings similaires' })
  @ApiResponse({
    status: 200,
    description: 'Résultats de recherche récupérés avec succès.',
  })
  searchSimilar(@Body() searchDto: VectorSearchDto) {
    return this.embeddingsService.searchSimilar(
      searchDto.vector,
      searchDto.modelName,
      searchDto.modelVersion,
      searchDto.limit,
    );
  }

  @Post('search/text')
  @ApiOperation({ summary: 'Rechercher des embeddings par texte' })
  @ApiResponse({
    status: 200,
    description: 'Résultats de recherche récupérés avec succès.',
  })
  searchFullText(@Body() searchDto: TextSearchDto) {
    return this.embeddingsService.searchFullText(
      searchDto.query,
      searchDto.limit,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un embedding' })
  @ApiResponse({ status: 200, description: 'Embedding supprimé avec succès.' })
  @ApiResponse({ status: 404, description: 'Embedding non trouvé.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.embeddingsService.remove(id);
  }
}
