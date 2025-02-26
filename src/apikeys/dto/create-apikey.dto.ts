import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty } from 'class-validator';

export class CreateApikeyDto {
  @ApiProperty({
    description: "L'ID de l'organisation à laquelle la clé API appartient",
    example: 1
  })
  @IsNumber()
  @IsNotEmpty()
  organizationId: number;
}