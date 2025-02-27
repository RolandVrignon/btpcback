import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsNotEmpty } from 'class-validator';

export class CreateDocumentDto {
  @ApiProperty({
    description: 'Le nom du fichier',
    example: 'rapport.pdf',
  })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({
    description: 'Le chemin du fichier sur le serveur',
    example: '/uploads/rapport.pdf',
  })
  @IsString()
  @IsNotEmpty()
  path: string;

  @ApiProperty({
    description: 'Le type MIME du fichier',
    example: 'application/pdf',
  })
  @IsString()
  @IsNotEmpty()
  mimetype: string;

  @ApiProperty({
    description: 'La taille du fichier en octets',
    example: 1024,
  })
  @IsNumber()
  @IsNotEmpty()
  size: number;

  @ApiProperty({
    description: "L'ID du projet auquel le document appartient",
    example: '01234567890123456789012345678901',
  })
  @IsString()
  @IsNotEmpty()
  projectId: string;
}
