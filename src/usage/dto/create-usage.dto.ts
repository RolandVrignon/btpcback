import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { UsageType, AI_Provider } from '@prisma/client';

export class CreateUsageDto {
  @ApiProperty({
    description: "Fournisseur de l'IA",
    enum: AI_Provider,
    example: AI_Provider.GEMINI,
  })
  @IsEnum(AI_Provider)
  provider: AI_Provider;

  @ApiProperty({
    description: 'Nom du modèle utilisé',
    example: 'gpt-4',
  })
  @IsString()
  @IsNotEmpty()
  modelName: string;

  @ApiProperty({
    description: 'Nombre de tokens utilisés pour le prompt',
    example: 150,
  })
  @IsInt()
  @Min(0)
  promptTokens: number;

  @ApiProperty({
    description: 'Nombre de tokens utilisés pour la complétion',
    example: 50,
  })
  @IsInt()
  @Min(0)
  completionTokens: number;

  @ApiProperty({
    description: 'Nombre total de tokens utilisés',
    example: 200,
  })
  @IsInt()
  @Min(0)
  totalTokens: number;

  @ApiProperty({
    description: "Type d'utilisation",
    enum: UsageType,
    example: 'TEXT_TO_TEXT',
  })
  @IsEnum(UsageType)
  type: UsageType;

  @ApiProperty({
    description: 'ID du projet associé',
    example: '01234567890123456789012345678901',
  })
  @IsString()
  @IsNotEmpty()
  projectId: string;
}
