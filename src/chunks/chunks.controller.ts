import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ChunksService } from './chunks.service';
import { CreateChunkDto } from './dto/create-chunk.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

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

@ApiTags('chunks')
@Controller('chunks')
export class ChunksController {
  constructor(private readonly chunksService: ChunksService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un nouveau chunk' })
  @ApiResponse({ status: 201, description: 'Chunk créé avec succès.' })
  @ApiResponse({ status: 404, description: 'Document non trouvé.' })
  create(@Body() createChunkDto: CreateChunkDto) {
    return this.chunksService.create(createChunkDto);
  }

  @Post('batch')
  @ApiOperation({ summary: 'Créer plusieurs chunks en une seule requête' })
  @ApiResponse({ status: 201, description: 'Chunks créés avec succès.' })
  @ApiResponse({
    status: 404,
    description: 'Un ou plusieurs documents non trouvés.',
  })
  createMany(@Body() createChunkDtos: CreateChunkDto[]) {
    return this.chunksService.createMany(createChunkDtos);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer tous les chunks' })
  @ApiResponse({
    status: 200,
    description: 'Liste des chunks récupérée avec succès.',
  })
  findAll() {
    return this.chunksService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un chunk par son ID' })
  @ApiParam({
    name: 'id',
    description: 'ID du chunk à récupérer',
    example: '01234567890123456789012345678901',
  })
  @ApiResponse({ status: 200, description: 'Chunk récupéré avec succès' })
  @ApiResponse({ status: 404, description: 'Chunk non trouvé' })
  findOne(@Param('id') id: string) {
    return this.chunksService.findOne(id);
  }

  @Get('document/:id')
  @ApiOperation({ summary: "Récupérer tous les chunks d'un document" })
  @ApiParam({
    name: 'id',
    description: 'ID du document',
    example: '01234567890123456789012345678901',
  })
  @ApiResponse({ status: 200, description: 'Chunks récupérés avec succès' })
  @ApiResponse({ status: 404, description: 'Document non trouvé' })
  findByDocument(@Param('id') id: string) {
    return this.chunksService.findByDocument(id);
  }

  @Post('search/text')
  @ApiOperation({ summary: 'Rechercher des chunks par texte' })
  @ApiResponse({
    status: 200,
    description: 'Résultats de recherche récupérés avec succès.',
  })
  searchFullText(@Body() searchDto: TextSearchDto) {
    return this.chunksService.searchFullText(searchDto.query, searchDto.limit);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un chunk' })
  @ApiParam({
    name: 'id',
    description: 'ID du chunk à supprimer',
    example: '01234567890123456789012345678901',
  })
  @ApiResponse({ status: 200, description: 'Chunk supprimé avec succès' })
  @ApiResponse({ status: 404, description: 'Chunk non trouvé' })
  remove(@Param('id') id: string) {
    return this.chunksService.remove(id);
  }
}
