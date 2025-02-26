import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { ApikeysService } from './apikeys.service';
import { CreateApikeyDto } from './dto/create-apikey.dto';
import { Organization } from '../decorators/organization.decorator';

@ApiTags('apikeys')
@ApiHeader({
  name: 'x-api-key',
  description: "Clé API pour l'authentification",
  required: true,
})
@Controller('apikeys')
export class ApikeysController {
  constructor(private readonly apikeysService: ApikeysService) {}

  @Post()
  @ApiOperation({ summary: 'Créer une nouvelle clé API' })
  @ApiResponse({ status: 201, description: 'Clé API créée avec succès.' })
  @ApiResponse({ status: 404, description: 'Organisation non trouvée.' })
  @ApiResponse({ status: 401, description: 'Clé API manquante ou invalide.' })
  @ApiResponse({
    status: 403,
    description: 'Accès réservé aux administrateurs.',
  })
  create(@Body() createApikeyDto: CreateApikeyDto) {
    return this.apikeysService.create(createApikeyDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Récupérer toutes les clés API de votre organisation',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des clés API récupérée avec succès.',
  })
  @ApiResponse({ status: 401, description: 'Clé API manquante ou invalide.' })
  findAll(@Organization() organization) {
    return this.apikeysService.findByOrganization(organization.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une clé API par son ID' })
  @ApiResponse({ status: 200, description: 'Clé API récupérée avec succès.' })
  @ApiResponse({ status: 404, description: 'Clé API non trouvée.' })
  @ApiResponse({ status: 401, description: 'Clé API manquante ou invalide.' })
  @ApiResponse({
    status: 403,
    description: 'Accès non autorisé à cette clé API.',
  })
  findOne(@Param('id') id: string, @Organization() organization) {
    return this.apikeysService.findOne(+id, organization.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une clé API' })
  @ApiResponse({ status: 200, description: 'Clé API supprimée avec succès.' })
  @ApiResponse({ status: 404, description: 'Clé API non trouvée.' })
  @ApiResponse({ status: 401, description: 'Clé API manquante ou invalide.' })
  @ApiResponse({
    status: 403,
    description: 'Accès réservé aux administrateurs.',
  })
  remove(@Param('id') id: string) {
    return this.apikeysService.remove(+id);
  }
}
