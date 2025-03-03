import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class SearchRequestDto {
  @ApiProperty({
    description: 'Texte de la requête de recherche',
    example: 'Comment construire un bâtiment écologique?',
  })
  @IsNotEmpty()
  @IsString()
  query: string;

  @ApiProperty({
    description: 'ID du projet dans lequel effectuer la recherche',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiProperty({
    description: 'ID du document dans lequel effectuer la recherche',
    example: '123e4567-e89b-12d3-a456-426614174001',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  documentId?: string;

  @ApiProperty({
    description: 'Nombre maximum de résultats à retourner',
    example: 10,
    default: 5,
    required: false,
  })
  @IsOptional()
  limit?: number = 5;
}
