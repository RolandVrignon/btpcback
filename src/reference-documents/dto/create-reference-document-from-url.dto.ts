import { IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReferenceDocumentFromUrlDto {
  @ApiProperty({ description: 'URL du document à télécharger (PDF, etc.)' })
  @IsString()
  @IsUrl()
  url: string;
}
