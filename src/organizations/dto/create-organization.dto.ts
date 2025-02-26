import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export enum OrganizationScope {
  ADMIN = 'ADMIN',
  REGULAR = 'REGULAR',
}

export class CreateOrganizationDto {
  @ApiProperty({
    description: "Le nom de l'organisation",
    example: 'Ma Super Organisation',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: "Le niveau d'accès de l'organisation",
    enum: OrganizationScope,
    default: OrganizationScope.REGULAR,
    required: false,
  })
  @IsEnum(OrganizationScope)
  @IsOptional()
  scope?: OrganizationScope;
}
