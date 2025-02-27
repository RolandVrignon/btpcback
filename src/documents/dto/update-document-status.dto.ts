import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { DocumentStatus } from '@prisma/client';

export class UpdateDocumentStatusDto {
  @ApiProperty({
    description: 'Le nouveau statut du document',
    enum: DocumentStatus,
    example: 'INDEXING',
    required: true,
  })
  @IsEnum(DocumentStatus)
  @IsNotEmpty()
  status: DocumentStatus;
}
