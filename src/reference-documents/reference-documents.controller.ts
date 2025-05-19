import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ReferenceDocumentsService } from './reference-documents.service';
import { CreateReferenceDocumentDto } from '@/reference-documents/dto/create-reference-document.dto';
import { UpdateReferenceDocumentDto } from '@/reference-documents/dto/update-reference-document.dto';

@ApiTags('Reference Documents')
@Controller('reference-documents')
export class ReferenceDocumentsController {
  constructor(private readonly service: ReferenceDocumentsService) {}

  @ApiOperation({ summary: 'Create a new reference document' })
  @ApiResponse({ status: 201, description: 'Reference document created' })
  @Post()
  async create(@Body() dto: CreateReferenceDocumentDto) {
    return this.service.create(dto);
  }

  @ApiOperation({ summary: 'Get all reference documents' })
  @ApiResponse({ status: 200, description: 'List of reference documents' })
  @Get()
  async findAll() {
    return this.service.findAll();
  }

  @ApiOperation({ summary: 'Get a reference document by ID' })
  @ApiResponse({ status: 200, description: 'Reference document found' })
  @ApiResponse({ status: 404, description: 'Reference document not found' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @ApiOperation({ summary: 'Update a reference document' })
  @ApiResponse({ status: 200, description: 'Reference document updated' })
  @ApiResponse({ status: 404, description: 'Reference document not found' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateReferenceDocumentDto,
  ) {
    return this.service.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete a reference document' })
  @ApiResponse({ status: 200, description: 'Reference document deleted' })
  @ApiResponse({ status: 404, description: 'Reference document not found' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
