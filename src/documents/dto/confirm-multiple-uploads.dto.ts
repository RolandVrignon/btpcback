import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, ArrayMinSize } from 'class-validator';

export class ConfirmMultipleUploadsDto {
  @ApiProperty({
    description: "L'ID du projet auquel les documents appartiennent",
    example: '01234567890123456789012345678901',
  })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({
    description: 'Liste des noms de fichiers à confirmer',
    type: [String],
    example: ['document1.pdf', 'document2.pdf'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  fileNames: string[];
}
