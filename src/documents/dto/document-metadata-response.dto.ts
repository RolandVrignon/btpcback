import { ApiProperty } from '@nestjs/swagger';

export class DocumentMetadataResponseDto {
  @ApiProperty({
    description: 'Métadonnées AI du document',
    example: [
      {
        key: 'Titre du document',
        value: 'Rapport technique sur la construction durable',
      },
      {
        key: 'Auteur(s)',
        value: 'Jean Dupont',
      },
    ],
  })
  metadata: any;
}
