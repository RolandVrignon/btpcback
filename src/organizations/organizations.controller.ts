import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer une nouvelle organisation' })
  @ApiResponse({ status: 201, description: 'Organisation créée avec succès.' })
  @ApiResponse({ status: 409, description: 'Une organisation avec ce nom existe déjà.' })
  create(@Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationsService.create(createOrganizationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer toutes les organisations' })
  @ApiResponse({ status: 200, description: 'Liste des organisations récupérée avec succès.' })
  findAll() {
    return this.organizationsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une organisation par son ID' })
  @ApiResponse({ status: 200, description: 'Organisation récupérée avec succès.' })
  @ApiResponse({ status: 404, description: 'Organisation non trouvée.' })
  findOne(@Param('id') id: string) {
    return this.organizationsService.findOne(+id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une organisation' })
  @ApiResponse({ status: 200, description: 'Organisation supprimée avec succès.' })
  @ApiResponse({ status: 404, description: 'Organisation non trouvée.' })
  remove(@Param('id') id: string) {
    return this.organizationsService.remove(+id);
  }
}