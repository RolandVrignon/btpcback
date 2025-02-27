import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@ApiTags('organizations')
@ApiHeader({
  name: 'x-api-key',
  description: "Clé API pour l'authentification",
  required: true,
})
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer une nouvelle organisation' })
  @ApiResponse({ status: 201, description: 'Organisation créée avec succès.' })
  @ApiResponse({
    status: 409,
    description: 'Une organisation avec ce nom existe déjà.',
  })
  @ApiResponse({ status: 401, description: 'Clé API manquante ou invalide.' })
  @ApiResponse({
    status: 403,
    description: 'Accès réservé aux administrateurs.',
  })
  create(@Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationsService.create(createOrganizationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer toutes les organisations' })
  @ApiResponse({
    status: 200,
    description: 'Liste des organisations récupérée avec succès.',
  })
  @ApiResponse({ status: 401, description: 'Clé API manquante ou invalide.' })
  @ApiResponse({
    status: 403,
    description: 'Accès réservé aux administrateurs.',
  })
  findAll() {
    return this.organizationsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une organisation par son ID' })
  @ApiResponse({
    status: 200,
    description: 'Organisation récupérée avec succès.',
  })
  @ApiResponse({ status: 404, description: 'Organisation non trouvée.' })
  @ApiResponse({ status: 401, description: 'Clé API manquante ou invalide.' })
  @ApiResponse({
    status: 403,
    description: 'Accès réservé aux administrateurs.',
  })
  findOne(@Param('id') id: string) {
    return this.organizationsService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une organisation' })
  @ApiResponse({
    status: 200,
    description: 'Organisation supprimée avec succès.',
  })
  @ApiResponse({ status: 404, description: 'Organisation non trouvée.' })
  @ApiResponse({ status: 401, description: 'Clé API manquante ou invalide.' })
  @ApiResponse({
    status: 403,
    description: 'Accès réservé aux administrateurs.',
  })
  remove(@Param('id') id: string) {
    return this.organizationsService.remove(id);
  }
}
