import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, ArrayMinSize, IsUrl } from 'class-validator';

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
}
