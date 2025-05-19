import { ApiProperty } from '@nestjs/swagger';

export class SearchResultDto {
  @ApiProperty({
    description: 'ID du chunk trouvé',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  id: string;

  @ApiProperty({
    description: 'ID du document contenant le chunk',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  documentId: string;

  @ApiProperty({
    description: 'Titre du document contenant le chunk',
    example: 'DTU 65.11',
  })
  documentTitle: string;

  @ApiProperty({
    description: 'Texte du chunk',
    example:
      'Les bâtiments écologiques utilisent des matériaux durables et des systèmes énergétiques efficaces pour réduire leur impact environnemental.',
  })
  text: string;

  @ApiProperty({
    description: 'Score de similarité (entre 0 et 1)',
    example: 0.89,
  })
  score: number;

  @ApiProperty({
    description: 'Numéro de page du chunk dans le document',
    example: 5,
  })
  page: number;
}

export class SearchResponseDto {
  @ApiProperty({
    description: 'Résultats de la recherche',
    type: [SearchResultDto],
  })
  results: SearchResultDto[];

  @ApiProperty({
    description: "Temps d'exécution de la recherche en millisecondes",
    example: 125,
  })
  executionTimeMs: number;

  @ApiProperty({
    description: 'Type de recherche effectuée',
    example: 'vector',
    enum: ['vector', 'semantic', 'hybrid'],
  })
  searchType: 'vector' | 'semantic' | 'hybrid';
}
