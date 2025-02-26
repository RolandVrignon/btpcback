import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class PresignedUrlDto {
  @ApiProperty({
    description: 'Type MIME du fichier',
    example: 'application/pdf',
  })
  @IsNotEmpty()
  @IsString()
  contentType: string;

  @ApiProperty({
    description: 'ID du projet auquel le fichier est associé',
    example: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  projectId: number;
}
