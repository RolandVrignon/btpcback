import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Status } from '@prisma/client';

export class UpdateDeliverableDto {
  @ApiProperty({
    description: 'Status du livrable',
    enum: ['DRAFT', 'PROGRESS', 'PENDING', 'COMPLETED', 'ERROR'],
    required: false,
  })
  @IsEnum(Status)
  @IsOptional()
  status?: Status;

  @ApiProperty({
    description: 'Résultat du livrable',
    required: false,
  })
  @IsOptional()
  result?: any;

  @ApiProperty({
    description: "Message d'erreur",
    required: false,
  })
  @IsString()
  @IsOptional()
  error?: string;
}
