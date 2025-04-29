import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
} from 'class-validator';
import { Status } from '@prisma/client';

export class UpdateProjectStatusDto {
  @ApiProperty({
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Project status',
    enum: Status,
    example: Status.COMPLETED,
    required: true,
  })
  @IsEnum(Status)
  @IsNotEmpty()
  status: Status;

  @ApiProperty({
    description: 'Optional message',
    example: 'Project processed successfully',
    required: false,
  })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiProperty({
    description: 'Response code',
    example: 200,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  code?: number;

  @ApiProperty({
    description: 'Webhook URL',
    example: 'https://example.com/webhook',
    required: false,
  })
  @IsString()
  @IsOptional()
  webhookUrl?: string;
}
