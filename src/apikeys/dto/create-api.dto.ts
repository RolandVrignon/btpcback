import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty } from 'class-validator';

export class CreateApiDto {
  @ApiProperty({
    description: "L'ID de l'organisation à laquelle l'API appartient",
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  organizationId: number;
}
