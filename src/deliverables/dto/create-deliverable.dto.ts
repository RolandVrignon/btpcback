import {
  IsEnum,
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliverableType } from '@prisma/client';

export class CreateDeliverableDto {
  @ApiProperty({
    description: 'ID du projet',
    example: 'd1746c95-2d42-4dea-a961-621e46172be0',
  })
  @IsString()
  projectId: string;

  @ApiProperty({
    description: 'Type de livrable',
    enum: DeliverableType,
    example: 'DESCRIPTIF_SOMMAIRE_DES_TRAVAUX',
  })
  @IsEnum(DeliverableType)
  type: DeliverableType;

  @ApiPropertyOptional({
    description: 'Prompt utilisateur pour affiner la génération du livrable',
    example:
      "J'aimerais que tu focus le livrable plus sur les chiffres et reste agnostique sur les autres informations.",
  })
  @IsString()
  @IsOptional()
  user_prompt?: string;

  @ApiPropertyOptional({
    description:
      'Liste des IDs des documents à associer au livrable. Si vide, on génère un livrable avec tous les documents du projet.',
    type: [String],
    example: ['doc-id-1', 'doc-id-2'],
    default: [],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentIds?: string[];

  @ApiPropertyOptional({
    description: "Permet de sauter la vérification d'existence du livrable",
    type: Boolean,
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  new?: boolean = false;
}
