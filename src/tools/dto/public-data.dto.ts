import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PublicDataDto {
  @ApiProperty({
    description: 'City name',
    example: 'Paris',
    required: true,
  })
  @IsString()
  city: string;

  @ApiProperty({
    description: 'Address',
    example: '12 rue de la Paix',
    required: true,
  })
  @IsString()
  address: string;

  @ApiPropertyOptional({
    description: 'Country where the city is located',
    example: 'France',
    default: 'France',
  })
  @IsOptional()
  @IsString()
  country?: string;
}
