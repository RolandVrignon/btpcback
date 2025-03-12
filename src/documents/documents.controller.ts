import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  Patch,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiHeader,
  ApiParam,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Organization } from '../decorators/organization.decorator';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { OrganizationEntity } from '../types';
import { UpdateStatusDto } from './dto/update-document-status.dto';
import { MonitorDocumentDto } from './dto/monitor-document.dto';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { ViewDocumentDto } from './dto/view-document.dto';
import { ViewDocumentResponseDto } from './dto/view-document-response.dto';
import { GetDocumentMetadataDto } from './dto/get-document-metadata.dto';
import { DocumentMetadataResponseDto } from './dto/document-metadata-response.dto';
import { ConfirmMultipleUploadsDto } from './dto/confirm-multiple-uploads.dto';
import { GetDocumentByFilenameDto } from './dto/get-document-by-filename.dto';

@ApiTags('documents')
@ApiHeader({
  name: 'x-api-key',
  description: "Clé API pour l'authentification",
  required: true,
})
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload/:projectId')
  @ApiOperation({ summary: 'Télécharger un nouveau document' })
  @ApiResponse({ status: 201, description: 'Document téléchargé avec succès.' })
  @ApiResponse({ status: 404, description: 'Projet non trouvé.' })
  @ApiResponse({ status: 401, description: 'Clé API manquante ou invalide.' })
  @ApiResponse({ status: 403, description: 'Accès non autorisé à ce projet.' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async uploadFile(
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Organization() organization: OrganizationEntity,
  ) {
    // Vérifier si le projet appartient à l'organisation
    await this.documentsService.checkProjectAccess(projectId, organization.id);

    const createDocumentDto: CreateDocumentDto = {
      filename: file.originalname,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
      projectId,
    };

    return this.documentsService.create(createDocumentDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Récupérer tous les documents de votre organisation',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des documents récupérée avec succès.',
  })
  @ApiResponse({ status: 401, description: 'Clé API manquante ou invalide.' })
  findAll(@Organization() organization: OrganizationEntity) {
    return this.documentsService.findAllByOrganization(organization.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un document par son ID' })
  @ApiParam({
    name: 'id',
    description: 'ID du document à récupérer',
    example: '01234567890123456789012345678901',
  })
  @ApiResponse({ status: 200, description: 'Document récupéré avec succès.' })
  @ApiResponse({ status: 404, description: 'Document non trouvé.' })
  @ApiResponse({ status: 401, description: 'Clé API manquante ou invalide.' })
  @ApiResponse({
    status: 403,
    description: 'Accès non autorisé à ce document.',
  })
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: "Récupérer tous les documents d'un projet" })
  @ApiParam({
    name: 'projectId',
    description: 'ID du projet',
    example: '01234567890123456789012345678901',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des documents récupérée avec succès.',
  })
  @ApiResponse({ status: 404, description: 'Projet non trouvé.' })
  @ApiResponse({ status: 401, description: 'Clé API manquante ou invalide.' })
  @ApiResponse({
    status: 403,
    description: 'Accès non autorisé à ce projet.',
  })
  findByProject(@Param('projectId') projectId: string) {
    return this.documentsService.findByProject(projectId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un document' })
  @ApiParam({
    name: 'id',
    description: 'ID du document à mettre à jour',
    example: '01234567890123456789012345678901',
  })
  @ApiResponse({ status: 200, description: 'Document mis à jour avec succès.' })
  @ApiResponse({ status: 404, description: 'Document non trouvé.' })
  @ApiResponse({ status: 401, description: 'Clé API manquante ou invalide.' })
  @ApiResponse({
    status: 403,
    description: 'Accès non autorisé à ce document.',
  })
  update(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
  ) {
    try {
      const result = this.documentsService.update(id, updateDocumentDto);
      return result;
    } catch (error) {
      console.error('[CONTROLLER] Erreur dans la méthode update:', error);
      throw error;
    }
  }

  @Post('confirm-multiple-uploads')
  @ApiOperation({ summary: "Confirmer l'upload de plusieurs fichiers sur S3" })
  @ApiResponse({ status: 201, description: 'Documents créés avec succès.' })
  @ApiResponse({ status: 404, description: 'Projet ou fichier non trouvé.' })
  @ApiResponse({ status: 401, description: 'Clé API manquante ou invalide.' })
  @ApiResponse({
    status: 403,
    description: 'Accès non autorisé à ce projet.',
  })
  @ApiResponse({
    status: 400,
    description: 'Erreur lors de la vérification des fichiers.',
  })
  confirmMultipleUploads(
    @Body() confirmMultipleUploadsDto: ConfirmMultipleUploadsDto,
    @Organization() organization: OrganizationEntity,
  ) {
    return this.documentsService.confirmMultipleUploads(
      confirmMultipleUploadsDto,
      organization.id,
    );
  }

  @Post(':id/status')
  @ApiOperation({ summary: "Mettre à jour le statut d'un document" })
  @ApiParam({
    name: 'id',
    description: 'ID du document',
    example: '01234567890123456789012345678901',
  })
  @ApiResponse({
    status: 200,
    description: 'Statut du document mis à jour avec succès.',
  })
  @ApiResponse({ status: 404, description: 'Document non trouvé.' })
  @ApiResponse({ status: 401, description: 'Clé API manquante ou invalide.' })
  @ApiResponse({
    status: 403,
    description: 'Accès non autorisé à ce document.',
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    // Vérifier que le document appartient à un projet de l'organisation
    await this.documentsService.findOne(id);
    return this.documentsService.updateStatus(id, updateStatusDto.status);
  }

  @Post('monitor')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: "Surveiller le statut d'un document" })
  @ApiResponse({
    status: 200,
    description: 'Statut du document récupéré avec succès',
  })
  @ApiResponse({ status: 404, description: 'Document ou projet non trouvé' })
  @ApiResponse({
    status: 403,
    description: 'Accès non autorisé au document ou au projet',
  })
  async monitorDocument(
    @Body() monitorDocumentDto: MonitorDocumentDto,
    @Organization() organization: OrganizationEntity,
  ) {
    return this.documentsService.monitorStatus(
      monitorDocumentDto.documentId,
      monitorDocumentDto.projectId,
      organization.id,
    );
  }

  @Post('view')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({
    summary: 'Générer une URL présignée pour consulter un document',
  })
  @ApiResponse({
    status: 200,
    description: 'URL présignée générée avec succès',
    type: ViewDocumentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Document ou projet non trouvé' })
  @ApiResponse({
    status: 403,
    description: 'Accès non autorisé au document ou au projet',
  })
  async getViewUrl(
    @Body() viewDocumentDto: ViewDocumentDto,
    @Organization() organization: OrganizationEntity,
  ) {
    return this.documentsService.getViewUrl(viewDocumentDto, organization.id);
  }

  @Post('metadata')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({
    summary: "Récupérer les métadonnées AI d'un document",
  })
  @ApiResponse({
    status: 200,
    description: 'Métadonnées AI récupérées avec succès',
    type: DocumentMetadataResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Document ou projet non trouvé' })
  @ApiResponse({
    status: 403,
    description: 'Accès non autorisé au document ou au projet',
  })
  async getDocumentMetadata(
    @Body() getDocumentMetadataDto: GetDocumentMetadataDto,
    @Organization() organization: OrganizationEntity,
  ) {
    return this.documentsService.getDocumentMetadata(
      getDocumentMetadataDto.projectId,
      getDocumentMetadataDto.fileName,
      organization.id,
    );
  }

  @Post('find-by-filename')
  @ApiOperation({
    summary: "Récupérer un document par son nom de fichier et l'ID du projet",
  })
  @ApiResponse({ status: 200, description: 'Document trouvé.' })
  @ApiResponse({ status: 404, description: 'Document non trouvé.' })
  @ApiResponse({ status: 401, description: 'Clé API manquante ou invalide.' })
  async findByFilename(
    @Body() getDocumentByFilenameDto: GetDocumentByFilenameDto,
    @Organization() organization: OrganizationEntity,
  ) {
    // Vérifier si le projet appartient à l'organisation
    await this.documentsService.checkProjectAccess(
      getDocumentByFilenameDto.projectId,
      organization.id,
    );

    const document = await this.documentsService.findByProjectIdAndFileName(
      getDocumentByFilenameDto.projectId,
      getDocumentByFilenameDto.fileName,
    );

    if (!document) {
      throw new NotFoundException(
        `Document avec le nom de fichier ${getDocumentByFilenameDto.fileName} non trouvé dans le projet ${getDocumentByFilenameDto.projectId}`,
      );
    }

    return document;
  }
}
