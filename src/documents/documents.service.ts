import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async create(createDocumentDto: CreateDocumentDto) {
    // Vérifier si le projet existe
    const project = await this.prisma.project.findUnique({
      where: { id: createDocumentDto.projectId },
    });

    if (!project) {
      throw new NotFoundException('Projet non trouvé');
    }

    return await this.prisma.document.create({
      data: createDocumentDto,
      include: {
        project: true,
      },
    });
  }

  async findAll() {
    return await this.prisma.document.findMany({
      include: {
        project: true,
      },
    });
  }

  async findOne(id: number) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        project: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Document non trouvé');
    }

    return document;
  }

  async findByProject(projectId: number) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Projet non trouvé');
    }

    return await this.prisma.document.findMany({
      where: { projectId },
      include: {
        project: true,
      },
    });
  }

  async remove(id: number) {
    try {
      return await this.prisma.document.delete({
        where: { id },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Document non trouvé');
      }
      throw error;
    }
  }
}