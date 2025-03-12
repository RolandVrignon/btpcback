import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DeliverableType } from '@prisma/client';

export class CreateDeliverableDto {
  @ApiProperty({
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  projectId: string;

  @ApiProperty({
    description: 'Type of deliverable',
    enum: [
      'DESCRIPTIF_SOMMAIRE_DES_TRAVAUX',
      'COMPARATEUR_INDICES',
      'ANALYSE_ETHUDE_THERMIQUE',
      'INCOHERENCE_DE_DONNEES',
    ],
    example: 'DESCRIPTIF_SOMMAIRE_DES_TRAVAUX',
  })
  @IsEnum(DeliverableType)
  type: DeliverableType;

  @ApiProperty({
    description: 'List of document IDs to be used in the deliverable',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  @IsUUID('4', { each: true })
  @IsOptional()
  documentIds: string[];
}
