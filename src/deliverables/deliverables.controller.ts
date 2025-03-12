import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { DeliverablesService } from './deliverables.service';
import { CreateDeliverableDto } from './dto/create-deliverable.dto';
import { DeliverableEntity } from './entities/deliverable.entity';

@ApiTags('Livrables')
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
  create(@Body() createDeliverableDto: CreateDeliverableDto) {
    return this.deliverablesService.create(createDeliverableDto);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: "Récupérer tous les livrables d'un projet" })
  @ApiParam({ name: 'projectId', description: 'ID du projet' })
  @ApiResponse({
    status: 200,
    description: 'Liste des livrables du projet.',
    type: [DeliverableEntity],
  })
  findAll(@Param('projectId') projectId: string) {
    return this.deliverablesService.findAll(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un livrable par son ID' })
  @ApiParam({ name: 'id', description: 'ID du livrable' })
  @ApiResponse({
    status: 200,
    description: 'Le livrable a été trouvé.',
    type: DeliverableEntity,
  })
  @ApiResponse({
    status: 404,
    description: 'Livrable non trouvé.',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.deliverablesService.findOne(id);
  }
}
