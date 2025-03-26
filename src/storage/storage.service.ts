import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  ListBucketsCommand,
  CreateBucketCommand,
  CreateBucketCommandInput,
  GetObjectCommand,
  HeadObjectCommand,
  NoSuchKey,
  S3ServiceException,
  BucketAlreadyExists,
  BucketAlreadyOwnedByYou,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { UploadUrlDto } from './dto/upload-url.dto';
import { UploadUrlResponseDto } from './dto/upload-url-response.dto';
import { BucketListResponseDto } from './dto/bucket-list-response.dto';
import { CreateBucketResponseDto } from './dto/create-bucket-response.dto';
import { DownloadFileDto } from './dto/download-file.dto';
import { DownloadFileResponseDto } from './dto/download-file-response.dto';
import { RootObjectsResponseDto } from './dto/root-objects-response.dto';
import { ProjectsRepository } from '../projects/projects.repository';

@Injectable()
export class StorageService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(
    private configService: ConfigService,
    private projectsRepository: ProjectsRepository,
  ) {
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

  /**
   * Génère une URL présignée pour télécharger un fichier vers S3
   * @param dto Informations sur le fichier à télécharger
   * @param organizationId ID de l'organisation qui fait la demande
   * @returns URL présignée pour télécharger le fichier
   * @throws NotFoundException si le projet n'existe pas
   * @throws ForbiddenException si le projet n'appartient pas à l'organisation
   */
  async createUploadUrl(
    dto: UploadUrlDto,
    organizationId: string,
  ): Promise<UploadUrlResponseDto> {
    // Vérifier si le projet existe et appartient à l'organisation
    const project =
      await this.projectsRepository.findProjectByIdAndOrganization(
        dto.projectId,
        organizationId,
      );

    if (!project) {
      throw new NotFoundException('Projet non trouvé');
    }

    const expiresIn = 3600; // 1 heure par défaut

    if (!process.env.AWS_S3_BUCKET) {
      throw new Error('BUCKET_PATH is not defined');
    }

    // Construire le chemin du fichier avec le projectId
    const key = `${process.env.AWS_S3_BUCKET}${dto.projectId}/${dto.fileName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: dto.contentType,
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn });

    // Retourner le chemin relatif au projet dans la réponse
    return {
      url,
      expiresIn,
      key: `./${dto.projectId}/`,
    };
  }

  /**
   * Génère une URL présignée pour télécharger un fichier depuis S3
   * @param dto Informations sur le fichier à télécharger
   * @param organizationId ID de l'organisation qui fait la demande
   * @returns URL présignée pour télécharger le fichier
   * @throws NotFoundException si le fichier n'existe pas
   * @throws ForbiddenException si le projet n'appartient pas à l'organisation
   */
  async getDownloadUrl(
    dto: DownloadFileDto,
    organizationId: string,
  ): Promise<DownloadFileResponseDto> {
    // Vérifier si le projet existe et appartient à l'organisation
    const project =
      await this.projectsRepository.findProjectByIdAndOrganization(
        dto.projectId,
        organizationId,
      );

    console.log('One');

    if (!project) {
      throw new NotFoundException('Projet non trouvé');
    }

    console.log('Two');

    const expiresIn = 3600; // 1 heure par défaut

    if (!process.env.AWS_S3_BUCKET) {
      throw new Error('BUCKET_PATH is not defined');
    }

    const key = `${process.env.AWS_S3_BUCKET}${dto.projectId}/${dto.fileName}`;

    console.log('Three');

    // Vérifier si le fichier existe
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      console.log('Four');

      await this.s3Client.send(headCommand);
    } catch (error) {
      // Vérifier si l'erreur est due à un fichier inexistant
      if (
        error instanceof NoSuchKey ||
        (error instanceof S3ServiceException && error.name === 'NotFound') ||
        (error instanceof Error && 'name' in error && error.name === 'NotFound')
      ) {
        throw new NotFoundException(
          `Le fichier ${dto.fileName} n'existe pas dans le projet ${dto.projectId}`,
        );
      }
      throw error;
    }

    // Générer l'URL présignée
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    console.log('Five');

    const url = await getSignedUrl(this.s3Client, command, { expiresIn });
    console.log('url:', url);

    return {
      url,
      expiresIn,
      key,
    };
  }

  /**
   * Liste tous les buckets disponibles dans le compte AWS
   * @returns Liste des buckets avec leur nom et date de création
   */
  async listBuckets(): Promise<BucketListResponseDto> {
    try {
      const command = new ListBucketsCommand({});
      const { Buckets } = await this.s3Client.send(command);

      return {
        buckets:
          Buckets?.map((bucket) => ({
            name: bucket.Name,
            createdAt: bucket.CreationDate,
          })) || [],
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      throw new Error(
        `Erreur lors de la récupération des buckets: ${errorMessage}`,
      );
    }
  }

  /**
   * Crée un nouveau bucket S3 avec le nom spécifié dans la variable d'environnement AWS_S3_BUCKET
   * @returns Informations sur le bucket créé
   * @throws BadRequestException si le bucket existe déjà
   */
  async createDefaultBucket(): Promise<CreateBucketResponseDto> {
    try {
      // Vérifier si le bucket existe déjà
      const listCommand = new ListBucketsCommand({});
      const { Buckets } = await this.s3Client.send(listCommand);

      const bucketExists = Buckets?.some(
        (bucket) => bucket.Name === this.bucketName,
      );
      if (bucketExists) {
        throw new BadRequestException(
          `Le bucket ${this.bucketName} existe déjà`,
        );
      }

      const input: CreateBucketCommandInput = {
        Bucket: this.bucketName,
      };

      const command = new CreateBucketCommand(input);
      const response = await this.s3Client.send(command);

      return {
        bucketName: this.bucketName,
        location:
          response.Location || `https://${this.bucketName}.s3.amazonaws.com`,
      };
    } catch (error: unknown) {
      // Gérer spécifiquement les erreurs d'existence de bucket
      if (
        error instanceof BucketAlreadyExists ||
        error instanceof BucketAlreadyOwnedByYou ||
        (error instanceof Error &&
          (error.name === 'BucketAlreadyExists' ||
            error.name === 'BucketAlreadyOwnedByYou'))
      ) {
        throw new BadRequestException(
          `Le bucket ${this.bucketName} existe déjà`,
        );
      }

      // Pour les autres erreurs
      if (error instanceof BadRequestException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      throw new Error(`Erreur lors de la création du bucket: ${errorMessage}`);
    }
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

  /**
   * Liste tous les objets du bucket S3 par défaut jusqu'à une profondeur de 3 niveaux
   * @returns Liste des objets avec leur clé, taille et date de dernière modification
   */
  async listRootObjects(): Promise<RootObjectsResponseDto> {
    try {
      // Lister tous les objets sans délimiteur
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
      });

      const response = await this.s3Client.send(command);

      // Filtrer pour obtenir les objets et les préfixes jusqu'à une profondeur de 3
      const objects: Array<{
        key: string;
        size: number;
        lastModified: Date;
      }> = [];
      const prefixes = new Set<string>();

      response.Contents?.forEach((object) => {
        const key = object.Key;

        if (key) {
          // Compter le nombre de segments dans le chemin
          const segments = key.split('/').filter(Boolean);
          const depth = segments.length;

          // Ajouter l'objet s'il est dans la profondeur souhaitée (≤ 3)
          if (depth <= 3) {
            objects.push({
              key,
              size: object.Size || 0,
              lastModified: object.LastModified || new Date(),
            });

            // Extraire et ajouter tous les préfixes parents
            if (depth > 0) {
              // Ajouter les préfixes de premier niveau
              const firstLevelPrefix = segments[0] + '/';
              prefixes.add(firstLevelPrefix);

              // Ajouter les préfixes de deuxième niveau si disponible
              if (depth > 1) {
                const secondLevelPrefix = segments[0] + '/' + segments[1] + '/';
                prefixes.add(secondLevelPrefix);
              }

              // Ajouter les préfixes de troisième niveau si disponible
              if (depth > 2) {
                const thirdLevelPrefix =
                  segments[0] + '/' + segments[1] + '/' + segments[2] + '/';
                prefixes.add(thirdLevelPrefix);
              }
            }
          }
        }
      });

      return {
        objects,
        prefixes: Array.from(prefixes).sort(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';

      throw new Error(
        `Erreur lors de la récupération des objets: ${errorMessage}`,
      );
    }
  }
}
