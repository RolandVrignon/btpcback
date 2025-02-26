import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { PresignedUrlDto } from './dto/presigned-url.dto';
import { PresignedUrlResponseDto } from './dto/presigned-url-response.dto';

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
}
