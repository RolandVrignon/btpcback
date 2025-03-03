import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchRequestDto, SearchResponseDto } from './dto';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { Organization } from '../decorators/organization.decorator';
import { OrganizationEntity } from '../types';

@ApiTags('search')
@ApiHeader({
  name: 'x-api-key',
  description: "Clé API pour l'authentification",
  required: true,
})
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post('vector')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({
    summary: 'Recherche vectorielle',
    description:
      'Effectue une recherche vectorielle basée sur la similarité des embeddings',
  })
  @ApiResponse({
    status: 200,
    description: 'Résultats de la recherche vectorielle',
    type: SearchResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Paramètres de recherche invalides',
  })
  @ApiResponse({ status: 401, description: 'Clé API manquante ou invalide' })
  @ApiResponse({
    status: 403,
    description: "Accès non autorisé au projet ou à l'organisation",
  })
  async vectorSearch(
    @Body() searchRequestDto: SearchRequestDto,
    @Organization() organization: OrganizationEntity,
  ): Promise<SearchResponseDto> {
    return this.searchService.vectorSearch(searchRequestDto, organization.id);
  }

  @Post('semantic')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({
    summary: 'Recherche sémantique',
    description:
      'Effectue une recherche sémantique basée sur la compréhension du langage naturel',
  })
  @ApiResponse({
    status: 200,
    description: 'Résultats de la recherche sémantique',
    type: SearchResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Paramètres de recherche invalides',
  })
  @ApiResponse({ status: 401, description: 'Clé API manquante ou invalide' })
  @ApiResponse({
    status: 403,
    description: "Accès non autorisé au projet ou à l'organisation",
  })
  async semanticSearch(
    @Body() searchRequestDto: SearchRequestDto,
    @Organization() organization: OrganizationEntity,
  ): Promise<SearchResponseDto> {
    return this.searchService.semanticSearch(searchRequestDto, organization.id);
  }

  @Post('hybrid')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({
    summary: 'Recherche hybride',
    description:
      'Effectue une recherche hybride combinant recherche vectorielle et sémantique',
  })
  @ApiResponse({
    status: 200,
    description: 'Résultats de la recherche hybride',
    type: SearchResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Paramètres de recherche invalides',
  })
  @ApiResponse({ status: 401, description: 'Clé API manquante ou invalide' })
  @ApiResponse({
    status: 403,
    description: "Accès non autorisé au projet ou à l'organisation",
  })
  async hybridSearch(
    @Body() searchRequestDto: SearchRequestDto,
    @Organization() organization: OrganizationEntity,
  ): Promise<SearchResponseDto> {
    return this.searchService.hybridSearch(searchRequestDto, organization.id);
  }
}
