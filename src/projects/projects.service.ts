import { Injectable } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsRepository } from './projects.repository';

@Injectable()
export class ProjectsService {
  constructor(private readonly projectsRepository: ProjectsRepository) {}

  async create(createProjectDto: CreateProjectDto) {
    return this.projectsRepository.create(createProjectDto);
  }

  async findAll() {
    return this.projectsRepository.findAll();
  }

  async findAllByOrganization(organizationId: string) {
    return this.projectsRepository.findAllByOrganization(organizationId);
  }

  async findOne(id: string) {
    return this.projectsRepository.findOne(id);
  }

  async update(id: string, updateProjectDto: UpdateProjectDto) {
    return this.projectsRepository.update(id, updateProjectDto);
  }

  async remove(id: string) {
    return this.projectsRepository.remove(id);
  }

  /**
   * Vérifie si un projet existe
   */
  async exists(id: string): Promise<boolean> {
    return this.projectsRepository.exists(id);
  }
}
