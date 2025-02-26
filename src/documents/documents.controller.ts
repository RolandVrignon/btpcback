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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiHeader,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Organization } from '../decorators/organization.decorator';

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
    @Param('projectId', ParseIntPipe) projectId: number,
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
  @ApiResponse({ status: 200, description: 'Document récupéré avec succès.' })
  @ApiResponse({ status: 404, description: 'Document non trouvé.' })
  @ApiResponse({ status: 401, description: 'Clé API manquante ou invalide.' })
  @ApiResponse({
    status: 403,
    description: 'Accès non autorisé à ce document.',
  })
  findOne(@Param('id', ParseIntPipe) id: number, @Organization() organization) {
    return this.documentsService.findOne(id, organization.id);
  }

  @Get('project/:id')
  @ApiOperation({ summary: "Récupérer tous les documents d'un projet" })
  @ApiResponse({
    status: 200,
    description: 'Liste des documents récupérée avec succès.',
  })
  @ApiResponse({ status: 404, description: 'Projet non trouvé.' })
  @ApiResponse({ status: 401, description: 'Clé API manquante ou invalide.' })
  @ApiResponse({ status: 403, description: 'Accès non autorisé à ce projet.' })
  findByProject(
    @Param('id', ParseIntPipe) id: number,
    @Organization() organization,
  ) {
    return this.documentsService.findByProject(id, organization.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un document' })
  @ApiResponse({ status: 200, description: 'Document supprimé avec succès.' })
  @ApiResponse({ status: 404, description: 'Document non trouvé.' })
  @ApiResponse({ status: 401, description: 'Clé API manquante ou invalide.' })
  @ApiResponse({
    status: 403,
    description: 'Accès non autorisé à ce document.',
  })
  remove(@Param('id', ParseIntPipe) id: number, @Organization() organization) {
    return this.documentsService.remove(id, organization.id);
  }
}
