import { Injectable } from '@nestjs/common';
import { CreateApikeyDto } from '@/apikeys/dto/create-apikey.dto';
import { UpdateApikeyDto } from '@/apikeys/dto/update-apikey.dto';
import { ApikeysRepository } from '@/apikeys/apikeys.repository';

@Injectable()
export class ApikeysService {
  constructor(private readonly apikeysRepository: ApikeysRepository) {}

  async create(createApikeyDto: CreateApikeyDto) {
    return this.apikeysRepository.create(createApikeyDto);
  }

  async findAll() {
    return this.apikeysRepository.findAll();
  }

  async findByOrganization(organizationId: string) {
    return this.apikeysRepository.findAllByOrganization(organizationId);
  }

  async findOne(id: string) {
    return this.apikeysRepository.findOne(id);
  }

  async validateApiKey(key: string) {
    return this.apikeysRepository.validateApiKey(key);
  }

  async update(id: string, updateApikeyDto: UpdateApikeyDto) {
    return this.apikeysRepository.update(id, updateApikeyDto);
  }

  async remove(id: string) {
    return this.apikeysRepository.remove(id);
  }

  async deactivate(id: string) {
    return this.apikeysRepository.deactivate(id);
  }
}
