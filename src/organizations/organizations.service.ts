/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsRepository } from './organizations.repository';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly organizationsRepository: OrganizationsRepository,
  ) {}

  async create(createOrganizationDto: CreateOrganizationDto) {
    return this.organizationsRepository.create(createOrganizationDto);
  }

  async findAll() {
    return this.organizationsRepository.findAll();
  }

  async findOne(id: string) {
    return this.organizationsRepository.findOne(id);
  }

  async update(id: string, updateOrganizationDto: UpdateOrganizationDto) {
    return this.organizationsRepository.update(id, updateOrganizationDto);
  }

  async remove(id: string) {
    return this.organizationsRepository.remove(id);
  }

  /**
   * Vérifie si une organisation existe
   */
  async exists(id: string): Promise<boolean> {
    return this.organizationsRepository.exists(id);
  }
}
