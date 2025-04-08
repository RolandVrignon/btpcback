import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
} from 'class-validator';
import { Status, ProjectTag } from './create-project.dto';
import { DeliverableType } from '@prisma/client';

export class UpdateProjectDto {
  @ApiProperty({
    description: 'Le nom du projet',
    example: 'Mon Super Projet',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Le résumé court du projet',
    example: 'Résumé court du projet',
    required: false,
  })
  @IsString()
  @IsOptional()
  short_summary?: string;

  @ApiProperty({
    description: 'Le résumé long du projet',
    example: 'Résumé long du projet',
    required: false,
  })
  @IsString()
  @IsOptional()
  long_summary?: string;

  @ApiProperty({
    description: "L'ID Salesforce du projet",
    example: 'SF123456',
    required: false,
  })
  @IsString()
  @IsOptional()
  salesforce_id?: string;

  @ApiProperty({
    description: "L'adresse générée par IA",
    example: "123 rue de l'Innovation, 75001 Paris",
    required: false,
  })
  @IsString()
  @IsOptional()
  ai_address?: string;

  @ApiProperty({
    description: 'La ville générée par IA',
    example: 'Paris',
    required: false,
  })
  @IsString()
  @IsOptional()
  ai_city?: string;

  @ApiProperty({
    description: 'Le code postal généré par IA',
    example: '75001',
    required: false,
  })
  @IsString()
  @IsOptional()
  ai_zip_code?: string;

  @ApiProperty({
    description: 'Le pays généré par IA',
    example: 'France',
    required: false,
  })
  @IsString()
  @IsOptional()
  ai_country?: string;

  @ApiProperty({
    description: "L'adresse formatée la plus proche trouvée.",
    example: "123 rue de l'Innovation, 75001 Paris",
    required: false,
  })
  @IsString()
  @IsOptional()
  closest_formatted_address?: string;

  @ApiProperty({
    description: 'La latitude du projet',
    example: '48.8566',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiProperty({
    description: 'La longitude du projet',
    example: '2.3522',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiProperty({
    description: 'Le statut du projet',
    enum: Status,
    required: false,
  })
  @IsEnum(Status)
  @IsOptional()
  status?: Status;

  @ApiProperty({
    description: 'Les tags du projet',
    enum: ProjectTag,
    isArray: true,
    example: [ProjectTag.RESIDENTIAL, ProjectTag.RENOVATION],
    required: false,
  })
  @IsEnum(ProjectTag, { each: true })
  @IsArray()
  @IsOptional()
  tags?: ProjectTag[];
}
