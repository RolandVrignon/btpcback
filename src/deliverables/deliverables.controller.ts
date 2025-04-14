import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiHeader,
  ApiBody,
} from '@nestjs/swagger';
import { DeliverablesService } from '@/deliverables/deliverables.service';
import { CreateDeliverableDto } from '@/deliverables/dto/create-deliverable.dto';
import { DeliverableEntity } from '@/deliverables/entities/deliverable.entity';
import { Organization } from '@/decorators/organization.decorator';
import { OrganizationEntity } from '@/types';
import { UpdateDeliverableDto } from '@/deliverables/dto/update-deliverable.dto';

@ApiTags('deliverables')
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
    description: 'Accès non autorisé au projet',
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
    description: 'Accès non autorisé au projet',
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
    description: 'Accès non autorisé au livrable',
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

  @Patch()
  @ApiOperation({ summary: 'Update a deliverable' })
  @ApiResponse({
    status: 200,
    description: 'The deliverable has been successfully updated',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Invalid API key' })
  @ApiResponse({ status: 404, description: 'Deliverable not found' })
  @ApiBody({ type: UpdateDeliverableDto })
  async updateDeliverable(@Body() updateDeliverableDto: UpdateDeliverableDto) {
    return this.deliverablesService.updateDeliverable(updateDeliverableDto);
  }

  @Post('create-and-wait')
  async findOrCreateAndWaitForDeliverable(
    @Body() createDeliverableDto: CreateDeliverableDto,
    @Organization() organization: OrganizationEntity,
  ) {
    return this.deliverablesService.findOrCreateAndWaitForDeliverable(
      createDeliverableDto,
      organization,
    );
  }
}
