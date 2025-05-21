import { Injectable } from '@nestjs/common';
import { ReferenceImageRepository } from '@/reference-image/reference-image.repository';

@Injectable()
export class ReferenceImageService {
  constructor(
    private readonly referenceImageRepository: ReferenceImageRepository,
  ) {}

  async getImageById(id: string): Promise<Buffer | null> {
    // Retrieve imageData from repository
    const refImage = await this.referenceImageRepository.findById(id);
    if (!refImage || !refImage.imageData) return null;
    return refImage.imageData as Buffer;
  }
}
