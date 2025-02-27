import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DownloadFileDto {
  @ApiProperty({
    description: 'ID du projet auquel le fichier est associé',
    example: '01234567890123456789012345678901',
  })
  @IsNotEmpty()
  @IsString()
  projectId: string;

  @ApiProperty({
    description: 'Nom du fichier à télécharger',
    example: '1623456789-abc123def456.pdf',
  })
  @IsNotEmpty()
  @IsString()
  fileName: string;
}
