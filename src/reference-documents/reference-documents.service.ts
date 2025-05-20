import { Injectable, Logger } from '@nestjs/common';
import { ReferenceDocumentsRepository } from './reference-documents.repository';
import { Prisma } from '@prisma/client';
import { CreateReferenceDocumentDto } from '@/reference-documents/dto/create-reference-document.dto';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class ReferenceDocumentsService {
  private readonly logger = new Logger(ReferenceDocumentsService.name);
  private readonly s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

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

  async getPresignedUrl(documentId: string): Promise<string | null> {
    const doc = await this.findOne(documentId);

    if (!doc || !doc.key_s3_title) return null;

    const key = doc.key_s3_title;
    console.log('key:', key);

    const command = new GetObjectCommand({
      Bucket: 'batipedia-files',
      Key: key,
    });

    return getSignedUrl(this.s3, command, { expiresIn: 3600 });
  }

  /**
   * Recherche un document de référence par similarité de titre et affiche son id
   */
  async readReferenceDocument(title: string): Promise<void> {
    const doc = await this.repository.findByTitleSimilarity(title);
    if (doc) {
      console.log('ReferenceDocument ID:', doc.id);
    } else {
      console.log('Aucun document trouvé pour ce titre.');
    }
  }

  /**
   * Find a reference document by title similarity (public method for tools)
   */
  async findByTitleSimilarity(title: string) {
    return this.repository.findByTitleSimilarity(title);
  }
}
