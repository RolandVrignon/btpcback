import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class IframeDto {
  @ApiProperty({
    description: 'Clé API pour authentifier la requête',
    example: 'sk-12345',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  apiKey: string;

  @ApiProperty({
    description: 'ID du projet concerné',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    required: true,
  })
  @IsNotEmpty()
  @IsUUID()
  projectId: string;

  @ApiProperty({
    description: "Message envoyé par l'utilisateur",
    example: 'Montre-moi le résumé du projet',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  message: string;
}
