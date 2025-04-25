import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsNotEmpty } from 'class-validator';

export class UpdateAddressDto {
  @ApiProperty({
    description: "L'adresse formatée la plus proche trouvée.",
    example: "123 rue de l'Innovation, 75001 Paris",
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  closest_formatted_address: string;

  @ApiProperty({
    description: 'La latitude du projet',
    example: 48.8566,
    required: true,
  })
  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @ApiProperty({
    description: 'La longitude du projet',
    example: 2.3522,
    required: true,
  })
  @IsNumber()
  @IsNotEmpty()
  longitude: number;

  @ApiProperty({
    description: "L'altitude du projet",
    example: 100,
    required: true,
  })
  @IsNumber()
  @IsNotEmpty()
  altitude: number;

  @ApiProperty({
    description: 'La ville du projet',
    example: 'Paris',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  ai_city: string;

  @ApiProperty({
    description: 'Le code postal du projet',
    example: '75001',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  ai_zip_code: string;

  @ApiProperty({
    description: 'Le pays du projet',
    example: 'France',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  ai_country: string;
}
