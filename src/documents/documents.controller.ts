import { Controller, Get, Post, Body, Param, Delete, UseInterceptors, UploadedFile, ParseIntPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload/:projectId')
  @ApiOperation({ summary: 'Télécharger un nouveau document' })
  @ApiResponse({ status: 201, description: 'Document téléchargé avec succès.' })
  @ApiResponse({ status: 404, description: 'Projet non trouvé.' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async uploadFile(
    @Param('projectId', ParseIntPipe) projectId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
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
  @ApiOperation({ summary: 'Récupérer tous les documents' })
  @ApiResponse({ status: 200, description: 'Liste des documents récupérée avec succès.' })
  findAll() {
    return this.documentsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un document par son ID' })
  @ApiResponse({ status: 200, description: 'Document récupéré avec succès.' })
  @ApiResponse({ status: 404, description: 'Document non trouvé.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.documentsService.findOne(id);
  }

  @Get('project/:id')
  @ApiOperation({ summary: 'Récupérer tous les documents d\'un projet' })
  @ApiResponse({ status: 200, description: 'Liste des documents récupérée avec succès.' })
  @ApiResponse({ status: 404, description: 'Projet non trouvé.' })
  findByProject(@Param('id', ParseIntPipe) id: number) {
    return this.documentsService.findByProject(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un document' })
  @ApiResponse({ status: 200, description: 'Document supprimé avec succès.' })
  @ApiResponse({ status: 404, description: 'Document non trouvé.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.documentsService.remove(id);
  }
}