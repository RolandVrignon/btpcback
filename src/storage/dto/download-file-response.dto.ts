import { ApiProperty } from '@nestjs/swagger';

export class DownloadFileResponseDto {
  @ApiProperty({
    description: 'URL présignée pour télécharger le fichier',
    example:
      'https://bucket-name.s3.region.amazonaws.com/path/to/file?X-Amz-Algorithm=...',
  })
  url: string;

  @ApiProperty({
    description: "Durée de validité de l'URL en secondes",
    example: 3600,
  })
  expiresIn: number;

  @ApiProperty({
    description: 'Clé du fichier dans le bucket S3',
    example: 'projects/1/1623456789-abc123def456.pdf',
  })
  key: string;
}
