import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetDocumentMetadataDto {
  @ApiProperty({
    description: 'ID du projet auquel appartient le document',
    example: '01234567890123456789012345678901',
  })
  @IsNotEmpty()
  @IsString()
  projectId: string;

  @ApiProperty({
    description: 'Nom du fichier du document',
    example: 'document.pdf',
  })
  @IsNotEmpty()
  @IsString()
  fileName: string;
}