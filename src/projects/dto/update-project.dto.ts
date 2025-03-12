import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { Status, ProjectTag } from './create-project.dto';

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
