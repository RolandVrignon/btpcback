import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class StorageRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * Récupère un projet avec son organisation
   * @param projectId ID du projet
   * @param organizationId ID de l'organisation
   * @returns Le projet avec son organisation ou null si non trouvé
   */
  async findProjectWithOrganization(projectId: string, organizationId: string) {
    return this.prisma.executeWithQueue(() =>
      this.prisma.project.findFirst({
        where: {
          id: projectId,
          organizationId,
        },
        include: {
          organization: true,
        },
      }),
    );
  }
}
