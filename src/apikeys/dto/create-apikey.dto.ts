import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateApikeyDto {
  @ApiProperty({
    description: "L'ID de l'organisation à laquelle la clé API appartient",
    example: '01234567890123456789012345678901',
  })
  @IsString()
  @IsNotEmpty()
  organizationId: string;
}
