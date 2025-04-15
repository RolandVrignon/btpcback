import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  IsInt,
  IsNumber,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateDocumentDto } from '@/documents/dto/create-document.dto';
import { Status } from '@prisma/client';

export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {
  @ApiProperty({
    description: 'Le statut du document',
    enum: Status,
    example: Status.PROGRESS,
    required: false,
  })
  @IsEnum(Status)
  @IsOptional()
  status?: Status;

  @ApiProperty({
    description: "Durée d'extraction de métadonnées du document en secondes",
    example: 15.3,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  extraction_duration_in_seconds?: number;

  @ApiProperty({
    description: "Durée d'indexation du document en secondes",
    example: 123.45,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  indexation_duration_in_seconds?: number;

  @ApiProperty({
    description: 'Titre du document',
    example: 'Plan de masse',
    required: false,
  })
  @IsString()
  @IsOptional()
  ai_titre_document?: string;

  @ApiProperty({
    description: 'Identification du lot',
    example: ['LOT-01', 'LOT-02'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ai_lot_identification?: string[];

  @ApiProperty({
    description: 'Type de bâtiment',
    example: ['Immeuble résidentiel', 'Immeuble commercial'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ai_Type_batiment?: string[];

  @ApiProperty({
    description: "Type d'opération",
    example: 'Rénovation',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ai_Type_operation?: string[];

  @ApiProperty({
    description: 'Type de document',
    example: "Plan d'architecte",
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ai_Type_document?: string[];

  @ApiProperty({
    description: 'Phase du projet',
    example: ['DCE'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ai_Phase_projet?: string[];

  @ApiProperty({
    description: 'Version du document',
    example: 'V1.2',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ai_Version_document?: string[];

  @ApiProperty({
    description: 'Adresse du projet',
    example: '123 rue de la Construction',
    required: false,
  })
  @IsString()
  @IsOptional()
  ai_Adresse_projet?: string;

  @ApiProperty({
    description: 'Ville du projet',
    example: 'Paris',
    required: false,
  })
  @IsString()
  @IsOptional()
  ai_Ville_projet?: string;

  @ApiProperty({
    description: 'Rue du projet',
    example: 'Rue de la Construction',
    required: false,
  })
  @IsString()
  @IsOptional()
  ai_Rue_projet?: string;

  @ApiProperty({
    description: 'Code postal du projet',
    example: '75001',
    required: false,
  })
  @IsString()
  @IsOptional()
  ai_CP_projet?: string;

  @ApiProperty({
    description: "Maître d'ouvrage",
    example: ['Société Immobilière XYZ', 'Groupe ABC'],
    required: false,
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  ai_Maitre_ouvrage?: string[];

  @ApiProperty({
    description: 'Architectes',
    example: ["Cabinet d'Architecture DEF", 'Studio GHI'],
    required: false,
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  ai_Architecte?: string[];

  @ApiProperty({
    description: 'Autres sociétés impliquées',
    example: ["Bureau d'études JKL", 'Entreprise MNO'],
    required: false,
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  ai_Autres_societes?: string[];

  @ApiProperty({
    description: 'Société éditrice du document',
    example: ["Cabinet d'Architecture DEF", "Bureau d'études JKL"],
    required: false,
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  ai_societe_editrice_document?: string[];

  @ApiProperty({
    description: 'Métadonnées AI au format JSON',
    example: {
      Titre: "Plan d'exécution",
      Date: '2023-05-15',
      Échelle: '1:100',
    },
    required: false,
  })
  @IsObject()
  @IsOptional()
  ai_metadata?: Record<string, unknown>;

  @ApiProperty({
    description: 'Auteur du document (métadonnée)',
    example: 'Jean Dupont',
    required: false,
  })
  @IsString()
  @IsOptional()
  metadata_author?: string;

  @ApiProperty({
    description: 'Nombre de pages du document',
    example: 42,
    required: false,
  })
  @IsInt()
  @IsOptional()
  metadata_numPages?: number;
}
