import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Organization } from '../decorators/organization.decorator';

@ApiTags('projects')
@ApiHeader({
  name: 'x-api-key',
  description: "Clé API pour l'authentification",
  required: true,
})
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un nouveau projet' })
  @ApiResponse({ status: 201, description: 'Projet créé avec succès.' })
  @ApiResponse({ status: 404, description: 'Organisation non trouvée.' })
  @ApiResponse({ status: 401, description: 'Clé API manquante ou invalide.' })
  create(
    @Body() createProjectDto: CreateProjectDto,
    @Organization() organization,
  ) {
    // Forcer l'organizationId à celui de l'utilisateur authentifié
    createProjectDto.organizationId = organization.id;
    return this.projectsService.create(createProjectDto);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer tous les projets de votre organisation' })
  @ApiResponse({
    status: 200,
    description: 'Liste des projets récupérée avec succès.',
  })
  @ApiResponse({ status: 401, description: 'Clé API manquante ou invalide.' })
  findAll(@Organization() organization) {
    return this.projectsService.findByOrganization(organization.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un projet par son ID' })
  @ApiResponse({ status: 200, description: 'Projet récupéré avec succès.' })
  @ApiResponse({ status: 404, description: 'Projet non trouvé.' })
  @ApiResponse({ status: 401, description: 'Clé API manquante ou invalide.' })
  @ApiResponse({ status: 403, description: 'Accès non autorisé à ce projet.' })
  findOne(@Param('id') id: string, @Organization() organization) {
    return this.projectsService.findOne(+id, organization.id);
  }

  @Get('organization/:id')
  @ApiOperation({ summary: "Récupérer tous les projets d'une organisation" })
  @ApiResponse({
    status: 200,
    description: 'Liste des projets récupérée avec succès.',
  })
  @ApiResponse({ status: 404, description: 'Organisation non trouvée.' })
  @ApiResponse({ status: 401, description: 'Clé API manquante ou invalide.' })
  @ApiResponse({
    status: 403,
    description: 'Accès non autorisé à cette organisation.',
  })
  findByOrganization(@Param('id') id: string, @Organization() organization) {
    // Vérifier que l'utilisateur demande ses propres projets
    if (+id !== organization.id) {
      return this.projectsService.findByOrganization(organization.id);
    }
    return this.projectsService.findByOrganization(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un projet' })
  @ApiResponse({ status: 200, description: 'Projet mis à jour avec succès.' })
  @ApiResponse({ status: 404, description: 'Projet non trouvé.' })
  @ApiResponse({ status: 401, description: 'Clé API manquante ou invalide.' })
  @ApiResponse({ status: 403, description: 'Accès non autorisé à ce projet.' })
  update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @Organization() organization,
  ) {
    return this.projectsService.update(+id, updateProjectDto, organization.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un projet' })
  @ApiResponse({ status: 200, description: 'Projet supprimé avec succès.' })
  @ApiResponse({ status: 404, description: 'Projet non trouvé.' })
  @ApiResponse({ status: 401, description: 'Clé API manquante ou invalide.' })
  @ApiResponse({ status: 403, description: 'Accès non autorisé à ce projet.' })
  remove(@Param('id') id: string, @Organization() organization) {
    return this.projectsService.remove(+id, organization.id);
  }
}
