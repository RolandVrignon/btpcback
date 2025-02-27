import { ApiProperty } from '@nestjs/swagger';

export class ViewDocumentResponseDto {
  @ApiProperty({
    description: 'URL présignée pour consulter le document',
    example:
      'https://bucket-name.s3.region.amazonaws.com/path/to/file?X-Amz-Algorithm=...',
  })
  url: string;

  @ApiProperty({
    description: "Durée de validité de l'URL en secondes",
    example: 3600,
  })
  expiresIn: number;
}
