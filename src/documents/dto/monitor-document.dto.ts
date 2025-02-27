import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class MonitorDocumentDto {
  @ApiProperty({
    description: 'ID du document à surveiller',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsString()
  documentId: string;

  @ApiProperty({
    description: 'ID du projet auquel appartient le document',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsNotEmpty()
  @IsString()
  projectId: string;
}
