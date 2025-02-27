import { ApiProperty } from '@nestjs/swagger';

class S3Object {
  @ApiProperty({
    description: "Clé de l'objet dans le bucket",
    example: 'projects/123/file.pdf',
  })
  key: string;

  @ApiProperty({
    description: "Taille de l'objet en octets",
    example: 1024,
  })
  size: number;

  @ApiProperty({
    description: "Date de dernière modification de l'objet",
    example: '2023-01-01T00:00:00.000Z',
  })
  lastModified: Date;
}

export class RootObjectsResponseDto {
  @ApiProperty({
    description: 'Liste des objets à la racine du bucket',
    type: [S3Object],
  })
  objects: S3Object[];

  @ApiProperty({
    description: 'Liste des préfixes (dossiers) à la racine du bucket',
    example: ['projects/', 'uploads/'],
  })
  prefixes: string[];
}
