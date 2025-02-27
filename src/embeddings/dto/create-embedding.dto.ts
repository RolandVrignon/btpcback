import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsNotEmpty,
  IsString,
  ArrayMinSize,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEmbeddingDto {
  @ApiProperty({
    description: "Le vecteur d'embedding (tableau de floats)",
    example: [0.1, 0.2, 0.3, 0.4, 0.5],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({ allowInfinity: false, allowNaN: false }, { each: true })
  @Type(() => Number)
  vector: number[];

  @ApiProperty({
    description: "Nom du modèle utilisé pour générer l'embedding",
    example: 'openai/text-embedding-ada-002',
  })
  @IsString()
  @IsNotEmpty()
  modelName: string;

  @ApiProperty({
    description: 'Version du modèle',
    example: 'v1',
  })
  @IsString()
  @IsNotEmpty()
  modelVersion: string;

  @ApiProperty({
    description: 'Nombre de dimensions du vecteur',
    example: 1536,
  })
  @IsNumber()
  @Min(1)
  dimensions: number;

  @ApiProperty({
    description: "L'ID du chunk auquel l'embedding est associé",
    example: '01234567890123456789012345678901',
  })
  @IsString()
  @IsNotEmpty()
  chunkId: string;

  @ApiProperty({
    description: "Nombre de Tokens utilisés pour générer l'embedding",
    example: 10,
  })
  @IsNumber()
  @Min(0)
  usage: number;
}
