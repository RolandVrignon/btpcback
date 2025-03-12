import {
  Controller,
  Get,
  Post,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiHeader } from '@nestjs/swagger';
import { DeliverablesService } from './deliverables.service';
import { CreateDeliverableDto } from './dto/create-deliverable.dto';
import { DeliverableEntity } from './entities/deliverable.entity';
import { Organization } from '../decorators/organization.decorator';
import { OrganizationEntity } from '../types';

@ApiTags('Livrables')
@ApiHeader({
  name: 'x-api-key',
  description: "Clé API pour l'authentification",
  required: true,
})
@Controller('deliverables')
export class DeliverablesController {
  constructor(private readonly deliverablesService: DeliverablesService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un nouveau livrable' })
  @ApiResponse({
    status: 201,
    description: 'Le livrable a été créé avec succès.',
    type: DeliverableEntity,
  })
  @ApiResponse({
    status: 400,
    description:
      "Requête invalide - Les documents sont invalides ou n'appartiennent pas au projet.",
  })
  @ApiResponse({ status: 401, description: 'Clé API manquante ou invalide' })
  @ApiResponse({
    status: 403,
    description: "Accès non autorisé au projet",
  })
  create(
    @Body() createDeliverableDto: CreateDeliverableDto,
    @Organization() organization: OrganizationEntity,
  ) {
    return this.deliverablesService.create(createDeliverableDto, organization);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: "Récupérer tous les livrables d'un projet" })
  @ApiParam({ name: 'projectId', description: 'ID du projet' })
  @ApiResponse({
    status: 200,
    description: 'Liste des livrables du projet.',
    type: [DeliverableEntity],
  })
  @ApiResponse({ status: 401, description: 'Clé API manquante ou invalide' })
  @ApiResponse({
    status: 403,
    description: "Accès non autorisé au projet",
  })
  findAll(
    @Param('projectId') projectId: string,
    @Organization() organization: OrganizationEntity,
  ) {
    return this.deliverablesService.findAll(projectId, organization);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un livrable par son ID' })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'ID du livrable',
  })
  @ApiResponse({
    status: 200,
    description: 'Le livrable a été trouvé.',
    type: DeliverableEntity,
  })
  @ApiResponse({ status: 401, description: 'Clé API manquante ou invalide' })
  @ApiResponse({
    status: 403,
    description: "Accès non autorisé au livrable",
  })
  @ApiResponse({
    status: 404,
    description: 'Livrable non trouvé.',
  })
  findOne(
    @Param('id') id: string,
    @Organization() organization: OrganizationEntity,
  ) {
    return this.deliverablesService.findOne(id, organization);
  }
}
