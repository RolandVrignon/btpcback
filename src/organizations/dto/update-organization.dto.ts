import { PartialType } from '@nestjs/mapped-types';
import { CreateOrganizationDto } from '@/organizations/dto/create-organization.dto';

export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {}
