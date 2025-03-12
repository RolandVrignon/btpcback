import { IsEnum, IsString, IsOptional, IsArray } from 'class-validator';
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
    description: 'Liste des IDs des documents à associer au livrable',
    type: [String],
    example: ['doc-id-1', 'doc-id-2'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentIds?: string[];
}
