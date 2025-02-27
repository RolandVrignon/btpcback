import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { UsageService } from './usage.service';
import { CreateUsageDto } from './dto/create-usage.dto';
import { Organization } from '../decorators/organization.decorator';
import { OrganizationEntity } from '../types';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@ApiTags('usage')
@ApiHeader({
  name: 'x-api-key',
  description: "Clé API pour l'authentification",
  required: true,
})
@Controller('usage')
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: "Enregistrer une nouvelle utilisation d'un modèle" })
  @ApiResponse({
    status: 201,
    description: 'Utilisation enregistrée avec succès',
  })
  @ApiResponse({ status: 404, description: 'Projet non trouvé' })
  @ApiResponse({
    status: 400,
    description: 'Données invalides',
  })
  async create(
    @Body() createUsageDto: CreateUsageDto,
    @Organization() organization: OrganizationEntity,
  ) {
    // Vérifier que le projet appartient à l'organisation
    // Cette vérification est déjà faite dans le service
    return this.usageService.create(createUsageDto);
  }
}
