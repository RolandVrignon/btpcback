import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  Patch,
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
    @Organization() organization,
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
  findAll(@Organization() organization) {
    return this.documentsService.findAllByOrganization(organization.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un document par son ID' })
  @ApiParam({
    name: 'id',
    description: 'ID du document à récupérer',
    example: '01234567890123456789012345678901',
  })
  @ApiResponse({ status: 200, description: 'Document récupéré avec succès' })
  @ApiResponse({ status: 404, description: 'Document non trouvé' })
  findOne(@Param('id') id: string, @Organization() organization) {
    return this.documentsService.findOne(id, organization.id);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: "Récupérer tous les documents d'un projet" })
  @ApiParam({
    name: 'projectId',
    description: 'ID du projet',
    example: '01234567890123456789012345678901',
  })
  @ApiResponse({ status: 200, description: 'Documents récupérés avec succès' })
  @ApiResponse({ status: 404, description: 'Projet non trouvé' })
  findByProject(
    @Param('projectId') projectId: string,
    @Organization() organization,
  ) {
    return this.documentsService.findByProject(projectId, organization.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un document' })
  @ApiParam({
    name: 'id',
    description: 'ID du document à mettre à jour',
    example: '01234567890123456789012345678901',
  })
  @ApiResponse({ status: 200, description: 'Document mis à jour avec succès' })
  @ApiResponse({ status: 404, description: 'Document non trouvé' })
  update(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @Organization() organization,
  ) {
    return this.documentsService.update(id, updateDocumentDto, organization.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un document' })
  @ApiParam({
    name: 'id',
    description: 'ID du document à supprimer',
    example: '01234567890123456789012345678901',
  })
  @ApiResponse({ status: 200, description: 'Document supprimé avec succès' })
  @ApiResponse({ status: 404, description: 'Document non trouvé' })
  remove(@Param('id') id: string, @Organization() organization) {
    return this.documentsService.remove(id, organization.id);
  }
}
