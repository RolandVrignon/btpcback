import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  ArrayMinSize,
  IsUrl,
  IsOptional,
} from 'class-validator';

export class ConfirmMultipleUploadsDto {
  @ApiProperty({
    description: "L'ID du projet auquel les documents appartiennent",
    example: '01234567890123456789012345678901',
  })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({
    description: 'Liste des urls des fichiers à télécharger et confirmer',
    type: [String],
    example: [
      'https://example.com/document1.pdf',
      'https://example.com/document2.pdf',
    ],
  })
  @IsUrl({}, { each: true })
  @ArrayMinSize(1)
  downloadUrls: string[];

  @ApiProperty({
    description:
      'Webhook URL pour récupérer les informations de mise à jour du document',
    type: String,
    example: 'https://www.domain.com/api/update-document',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  documentWebhookUrl?: string;

  @ApiProperty({
    description:
      'Webhook URL pour récupérer les informations de mise à jour du projet',
    type: String,
    example: 'https://www.domain.com/api/update-project',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  projectWebhookUrl?: string;
}
