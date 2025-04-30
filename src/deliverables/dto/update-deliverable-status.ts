import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { Status } from '@prisma/client';

export class UpdateDeliverableStatusDto {
  @ApiProperty({
    description: 'The ID of the deliverable to update',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsString()
  @IsOptional()
  id?: string;

  //status
  @ApiProperty({
    description: 'The status of the deliverable',
    example: Status.COMPLETED,
  })
  @IsEnum(Status)
  status: Status;

  //code
  @ApiProperty({
    description: 'The code of the deliverable',
    example: 200,
  })
  @IsNumber()
  code: number;

  //message
  @ApiProperty({
    description: 'The message of the deliverable',
    example: 'The deliverable has been updated',
  })
  @IsString()
  message: string;

  //webhookUrl
  @ApiProperty({
    description: 'The webhook URL of the deliverable',
    example: 'https://example.com/deliverable/webhook',
  })
  @IsString()
  webhookUrl: string;
}
