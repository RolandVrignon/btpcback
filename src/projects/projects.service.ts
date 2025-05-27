import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { CreateProjectDto } from '@/projects/dto/create-project.dto';
import { UpdateProjectDto } from '@/projects/dto/update-project.dto';
import { UpdateAddressDto } from '@/projects/dto/update-address.dto';
import { ProjectsRepository } from '@/projects/projects.repository';
import { DeliverablesService } from '@/deliverables/deliverables.service';
import { DeliverableType } from '@prisma/client';
import { OrganizationEntity } from '@/types';
import { Status } from '@prisma/client';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly projectsRepository: ProjectsRepository,
    @Inject(forwardRef(() => DeliverablesService))
    private readonly deliverablesService: DeliverablesService,
  ) {}

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

  async updateAddress(
    id: string,
    updateAddressDto: UpdateAddressDto,
    organization: OrganizationEntity,
  ) {
    const project = await this.projectsRepository.updateAddress(
      id,
      updateAddressDto,
    );

    // Créer les deux livrables en parallèle
    await Promise.all([
      // Livrable DOCUMENTS_PUBLIQUES
      this.deliverablesService.create(
        {
          type: DeliverableType.DOCUMENTS_PUBLIQUES,
          projectId: id,
          documentIds: [],
          new: true,
        },
        organization,
      ),
      // Livrable GEORISQUES
      this.deliverablesService.create(
        {
          type: DeliverableType.GEORISQUES,
          projectId: id,
          documentIds: [],
          new: true,
        },
        organization,
      ),
    ]);

    return project;
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

  async updateStatus(
    id: string,
    status: Status,
    message?: string,
    code?: string,
    webhookUrl?: string,
  ) {
    await this.projectsRepository.updateStatus(
      id,
      status,
      code ? Number(code) : 0,
      message,
    );

    const body = {
      projectId: id,
      status: status,
      code: code ? Number(code) : 0,
      message: message,
    };

    if (webhookUrl) {
      try {
        this.logger.log(
          `PROJECT [${id}] - Envoi au webhook [${webhookUrl}] : \n ${JSON.stringify(body, null, 2)}`,
        );
        await fetch(webhookUrl, {
          method: 'POST',
          body: JSON.stringify(body),
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch {
        this.logger.error(
          `PROJECT [${id}] - Erreur lors de l'envoi au webhook [${webhookUrl}] : \n ${JSON.stringify(body, null, 2)}`,
        );
      }
    }
  }
}
