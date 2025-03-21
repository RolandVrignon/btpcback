import { ApiProperty } from '@nestjs/swagger';

// Interface pour un document individuel
export interface DocumentItem {
  type: string;
  lien: string;
}

// Interface pour le résultat contenant la liste des documents
export interface DocumentResult {
  result: DocumentItem[];
}

// Interface pour la réponse complète (tableau de DocumentResult)
export type CityDocumentsResponse = DocumentResult[];

// Classe pour la documentation Swagger
export class DocumentItemDto implements DocumentItem {
  @ApiProperty({
    description: 'Type de document',
    example: 'PLU',
  })
  type: string;

  @ApiProperty({
    description: 'Lien vers le document',
    example: 'https://example.com/document1.pdf',
  })
  lien: string;
}

// Classe pour la documentation Swagger du résultat
export class DocumentResultDto implements DocumentResult {
  @ApiProperty({
    description: 'Liste des documents trouvés',
    type: [DocumentItemDto],
    example: [
      {
        type: 'PLU',
        lien: 'https://example.com/plu.pdf',
      },
      {
        type: 'Carte_bruit',
        lien: 'https://example.com/carte_bruit.pdf',
      },
    ],
  })
  result: DocumentItemDto[];
}

// Classe pour la documentation Swagger de la réponse complète
export class CityDocumentsResponseDto {
  @ApiProperty({
    description: 'Tableau de résultats',
    type: [DocumentResultDto],
    example: [
      {
        result: [
          {
            type: 'PLU',
            lien: 'https://example.com/plu.pdf',
          },
          {
            type: 'Carte_bruit',
            lien: 'https://example.com/carte_bruit.pdf',
          },
        ],
      },
    ],
  })
  output: DocumentResultDto[];
}