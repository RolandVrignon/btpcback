import { Controller, Post, Body, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { PresignedUrlDto } from './dto/presigned-url.dto';
import { PresignedUrlResponseDto } from './dto/presigned-url-response.dto';
import { BucketListResponseDto } from './dto/bucket-list-response.dto';
import { CreateBucketResponseDto } from './dto/create-bucket-response.dto';
import { DownloadFileDto } from './dto/download-file.dto';
import { DownloadFileResponseDto } from './dto/download-file-response.dto';

@ApiTags('storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('presigned-url')
  @ApiOperation({
    summary: 'Générer une URL présignée pour télécharger un fichier sur S3',
  })
  @ApiResponse({
    status: 201,
    description: 'URL présignée générée avec succès',
    type: PresignedUrlResponseDto,
  })
  createPresignedUrl(
    @Body() presignedUrlDto: PresignedUrlDto,
  ): Promise<PresignedUrlResponseDto> {
    return this.storageService.createPresignedUrl(presignedUrlDto);
  }

  @Post('download')
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
    description: "Le fichier demandé n'existe pas",
  })
  @ApiResponse({
    status: 500,
    description: "Erreur lors de la vérification de l'existence du fichier",
  })
  getDownloadUrl(
    @Body() downloadFileDto: DownloadFileDto,
  ): Promise<DownloadFileResponseDto> {
    return this.storageService.getDownloadUrl(downloadFileDto);
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
