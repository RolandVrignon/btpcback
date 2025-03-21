import { Controller, Post, Body, ValidationPipe } from '@nestjs/common';
import { ToolsService } from './tools.service';
import { CityDocumentsDto } from './dto/city-documents.dto';
import {
  CityDocumentsResponse,
  CityDocumentsResponseDto,
} from './interfaces/city-documents.interface';
import { PublicDataDto } from './dto/public-data.dto';
import {
  PublicDataResponse,
  PublicDataResponseDto,
} from './interfaces/public-data.interface';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiHeader,
} from '@nestjs/swagger';

@ApiTags('tools')
@ApiHeader({
  name: 'x-api-key',
  description: "Clé API pour l'authentification",
  required: true,
})
@Controller('tools')
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @ApiOperation({
    summary: 'Recherche de documents municipaux',
    description: 'Récupère les documents publics liés à une ville spécifique',
  })
  @ApiBody({
    type: CityDocumentsDto,
    description: 'Paramètres de recherche pour la ville',
  })
  @ApiResponse({
    status: 200,
    description: 'Documents récupérés avec succès',
    type: CityDocumentsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur' })
  @Post('city-documents')
  searchCityDocuments(
    @Body(ValidationPipe) cityDocumentsDto: CityDocumentsDto,
  ): Promise<CityDocumentsResponse> {
    return this.toolsService.getCityDocuments(cityDocumentsDto);
  }

  @ApiOperation({
    summary: 'Recherche de données publiques',
    description:
      'Récupère des données publiques pour une ville et une adresse spécifiques',
  })
  @ApiBody({
    type: PublicDataDto,
    description: 'Paramètres de recherche avec ville et adresse',
  })
  @ApiResponse({
    status: 200,
    description: 'Données publiques récupérées avec succès',
    type: PublicDataResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur' })
  @Post('public-data')
  getPublicData(
    @Body(ValidationPipe) publicDataDto: PublicDataDto,
  ): Promise<PublicDataResponse> {
    return this.toolsService.getPublicData(publicDataDto);
  }
}
