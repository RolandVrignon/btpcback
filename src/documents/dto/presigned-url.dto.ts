import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';

export enum PresignedUrlOperation {
  GET = 'GET',
  PUT = 'PUT',
}

export class PresignedUrlDto {
  @ApiProperty({
    description: 'Le nom du fichier',
    example: 'document.pdf',
  })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({
    description: 'Le type de contenu du fichier',
    example: 'application/pdf',
  })
  @IsString()
  @IsNotEmpty()
  contentType: string;

  @ApiProperty({
    description: "L'ID du projet auquel le document appartient",
    example: '01234567890123456789012345678901',
    required: false,
  })
  @IsString()
  projectId: string | null;

  @ApiProperty({
    description:
      "L'opération à effectuer (GET pour télécharger, PUT pour uploader)",
    enum: PresignedUrlOperation,
    example: PresignedUrlOperation.PUT,
    default: PresignedUrlOperation.PUT,
  })
  @IsEnum(PresignedUrlOperation)
  operation: PresignedUrlOperation;
}
