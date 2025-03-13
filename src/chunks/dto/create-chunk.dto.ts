import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateChunkDto {
  @ApiProperty({
    description: 'Le texte du chunk',
    example: 'Ceci est un extrait de texte du document...',
  })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({
    description: 'La page du document (optionnel)',
    example: 5,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiProperty({
    description: "L'ordre du chunk",
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  order?: number;

  @ApiProperty({
    description: "L'ID du document auquel le chunk est associé",
    example: '01234567890123456789012345678901',
  })
  @IsString()
  @IsNotEmpty()
  documentId: string;
}
