import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class DownloadFileDto {
  @ApiProperty({
    description: 'ID du projet auquel le fichier est associé',
    example: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  projectId: number;

  @ApiProperty({
    description: 'Nom du fichier à télécharger',
    example: '1623456789-abc123def456.pdf',
  })
  @IsNotEmpty()
  @IsString()
  fileName: string;
}
