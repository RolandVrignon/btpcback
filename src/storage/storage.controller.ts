import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { StorageService } from '@/storage/storage.service';
import { UploadUrlDto } from '@/storage/dto/upload-url.dto';
import { UploadUrlResponseDto } from '@/storage/dto/upload-url-response.dto';
import { BucketListResponseDto } from '@/storage/dto/bucket-list-response.dto';
import { CreateBucketResponseDto } from '@/storage/dto/create-bucket-response.dto';
import { DownloadFileDto } from '@/storage/dto/download-file.dto';
import { DownloadFileResponseDto } from '@/storage/dto/download-file-response.dto';
import { RootObjectsResponseDto } from '@/storage/dto/root-objects-response.dto';
import { Organization } from '@/decorators/organization.decorator';
import { OrganizationEntity } from '@/types';
import { ApiKeyGuard } from '@/common/guards/api-key.guard';
import { Logger } from '@nestjs/common';

@ApiTags('storage')
@ApiHeader({
  name: 'x-api-key',
  description: "Clé API pour l'authentification",
  required: true,
})
@Controller('storage')
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(private readonly storageService: StorageService) {}

  @Post('upload-url')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({
    summary: 'Générer une URL présignée pour uploader un fichier sur S3',
  })
  @ApiResponse({
    status: 201,
    description: 'URL présignée générée avec succès',
    type: UploadUrlResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Projet non trouvé',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès non autorisé à ce projet',
  })
  createUploadUrl(
    @Body() uploadUrlDto: UploadUrlDto,
    @Organization() organization: OrganizationEntity,
  ): Promise<UploadUrlResponseDto> {
    this.logger.log('organization', organization);
    return this.storageService.createUploadUrl(uploadUrlDto, organization.id);
  }

  @Post('download-url')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({
    summary: 'Générer une URL présignée pour télécharger un fichier depuis S3',
  })
  @ApiResponse({
    status: 201,
    description: 'URL présignée générée avec succès',
    type: DownloadFileResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Le fichier demandé n'existe pas ou le projet n'existe pas",
  })
  @ApiResponse({
    status: 403,
    description: 'Accès non autorisé à ce projet',
  })
  @ApiResponse({
    status: 500,
    description: "Erreur lors de la vérification de l'existence du fichier",
  })
  getDownloadUrl(
    @Body() downloadFileDto: DownloadFileDto,
    @Organization() organization: OrganizationEntity,
  ): Promise<DownloadFileResponseDto> {
    return this.storageService.getDownloadUrl(downloadFileDto, organization.id);
  }

  @Get('buckets')
  @ApiOperation({
    summary: 'Lister tous les buckets S3 disponibles',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des buckets récupérée avec succès',
    type: BucketListResponseDto,
  })
  listBuckets(): Promise<BucketListResponseDto> {
    return this.storageService.listBuckets();
  }

  @Get('objects')
  @ApiOperation({
    summary: 'Lister tous les objets à la racine du bucket S3 par défaut',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des objets récupérée avec succès',
    type: RootObjectsResponseDto,
  })
  listRootObjects(): Promise<RootObjectsResponseDto> {
    return this.storageService.listRootObjects();
  }

  @Post('bucket')
  @ApiOperation({
    summary:
      "Créer le bucket S3 par défaut défini dans les variables d'environnement",
  })
  @ApiResponse({
    status: 201,
    description: 'Bucket créé avec succès',
    type: CreateBucketResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Erreur lors de la création du bucket - Le bucket existe déjà ou autre erreur',
  })
  createDefaultBucket(): Promise<CreateBucketResponseDto> {
    return this.storageService.createDefaultBucket();
  }
}
