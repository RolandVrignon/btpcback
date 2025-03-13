import { ApiProperty } from '@nestjs/swagger';
import { DeliverableType, Status } from '@prisma/client';
import { JsonValue } from '@prisma/client/runtime/library';

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
    description: 'Résultat court du livrable',
    example: {
      summary: 'Résumé du travail effectué...',
      recommendations: ['Recommandation 1', 'Recommandation 2'],
    },
    required: false,
  })
  short_result?: JsonValue;

  @ApiProperty({
    description: 'Résultat long du livrable',
    example: {
      summary: 'Résumé du travail effectué...',
      recommendations: ['Recommandation 1', 'Recommandation 2'],
    },
  })
  long_result?: JsonValue;

  @ApiProperty({
    description: "Message d'erreur en cas d'échec",
    example: 'Erreur lors du traitement du document',
    required: false,
  })
  error?: string;
}
