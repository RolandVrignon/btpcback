import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateApiDto {
  @ApiProperty({
    description: "L'ID de l'organisation à laquelle l'API appartient",
    example: '01234567890123456789012345678901',
  })
  @IsString()
  @IsNotEmpty()
  organizationId: string;
}
