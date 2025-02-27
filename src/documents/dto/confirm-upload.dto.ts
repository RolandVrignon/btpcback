import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ConfirmUploadDto {
  @ApiProperty({
    description: "L'ID du projet auquel le document appartient",
    example: '01234567890123456789012345678901',
  })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({
    description: 'Le nom du fichier sur S3',
    example: 'document.pdf',
  })
  @IsString()
  @IsNotEmpty()
  fileName: string;
}
