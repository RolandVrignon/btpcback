import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReferenceImageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    // Find ReferenceImage by id
    return this.prisma.referenceImage.findUnique({
      where: { id },
      select: { imageData: true },
    });
  }
}
