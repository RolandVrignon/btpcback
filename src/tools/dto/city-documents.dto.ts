import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DocumentType {
  ALL = 'all',
  ADMINISTRATIVE = 'administrative',
  URBAN_PLANNING = 'urban_planning',
  BUDGET = 'budget',
  ENVIRONMENT = 'environment',
  TRANSPORT = 'transport',
  EDUCATION = 'education',
  HEALTH = 'health',
  CULTURE = 'culture',
  SPORT = 'sport',
  OTHER = 'other',
}

export class CityDocumentsDto {
  @ApiProperty({
    description: 'Nom de la ville pour laquelle rechercher des documents',
    example: 'Paris',
    required: true,
  })
  @IsString()
  city: string;

  @ApiPropertyOptional({
    description: 'Code postal de la ville',
    example: '75001',
  })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({
    description: 'Pays où se trouve la ville',
    example: 'France',
    default: 'France',
  })
  @IsOptional()
  @IsString()
  country?: string;
}
