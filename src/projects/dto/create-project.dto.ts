import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
} from 'class-validator';

export enum ProjectStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  COMPLETED = 'COMPLETED',
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
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: "L'ID de l'organisation à laquelle le projet appartient",
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  organizationId: number;

  @ApiProperty({
    description: "L'ID Salesforce du projet",
    example: 'SF123456',
    required: false,
  })
  @IsString()
  @IsOptional()
  salesforce_id?: string;

  @ApiProperty({
    description: 'Le statut du projet',
    enum: ProjectStatus,
    default: ProjectStatus.DRAFT,
  })
  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

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
}
