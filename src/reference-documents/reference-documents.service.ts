import { Injectable, Logger } from '@nestjs/common';
import { ReferenceDocumentsRepository } from './reference-documents.repository';
import { Prisma } from '@prisma/client';
import { CreateReferenceDocumentDto } from '@/reference-documents/dto/create-reference-document.dto';
import { CreateReferenceDocumentFromUrlDto } from './dto/create-reference-document-from-url.dto';
import {
  extractGDriveFileId,
  downloadFromGDrive,
} from '@/utils/gdrive-download.util';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import type { ReadableStream as NodeReadableStream } from 'stream/web';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';

@Injectable()
export class ReferenceDocumentsService {
  private readonly logger = new Logger(ReferenceDocumentsService.name);

  constructor(private readonly repository: ReferenceDocumentsRepository) {}

  // Create a new reference document
  async create(data: CreateReferenceDocumentDto) {
    return this.repository.create(data);
  }

  async downloadFile(url: string) {
    const gdriveFileId = extractGDriveFileId(url);
    let localPath: string;
    let fileName: string;
    if (gdriveFileId) {
      // Download from Google Drive
      fileName = `${gdriveFileId}.download`;
      localPath = path.join(os.tmpdir(), fileName);
      await downloadFromGDrive(gdriveFileId, localPath);
      this.logger.log(`Downloaded Google Drive file to: ${localPath}`);
    } else {
      // Download direct file (PDF, DOCX, etc.) using fetch
      const response = await fetch(url);
      if (!response.ok || !response.body) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      // Try to get filename from headers
      const contentDisposition = response.headers.get('content-disposition');
      if (contentDisposition) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(
          contentDisposition,
        );
        if (matches != null && matches[1]) {
          fileName = matches[1].replace(/['"]/g, '');
        }
      }

      // If not found, try to extract from URL
      if (!fileName) {
        try {
          const urlObj = new URL(url);
          const pathSegments = urlObj.pathname.split('/');
          fileName = decodeURIComponent(pathSegments[pathSegments.length - 1]);
        } catch {
          fileName = '';
        }
      }

      // If still not found, generate a unique name
      if (!fileName) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        fileName = `reference_${timestamp}_${random}`;
      }

      localPath = path.join(os.tmpdir(), fileName);
      const writer = fs.createWriteStream(localPath);
      const nodeStream = Readable.fromWeb(
        response.body as NodeReadableStream<any>,
      );
      await pipeline(nodeStream, writer);
      this.logger.log(`Downloaded direct file to: ${localPath}`);
    }
    return { localPath, fileName };
  }

  async extractTextFromPdf(pdfPath: string) {
    // Tableau pour stocker les résultats
    const results: Array<{ text: string; page: number }> = [];

    const exec = promisify(execCallback);
    const tempDir = path.dirname(pdfPath);
    const tempOutputPath = path.join(tempDir, 'temp_page.txt');

    const pdfInfoCommand = `pdfinfo "${pdfPath}"`;
    const { stdout: pdfInfoOutput } = await exec(pdfInfoCommand);

    // Extraire le nombre de pages à partir de la sortie de pdfinfo
    const pagesMatch = pdfInfoOutput.match(/Pages:\s+(\d+)/);
    if (!pagesMatch) {
      throw new Error('Impossible de déterminer le nombre de pages du PDF');
    }

    const totalPages = parseInt(pagesMatch[1], 10);

    // Extraire le texte page par page
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      // Utiliser pdftotext avec les options -f et -l pour extraire une seule page
      const extractCommand = `pdftotext -f ${pageNum} -l ${pageNum} -layout "${pdfPath}" "${tempOutputPath}"`;
      await exec(extractCommand);

      // Lire le contenu du fichier texteou
      if (fs.existsSync(tempOutputPath)) {
        const pageText = fs.readFileSync(tempOutputPath, 'utf8');

        // Ajouter le texte et le numéro de page au tableau de résultats
        results.push({
          text: pageText,
          page: pageNum,
        });

        // Supprimer le fichier temporaire
        fs.unlinkSync(tempOutputPath);
      }
    }

    return results;

    return text;
  }

  // Create a reference document from a remote URL
  async createFromUrl(dto: CreateReferenceDocumentFromUrlDto) {
    this.logger.log(`Downloading and processing document from URL: ${dto.url}`);

    const { localPath, fileName } = await this.downloadFile(dto.url);

    const text = await this.extractTextFromPdf(localPath);

    this.logger.log(`Extracted text from PDF: ${text}`);

    return {
      message: 'File downloaded (TODO: process document)',
      url: dto.url,
      localPath,
      fileName,
    };
  }

  // Get all reference documents
  async findAll() {
    return this.repository.findAll();
  }

  // Get a reference document by ID
  async findOne(id: string) {
    return this.repository.findOne(id);
  }

  // Update a reference document
  async update(id: string, data: Prisma.ReferenceDocumentUpdateInput) {
    return this.repository.update(id, data);
  }

  // Delete a reference document
  async remove(id: string) {
    return this.repository.remove(id);
  }
}
