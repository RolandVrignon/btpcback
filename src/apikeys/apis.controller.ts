import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApisService } from './apis.service';
import { CreateApiDto } from './dto/create-api.dto';

@ApiTags('apis')
@Controller('apis')
export class ApisController {
  constructor(private readonly apisService: ApisService) {}

  @Post()
  @ApiOperation({ summary: 'Créer une nouvelle clé API' })
  @ApiResponse({ status: 201, description: 'Clé API créée avec succès.' })
  @ApiResponse({ status: 404, description: 'Organisation non trouvée.' })
  create(@Body() createApiDto: CreateApiDto) {
    return this.apisService.create(createApiDto);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer toutes les clés API' })
  @ApiResponse({
    status: 200,
    description: 'Liste des clés API récupérée avec succès.',
  })
  findAll() {
    return this.apisService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une clé API par son ID' })
  @ApiResponse({ status: 200, description: 'Clé API récupérée avec succès.' })
  @ApiResponse({ status: 404, description: 'Clé API non trouvée.' })
  findOne(@Param('id') id: string) {
    return this.apisService.findOne(+id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une clé API' })
  @ApiResponse({ status: 200, description: 'Clé API supprimée avec succès.' })
  @ApiResponse({ status: 404, description: 'Clé API non trouvée.' })
  remove(@Param('id') id: string) {
    return this.apisService.remove(+id);
  }
}
