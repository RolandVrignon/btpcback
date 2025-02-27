import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateDocumentDto } from './create-document.dto';

export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {
  @ApiProperty({
    description: 'Le nom du fichier',
    example: 'rapport_mis_a_jour.pdf',
    required: false,
  })
  @IsString()
  @IsOptional()
  filename?: string;

  @ApiProperty({
    description: 'Le chemin du fichier sur le serveur',
    example: '/uploads/rapport_mis_a_jour.pdf',
    required: false,
  })
  @IsString()
  @IsOptional()
  path?: string;

  @ApiProperty({
    description: 'Le type MIME du fichier',
    example: 'application/pdf',
    required: false,
  })
  @IsString()
  @IsOptional()
  mimetype?: string;

  @ApiProperty({
    description: 'La taille du fichier en octets',
    example: 2048,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  size?: number;

  @ApiProperty({
    description: "L'ID du projet auquel le document appartient",
    example: '01234567890123456789012345678901',
    required: false,
  })
  @IsString()
  @IsOptional()
  projectId?: string;
}
