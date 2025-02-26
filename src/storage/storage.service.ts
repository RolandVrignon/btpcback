import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PresignedUrlDto } from './dto/presigned-url.dto';
import { PresignedUrlResponseDto } from './dto/presigned-url-response.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class StorageService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION', 'eu-west-3'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
          '',
        ),
      },
    });
    this.bucketName = this.configService.get<string>(
      'AWS_S3_BUCKET',
      'btpc-documents',
    );
  }

  async createPresignedUrl(
    dto: PresignedUrlDto,
  ): Promise<PresignedUrlResponseDto> {
    const expiresIn = 3600; // 1 heure par défaut

    // Construire le chemin du fichier avec le projectId
    const basePath = `projects/${dto.projectId}`;

    // Générer un nom de fichier aléatoire basé sur le timestamp et un hash
    const timestamp = Date.now();
    const randomId = randomBytes(8).toString('hex');
    const extension = this.getExtensionFromContentType(dto.contentType);
    const fileName = `${timestamp}-${randomId}${extension}`;

    const key = `${basePath}/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: dto.contentType,
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn });

    return {
      url,
      expiresIn,
      key,
    };
  }

  /**
   * Détermine l'extension de fichier appropriée basée sur le type MIME
   */
  private getExtensionFromContentType(contentType: string): string {
    const mimeToExt: Record<string, string> = {
      'application/pdf': '.pdf',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        '.docx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        '.xlsx',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        '.pptx',
      'text/plain': '.txt',
      'text/csv': '.csv',
      'application/json': '.json',
    };

    return mimeToExt[contentType] || '';
  }
}
