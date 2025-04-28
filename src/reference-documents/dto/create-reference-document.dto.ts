import { IsOptional, IsString, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReferenceDocumentDto {
  @ApiProperty({ description: 'Official title of the reference document' })
  @IsString()
  title: string;

  @ApiProperty({
    description:
      'Application domain of the reference document (e.g. "maçonnerie", "ossature bois")',
  })
  @IsOptional()
  @IsString()
  application_domain?: string;

  @ApiProperty({
    description:
      'Category of the reference document (e.g. "NF DTU", "Eurocode")',
  })
  @IsString()
  category: string;

  @ApiProperty({
    description: 'Official version (e.g. "NF DTU 24.1 P1-1 2020")',
  })
  @IsOptional()
  @IsString()
  official_version?: string;

  @ApiProperty({ description: 'Organization (e.g. "AFNOR")' })
  @IsOptional()
  @IsString()
  organization?: string;

  @ApiProperty({ description: 'Publication date (ISO string)' })
  @IsOptional()
  @IsDateString()
  published_at?: string;

  @ApiProperty({ description: 'Effective date (ISO string)' })
  @IsOptional()
  @IsDateString()
  effective_date?: string;

  @ApiProperty({ description: 'File storage path' })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiProperty({ description: 'MIME type of the file' })
  @IsOptional()
  @IsString()
  mimetype?: string;

  @ApiProperty({ description: 'File size in bytes' })
  @IsOptional()
  @IsNumber()
  size?: number;
}
