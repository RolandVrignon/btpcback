import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsObject,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { DeliverableType, Status } from '@prisma/client';
import { JsonValue } from '@prisma/client/runtime/library';

export class UpdateDeliverableDto {
  @ApiProperty({
    description: 'The ID of the project',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsOptional()
  projectId?: string;

  @ApiProperty({
    description: 'The ID of the deliverable to update',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsString()
  @IsOptional()
  deliverableId?: string;

  @ApiProperty({
    description: 'The type of the deliverable',
    enum: DeliverableType,
    required: false,
  })
  @IsOptional()
  @IsEnum(DeliverableType)
  type?: DeliverableType;

  @ApiProperty({
    description: 'The duration of the deliverable in seconds',
    example: 123.45,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  process_duration_in_seconds?: number;

  @ApiProperty({
    description: 'The status of the deliverable',
    enum: Status,
    example: Status.COMPLETED,
    required: false,
  })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @ApiProperty({
    description: 'The short result of the deliverable',
    required: false,
  })
  @IsOptional()
  @IsObject()
  short_result?: JsonValue;

  @ApiProperty({
    description: 'The long result of the deliverable',
    required: false,
  })
  @IsOptional()
  @IsObject()
  long_result?: JsonValue;
}
