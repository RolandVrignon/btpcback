import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { Status } from '@prisma/client';

export class UpdateStatusDto {
  @ApiProperty({
    description: 'Le nouveau statut du document',
    enum: ['DRAFT', 'PROGRESS', 'PENDING', 'COMPLETED', 'ERROR'],
    example: 'INDEXING',
    required: true,
  })
  @IsEnum(Status)
  @IsNotEmpty()
  status: Status;
}
