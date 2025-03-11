import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray, IsUUID } from 'class-validator';

export enum ProjectStatus {
  DRAFT = 'DRAFT',
  PROGRESS = 'PROGRESS',
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export enum ProjectTag {
  RESIDENTIAL = 'RESIDENTIAL',
  COMMERCIAL = 'COMMERCIAL',
  INDUSTRIAL = 'INDUSTRIAL',
  RENOVATION = 'RENOVATION',
  NEW_CONSTRUCTION = 'NEW_CONSTRUCTION',
  URGENT = 'URGENT',
  ECO_FRIENDLY = 'ECO_FRIENDLY',
  HISTORIC = 'HISTORIC',
}

export class CreateProjectDto {
  @ApiProperty({
    description: 'Le nom du projet',
    example: 'Mon Super Projet',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: "L'ID Salesforce du projet",
    example: 'SF123456',
    required: false,
  })
  @IsString()
  @IsOptional()
  salesforce_id?: string;

  @ApiProperty({
    description: 'Les tags du projet',
    enum: ProjectTag,
    isArray: true,
    example: [ProjectTag.RESIDENTIAL, ProjectTag.RENOVATION],
    required: false,
  })
  @IsEnum(ProjectTag, { each: true })
  @IsArray()
  @IsOptional()
  tags?: ProjectTag[];

  @ApiProperty({
    description:
      "L'ID de l'organisation à laquelle appartient le projet (automatiquement déterminé par l'API key)",
    example: '01234567890123456789012345678901',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  organizationId?: string;
}
