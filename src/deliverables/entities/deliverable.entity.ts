import { ApiProperty } from '@nestjs/swagger';
import { DeliverableType, Status } from '@prisma/client';
import { JsonValue } from '@prisma/client/runtime/library';
import { IsObject } from 'class-validator';

export class DeliverableEntity {
  @ApiProperty({
    description: 'ID unique du livrable',
    example: 'uuid-example-123',
  })
  id: string;

  @ApiProperty({
    description: 'Type de livrable',
    enum: DeliverableType,
    example: DeliverableType.DESCRIPTIF_SOMMAIRE_DES_TRAVAUX,
  })
  type: DeliverableType;

  @ApiProperty({
    description: 'Statut du livrable',
    enum: Status,
    example: Status.DRAFT,
  })
  status: Status;

  @ApiProperty({
    description: 'ID du projet associé',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  projectId: string;

  @ApiProperty({
    description: 'Date de création du livrable',
    example: '2024-03-14T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date de dernière modification du livrable',
    example: '2024-03-14T12:00:00Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description:
      "Instructions spécifiques de l'utilisateur pour affiner la qualité du délivrable",
    example: 'Focus sur les aspects techniques',
    required: false,
  })
  user_prompt?: string;

  @ApiProperty({
    description: "Force la création d'un nouveau délivrable",
    example: false,
    required: false,
  })
  new?: boolean;

  @ApiProperty({
    description: 'Résultat court du livrable',
    example: {
      result: 'Résumé du travail effectué...',
    },
    required: false,
  })
  @IsObject()
  short_result?: JsonValue;

  @ApiProperty({
    description: 'Résultat long du livrable',
    example: {
      result: 'Résumé du travail effectué...',
    },
  })
  @IsObject()
  long_result?: JsonValue;

  @ApiProperty({
    description: "Message d'erreur en cas d'échec",
    example: 'Erreur lors du traitement du document',
    required: false,
  })
  error?: string;
}
