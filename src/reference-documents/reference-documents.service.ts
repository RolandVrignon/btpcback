import { Injectable, Logger } from '@nestjs/common';
import { ReferenceDocumentsRepository } from './reference-documents.repository';
import { Prisma } from '@prisma/client';
import { CreateReferenceDocumentDto } from '@/reference-documents/dto/create-reference-document.dto';

@Injectable()
export class ReferenceDocumentsService {
  private readonly logger = new Logger(ReferenceDocumentsService.name);

  constructor(private readonly repository: ReferenceDocumentsRepository) {}

  // Create a new reference document
  async create(data: CreateReferenceDocumentDto) {
    return this.repository.create(data);
  }

  // Get all reference documents
  async findAll() {
    return this.repository.findAll();
  }

  // Get a reference document by ID
  async findOne(id: string) {
    return this.repository.findOne(id);
  }

  // Update a reference document
  async update(id: string, data: Prisma.ReferenceDocumentUpdateInput) {
    return this.repository.update(id, data);
  }

  // Delete a reference document
  async remove(id: string) {
    return this.repository.remove(id);
  }
}
