import { ApiProperty } from '@nestjs/swagger';

export class DeliverableEntity {
  @ApiProperty({
    description: 'ID unique du livrable',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Type de livrable',
    enum: [
      'WORK_SUMMARY',
      'INDEX_COMPARISON',
      'THERMAL_STUDY_ANALYSIS',
      'DATA_INCONSISTENCY',
    ],
    example: 'WORK_SUMMARY',
  })
  type: 'WORK_SUMMARY';

  @ApiProperty({
    description: 'Statut du livrable',
    enum: ['DRAFT', 'PROGRESS', 'PENDING', 'COMPLETED', 'ERROR'],
    example: 'DRAFT',
  })
  status: 'DRAFT' | 'PROGRESS' | 'PENDING' | 'COMPLETED' | 'ERROR';

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
    description: 'Résultat du traitement du livrable',
    example: {
      summary: 'Résumé du travail effectué...',
      recommendations: ['Recommandation 1', 'Recommandation 2'],
    },
    required: false,
  })
  result?: Record<string, any>;

  @ApiProperty({
    description: "Message d'erreur en cas d'échec",
    example: 'Erreur lors du traitement du document',
    required: false,
  })
  error?: string;

  @ApiProperty({
    description: 'Métadonnées additionnelles du livrable',
    example: {
      totalPages: 42,
      documentCount: 3,
    },
    required: false,
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'IDs des documents associés au livrable',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    type: [String],
    required: false,
  })
  documentIds?: string[];
}
