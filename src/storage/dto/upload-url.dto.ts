import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UploadUrlDto {
  @ApiProperty({
    description: 'Type MIME du fichier',
    example: 'application/pdf',
  })
  @IsNotEmpty()
  @IsString()
  contentType: string;

  @ApiProperty({
    description: 'ID du projet auquel le fichier est associé',
    example: '01234567890123456789012345678901',
  })
  @IsNotEmpty()
  @IsString()
  projectId: string;

  @ApiProperty({
    description: 'FileName',
    example: 'file.pdf',
  })
  @IsNotEmpty()
  @IsString()
  fileName: string;
}
