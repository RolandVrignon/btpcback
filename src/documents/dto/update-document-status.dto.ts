import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Status } from '@prisma/client';

export class UpdateDocumentStatusDto {
  @ApiProperty({
    description: 'Document ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  @IsUUID()
  @IsNotEmpty()
  documentId: string;

  @ApiProperty({
    description: 'Document status',
    enum: Status,
    example: Status.COMPLETED,
    required: false,
    nullable: true,
  })
  @IsEnum(Status)
  @IsOptional()
  status: Status | null;

  @ApiProperty({
    description: 'Indexation status',
    enum: Status,
    example: Status.PROGRESS,
    required: false,
    nullable: true,
  })
  @IsEnum(Status)
  @IsOptional()
  indexationStatus?: Status | null;

  @ApiProperty({
    description: 'Webhook URL',
    example: 'https://example.com/webhook',
    required: false,
  })
  @IsString()
  @IsOptional()
  webhookUrl?: string;

  @ApiProperty({ description: 'Response code', example: 200, required: false })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({
    description: 'Extraction Status message',
    example: 'Processing started',
    required: false,
  })
  @IsString()
  @IsOptional()
  message_status?: string;

  @ApiProperty({
    description: 'Indexation message',
    example: 'Indexation in progress',
    required: false,
  })
  @IsString()
  @IsOptional()
  message_indexation?: string;
}
