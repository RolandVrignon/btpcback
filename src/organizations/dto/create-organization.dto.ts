import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({
    description: "Le nom de l'organisation",
    example: 'Ma Super Organisation',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}
