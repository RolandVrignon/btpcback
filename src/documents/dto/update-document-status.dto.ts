import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { Status } from '@prisma/client';

export class UpdateStatusDto {
  @ApiProperty({
    description: 'Le nouveau statut du document',
    enum: Status,
    example: Status.COMPLETED,
    required: true,
  })
  @IsEnum(Status)
  @IsNotEmpty()
  status: Status;
}
