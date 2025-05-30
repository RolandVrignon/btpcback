import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { CreateDocumentDto } from '@/documents/dto/create-document.dto';
import { Project, Status, AI_Provider } from '@prisma/client';
import { UpdateDocumentDto } from '@/documents/dto/update-document.dto';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  HeadObjectCommand,
  S3ServiceException,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { ViewDocumentDto } from '@/documents/dto/view-document.dto';
import { ViewDocumentResponseDto } from '@/documents/dto/view-document-response.dto';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ChunksService } from '@/chunks/chunks.service';
import { EmbeddingsService } from '@/embeddings/embeddings.service';
import { UsageService } from '@/usage/usage.service';
import { DocumentsRepository } from '@/documents/documents.repository';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';
import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
import { ConfirmMultipleUploadsDto } from '@/documents/dto/confirm-multiple-uploads.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { Chunk } from '@prisma/client';
import { Mistral } from '@mistralai/mistralai';
import { StorageService } from '@/storage/storage.service';
import { ProjectsService } from '@/projects/projects.service';
@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private s3Client: S3Client;
  private bucketName: string;
  private static indexationQueue: Array<Promise<any>> = [];
  private static activeIndexations = 0;
  private static maxConcurrentIndexations: number;

  constructor(
    private configService: ConfigService,
    private usageService: UsageService,
    private readonly documentsRepository: DocumentsRepository,
    private readonly embeddingsService: EmbeddingsService,
    private readonly chunksService: ChunksService,
    private readonly storageService: StorageService,
    private readonly projectsService: ProjectsService,
    private readonly prismaService: PrismaService,
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
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET', '');

    // Initialiser la valeur statique de maxConcurrentIndexations
    if (!DocumentsService.maxConcurrentIndexations) {
      DocumentsService.maxConcurrentIndexations = parseInt(
        this.configService.get<string>(
          'MAX_CONCURRENT_INDEXATION_PROCESSES',
          '5',
        ),
        10,
      );
      this.logger.log(
        `Maximum de processus d'indexation concurrents: ${DocumentsService.maxConcurrentIndexations}`,
      );
    }
  }

  async create(createDocumentDto: CreateDocumentDto) {
    return this.documentsRepository.create(createDocumentDto);
  }

  async findAll() {
    return this.documentsRepository.findAll();
  }

  async findAllByOrganization(organizationId: string) {
    return this.documentsRepository.findAllByOrganization(organizationId);
  }

  async findOne(id: string) {
    return this.documentsRepository.findOne(id);
  }

  async findByProject(projectId: string) {
    return this.documentsRepository.findByProject(projectId);
  }

  async update(id: string, updateDocumentDto: UpdateDocumentDto) {
    try {
      const result = await this.documentsRepository.update(
        id,
        updateDocumentDto,
      );
      return result;
    } catch (error) {
      this.logger.error('[SERVICE] Erreur dans la méthode update:', error);
      throw error;
    }
  }

  async updateStatus(
    documentId: string,
    status: Status | null,
    indexationStatus?: Status | null,
    url?: string,
    code?: number,
    message_status?: string,
    message_indexation?: string,
  ) {
    const body: {
      projectId: string;
      fileName: string;
      documentId: string;
      extraction_status: Status | null;
      indexation_status: Status | null;
      extraction_message: string;
      indexation_message: string;
      code: number | null;
      tags: string[];
    } = {
      projectId: '',
      fileName: '',
      documentId: documentId,
      extraction_status: status,
      indexation_status: indexationStatus,
      extraction_message: message_status,
      indexation_message: message_indexation,
      code: code,
      tags: [],
    };

    const documentUpdated = await this.documentsRepository.updateStatus(
      documentId,
      status,
      indexationStatus,
      code,
      message_status,
      message_indexation,
    );

    body.projectId = documentUpdated.projectId;
    body.fileName = documentUpdated.fileName;
    body.documentId = documentUpdated.documentId;
    body.fileName = documentUpdated.fileName;
    body.extraction_status = documentUpdated.status;
    body.indexation_status = documentUpdated.indexation_status;
    body.extraction_message = documentUpdated.message_status || '';
    body.indexation_message = documentUpdated.message_indexation || '';
    body.code = documentUpdated.code;
    body.tags = documentUpdated.tags;
    if (url) {
      try {
        this.logger.log(
          `DOCUMENT [${documentUpdated.documentId}] - Envoi au webhook [${url}] : \n ${JSON.stringify(body, null, 2)}`,
        );
        await fetch(url, {
          method: 'POST',
          body: JSON.stringify(body),
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch {
        this.logger.error(
          `DOCUMENT [${documentUpdated.documentId}] - Erreur lors de l'envoi au webhook [${url}] : \n ${JSON.stringify(body, null, 2)}`,
        );
      }
    }

    return true;
  }

  async updateIndexationStatus(documentId: string, status: Status) {
    return this.documentsRepository.updateIndexationStatus(documentId, status);
  }

  async findByFilenameAndProject(
    projectId: string,
    fileName: string,
    filePath: string,
  ) {
    return this.documentsRepository.findByFilenameAndProject(
      projectId,
      fileName,
      filePath,
    );
  }

  async updateAiMetadata(
    documentId: string,
    metadata: Record<string, unknown>,
  ) {
    return this.documentsRepository.updateAiMetadata(documentId, metadata);
  }

  /**
   * Analyse un document avec un modèle de langage
   */
  // async analyzeDocument(documentId: string, model: string) {
  //   const document = await this.documentsRepository.findOne(documentId);

  //   try {
  //     // Mettre à jour le statut du document
  //     await this.documentsRepository.updateStatus(
  //       documentId,
  //       'PROCESSING' as Status,
  //     );

  //     // Logique pour analyser le document...
  //     // Cette partie dépend de l'implémentation spécifique pour analyser le document

  //     // Enregistrer l'utilisation du modèle
  //     const usage = {
  //       totalTokens: 2000, // Exemple, à remplacer par la valeur réelle
  //     };

  //     await this.usageService.logTextToTextUsage(
  //       'GEMINI' as AI_Provider,
  //       model,
  //       usage,
  //       document.projectId,
  //     );

  //     // Mettre à jour le statut du document une fois l'analyse terminée
  //     await this.documentsRepository.updateStatus(
  //       documentId,
  //       'READY' as Status,
  //     );

  //     return { success: true, message: 'Document analysé avec succès' };
  //   } catch (error) {
  //     // En cas d'erreur, mettre à jour le statut du document
  //     try {
  //       if (document && document.id) {
  //         await this.updateStatus(document.id, 'ERROR');
  //       }
  //     } catch (updateError) {
  //       this.logger.error(
  //         'Erreur lors de la mise à jour du statut du document:',
  //         updateError,
  //       );
  //     }
  //     if (error instanceof NotFoundException) {
  //       throw error;
  //     }
  //     throw new Error(
  //       `Erreur lors de l'analyse du document: ${(error as Error).message}`,
  //     );
  //   }
  // }

  /**
   * Crée les chunks dans la base de données et génère leurs embeddings
   * @param textChunks Tableau de chunks de texte avec leur numéro de page
   * @param documentId ID du document associé
   * @param projectId ID du projet associé
   * @returns Tableau des chunks créés avec leurs embeddings
   */
  private async createChunksWithEmbeddings(
    textChunks: Array<{ text: string; page: number }>,
    documentId: string,
    projectId: string,
  ): Promise<void> {
    try {
      // Récupérer la clé API OpenAI une seule fois
      const apiKey = this.configService.get<string>('OPENAI_API_KEY');

      if (!apiKey) {
        throw new Error("La clé API OpenAI n'est pas configurée");
      }

      process.env.OPENAI_API_KEY = apiKey;
      const modelName = 'text-embedding-3-small';

      // Récupérer la taille du lot depuis les variables d'environnement, par défaut 5
      const batchSize = parseInt(
        this.configService.get<string>('CHUNK_BATCH_SIZE', '5'),
        10,
      );

      this.logger.log(`Traitement des chunks par lots de ${batchSize}`);

      // Traiter les chunks par lots
      for (let i = 0; i < textChunks.length; i += batchSize) {
        const batch = textChunks.slice(i, i + batchSize);
        this.logger.log(
          `Traitement du lot ${i / batchSize + 1}/${Math.ceil(textChunks.length / batchSize)}`,
        );

        await Promise.all(
          batch.map(async (chunk, batchIndex) => {
            const index = i + batchIndex;
            try {
              // 1. Créer le chunk dans la base de données
              let createdChunk: Chunk;
              try {
                createdChunk = await this.chunksService.create({
                  text: chunk.text,
                  page: chunk.page,
                  documentId,
                  order: index,
                });
              } catch {
                throw new Error(
                  `Erreur lors de la création du chunk: ${chunk.text}`,
                );
              }

              // 2. Nettoyer le texte pour l'embedding
              const cleanedText = this.cleanTextForEmbedding(chunk.text);
              if (cleanedText.length === 0) {
                this.logger.error(
                  `Texte vide pour le chunk ${index}, page ${chunk.page}`,
                );
                return;
              }

              // 3. Générer l'embedding pour ce chunk
              let embeddingVector: number[];
              let usage: { tokens: number };
              try {
                const { embedding: embeddingVector_, usage: usage_ } =
                  await embed({
                    model: openai.embedding(modelName),
                    value: cleanedText,
                  });
                embeddingVector = embeddingVector_;
                usage = usage_;
              } catch {
                throw new Error(
                  `Erreur lors de la génération de l'embedding: ${chunk.text}`,
                );
              }

              // 4. Créer l'embedding dans la base de données
              try {
                await this.embeddingsService.create({
                  provider: AI_Provider.OPENAI,
                  vector: embeddingVector,
                  modelName: modelName,
                  modelVersion: 'v1',
                  dimensions: embeddingVector.length,
                  chunkId: createdChunk.id,
                  usage: usage.tokens,
                  projectId: projectId,
                });
              } catch {
                throw new Error(
                  `Erreur lors de la création de l'embedding: ${chunk.text}`,
                );
              }

              // Enregistrer l'utilisation pour l'embedding
              try {
                await this.usageService.create({
                  provider: AI_Provider.OPENAI,
                  modelName: modelName,
                  totalTokens: usage.tokens,
                  type: 'EMBEDDING',
                  projectId: projectId,
                });
              } catch {
                throw new Error(
                  `Erreur lors de la création de l'utilisation: ${chunk.text}`,
                );
              }
            } catch (error) {
              this.logger.error(
                `Erreur lors de la création du chunk et de l'embedding: ${chunk.text}\n${error}`,
              );
            }
          }),
        );
      }
    } catch (error) {
      this.logger.error(
        `Erreur lors de la création des chunks et embeddings: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      await this.updateIndexationStatus(documentId, 'ERROR' as Status);
      throw error;
    }
  }

  /**
   * Récupère le statut actuel d'un document
   * @param documentId ID du document
   * @param projectId ID du projet
   * @param organizationId ID de l'organisation
   * @returns Le document avec son statut actuel
   */
  async monitorStatus(
    documentId: string,
    projectId: string,
    organizationId: string,
  ) {
    // Vérifier si le projet existe et appartient à l'organisation
    await this.checkProjectAccess(projectId, organizationId);

    // Récupérer le document via le repository
    const document = await this.documentsRepository.findOne(documentId);

    if (!document) {
      throw new NotFoundException(`Document non trouvé`);
    }

    if (document.projectId !== projectId) {
      throw new ForbiddenException(
        "Ce document n'appartient pas au projet spécifié",
      );
    }

    return {
      ...document,
      message: this.getStatusMessage(document.status),
    };
  }

  /**
   * Génère un message explicatif basé sur le statut du document
   * @param status Statut du document
   * @returns Message explicatif
   */
  private getStatusMessage(status: Status): string {
    switch (status) {
      case 'DRAFT':
        return 'Brouillon';
      case 'PROGRESS':
        return 'En cours de traitement';
      case 'PENDING':
        return 'En attente';
      case 'COMPLETED':
        return 'Prêt';
      case 'ERROR':
        return 'Erreur';
      default:
        return 'Statut inconnu';
    }
  }

  async checkProjectAccess(projectId: string, organizationId: string) {
    // Utiliser le repository pour vérifier l'accès au projet
    const project =
      await this.documentsRepository.findProjectWithOrganization(projectId);

    if (!project) {
      throw new NotFoundException('Projet non trouvé');
    }

    const projectWithOrg = project as Project & { organizationId: string };
    if (projectWithOrg.organizationId !== organizationId) {
      throw new ForbiddenException('Accès non autorisé à ce projet');
    }

    return project;
  }

  /**
   * Génère une URL présignée pour consulter un document
   * @param dto Informations sur le document à consulter
   * @param organizationId ID de l'organisation qui fait la demande
   * @returns URL présignée pour consulter le document
   * @throws NotFoundException si le projet n'existe pas ou si le fichier n'existe pas
   * @throws ForbiddenException si le projet n'appartient pas à l'organisation
   */
  async getViewUrl(
    dto: ViewDocumentDto,
    organizationId: string,
  ): Promise<ViewDocumentResponseDto> {
    // Vérifier si le projet existe et appartient à l'organisation
    await this.checkProjectAccess(dto.projectId, organizationId);

    if (!process.env.AWS_S3_BUCKET) {
      throw new Error('BUCKET_PATH is not defined');
    }

    // Construire le chemin du fichier sur S3
    const filePath = `${process.env.AWS_S3_BUCKET}${dto.projectId}/${dto.fileName}`;
    this.logger.log('filePath:', filePath);

    try {
      // Vérifier si le fichier existe sur S3
      const headObjectCommand = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: filePath,
      });

      await this.s3Client.send(headObjectCommand);

      // Générer l'URL présignée pour consulter le document
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: filePath,
      });

      const expiresIn = 3600; // 1 heure
      const url = await getSignedUrl(this.s3Client, command, { expiresIn });

      return {
        url,
        expiresIn,
      };
    } catch (error) {
      if (error instanceof S3ServiceException) {
        throw new NotFoundException(
          `Fichier non trouvé sur S3: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        );
      }
      throw error;
    }
  }

  /**
   * Télécharge un document depuis S3 et le stocke dans un répertoire temporaire
   * @param s3Path Chemin du document dans S3
   * @param tempDir Répertoire temporaire où stocker le document
   * @returns Chemin du fichier téléchargé
   */
  private async downloadDocumentFromS3(
    s3Path: string,
    tempDir: string,
  ): Promise<string> {
    // Créer le répertoire temporaire s'il n'existe pas
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Récupérer le nom du fichier à partir du chemin S3
    const fileName = path.basename(s3Path);
    const tempFilePath = path.join(tempDir, fileName);

    // Télécharger le fichier depuis S3
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: s3Path,
    });

    const response = await this.s3Client.send(command);

    // Écrire le contenu dans un fichier temporaire
    const writeStream = fs.createWriteStream(tempFilePath);
    const readStream = Readable.from(
      response.Body as unknown as Uint8Array | Buffer | string,
    );

    await finished(readStream.pipe(writeStream));

    return tempFilePath;
  }

  /**
   * Convertit un document en PDF si nécessaire (pour les fichiers docx)
   * @param filePath Chemin du fichier à convertir
   * @returns Chemin du fichier PDF (soit le même si c'était déjà un PDF, soit le nouveau)
   */
  private async convertToPdfIfNeeded(filePath: string): Promise<string> {
    const fileExt = path.extname(filePath).toLowerCase();

    // Si c'est déjà un PDF, retourner le chemin tel quel
    if (fileExt.toLowerCase() === '.pdf') {
      return filePath;
    }

    // Si c'est un docx, le convertir en PDF
    if (fileExt === '.docx' || fileExt === '.doc') {
      const outputPath = filePath.replace(/\.(docx|doc)$/i, '.pdf');

      // Utiliser LibreOffice pour convertir le document
      const exec = promisify(execCallback);
      const command = `libreoffice --headless --convert-to pdf --outdir "${path.dirname(filePath)}" "${filePath}"`;

      try {
        await exec(command);
        return outputPath;
      } catch (error) {
        this.logger.error('Erreur lors de la conversion du document:', error);
        throw new Error(
          `Échec de la conversion du document: ${(error as Error).message}`,
        );
      }
    }

    // Pour les autres types de fichiers, lever une erreur
    throw new Error(`Type de fichier non pris en charge: ${fileExt}`);
  }

  /**
   * Extrait le texte d'un fichier PDF en le divisant par page
   * @param pdfPath Chemin vers le fichier PDF
   * @returns Tableau d'objets contenant le texte et le numéro de page
   */
  private async extractTextFromPdf(
    pdfPath: string,
    projectId: string,
    fileName: string,
  ): Promise<Array<{ text: string; page: number }>> {
    const exec = promisify(execCallback);
    const tempDir = path.dirname(pdfPath);
    const tempOutputPath = path.join(tempDir, 'temp_page.txt');

    try {
      // Obtenir le nombre total de pages du PDF
      const pdfInfoCommand = `pdfinfo "${pdfPath}"`;
      const { stdout: pdfInfoOutput } = await exec(pdfInfoCommand);

      // Extraire le nombre de pages à partir de la sortie de pdfinfo
      const pagesMatch = pdfInfoOutput.match(/Pages:\s+(\d+)/);
      if (!pagesMatch) {
        throw new Error('Impossible de déterminer le nombre de pages du PDF');
      }

      const totalPages = parseInt(pagesMatch[1], 10);

      this.logger.log(`Nombre de pages du PDF: ${totalPages}`);

      // Vérifier si le PDF est OCRisé en examinant plusieurs pages
      // Nous vérifierons la première page, une page au milieu et la dernière page
      const pagesToCheck = [
        1, // Première page
        Math.ceil(totalPages / 2), // Page du milieu
        totalPages > 2 ? totalPages : 1, // Dernière page (si différente de la première)
      ].filter((v, i, a) => a.indexOf(v) === i); // Éliminer les doublons

      let isOcred = false;
      let ocrCheckCount = 0;

      for (const pageNum of pagesToCheck) {
        const checkOcrCommand = `pdftotext -f ${pageNum} -l ${pageNum} "${pdfPath}" "${tempOutputPath}"`;
        await exec(checkOcrCommand);

        if (fs.existsSync(tempOutputPath)) {
          const sampleText = fs.readFileSync(tempOutputPath, 'utf8');
          // Si le texte extrait est significatif (plus de 50 caractères non-espace), considérer que la page est OCRisée
          const pageHasText = sampleText.trim().replace(/\s+/g, '').length > 50;

          if (pageHasText) {
            ocrCheckCount++;
          }

          fs.unlinkSync(tempOutputPath);
        }
      }

      // On considère le document comme OCRisé si au moins 2/3 des pages vérifiées contiennent du texte
      isOcred = ocrCheckCount >= Math.ceil(pagesToCheck.length * 0.66);

      this.logger.log(
        `${fileName} est ${isOcred ? 'OCRisé' : 'non OCRisé'} (${ocrCheckCount}/${pagesToCheck.length} pages contiennent du texte)`,
      );

      // Si le document n'est pas OCRisé, traitement alternatif
      if (!isOcred) {
        const results = await this.processNonOcrPdf(projectId, fileName);
        return results;
      }

      // Tableau pour stocker les résultats
      const results: Array<{ text: string; page: number }> = [];

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
    } catch (error) {
      this.logger.error("Erreur lors de l'extraction du texte:", error);
      // Nettoyer le fichier temporaire en cas d'erreur
      if (fs.existsSync(tempOutputPath)) {
        fs.unlinkSync(tempOutputPath);
      }
      throw new Error(
        `Échec de l'extraction du texte: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Traite un PDF non OCRisé en utilisant Mistral OCR via Vercel AI SDK
   * Cette méthode envoie chaque page du PDF à Mistral pour OCRisation
   * @param pdfPath Chemin vers le fichier PDF
   * @param totalPages Nombre total de pages
   * @returns Tableau d'objets contenant le texte OCRisé et le numéro de page
   */
  private async processNonOcrPdf(
    projectId: string,
    fileName: string,
  ): Promise<Array<{ text: string; page: number }>> {
    const results: Array<{ text: string; page: number }> = [];

    try {
      const mistralApiKey = this.configService.get<string>('MISTRAL_API_KEY');
      if (!mistralApiKey) {
        throw new Error("La clé API Mistral n'est pas configurée");
      }

      const presignedUrl = await this.storageService.getPresignedUrl(
        projectId,
        fileName,
      );

      const client = new Mistral({ apiKey: mistralApiKey });

      const ocrResponse = await client.ocr.process({
        model: 'mistral-ocr-latest',
        document: {
          type: 'document_url',
          documentUrl: presignedUrl.url,
        },
        includeImageBase64: true,
      });

      ocrResponse.pages.forEach((page, index) => {
        results.push({
          text: page.markdown,
          page: index + 1,
        });
      });

      return results;
    } catch (error) {
      this.logger.error(`Erreur globale durant le processus OCR:`, error);

      return results;
    }
  }

  /**
   * Divise le texte en chunks de taille fixe, indépendamment des limites de page
   * @param pageTexts Tableau d'objets contenant le texte et le numéro de page
   * @param chunkSize Taille maximale de chaque chunk en caractères
   * @returns Tableau d'objets contenant le texte du chunk et le numéro de page où commence le chunk
   */
  private chunkText(
    pageTexts: Array<{ text: string; page: number }>,
    chunkSize: number,
  ): Array<{ text: string; page: number }> {
    const chunks: Array<{ text: string; page: number }> = [];

    // Concaténer tout le texte avec des informations sur la page d'origine
    const textWithPageInfo: Array<{ text: string; page: number }> = [];

    // Diviser chaque page en paragraphes et conserver l'information de page
    for (const pageData of pageTexts) {
      const { text, page } = pageData;

      // Diviser le texte en paragraphes
      const paragraphs = text
        .split(/\n\s*\n/)
        .filter((p) => p.trim().length > 0);

      // Ajouter chaque paragraphe avec son numéro de page
      for (const paragraph of paragraphs) {
        textWithPageInfo.push({ text: paragraph, page });
      }
    }

    // Maintenant, créer des chunks de taille fixe
    let currentChunk = '';
    let currentPage =
      textWithPageInfo.length > 0 ? textWithPageInfo[0].page : 1;
    let paragraphIndex = 0;

    while (paragraphIndex < textWithPageInfo.length) {
      const { text, page } = textWithPageInfo[paragraphIndex];

      // Si nous commençons un nouveau chunk, enregistrer la page actuelle
      if (currentChunk.length === 0) {
        currentPage = page;
      }

      // Si le paragraphe est plus grand que la taille de chunk, le diviser
      if (text.length > chunkSize) {
        // Ajouter le chunk courant s'il n'est pas vide
        if (currentChunk) {
          chunks.push({ text: currentChunk, page: currentPage });
          currentChunk = '';
        }

        // Diviser le paragraphe en chunks de taille fixe
        let i = 0;
        while (i < text.length) {
          const chunkText = text.substring(i, i + chunkSize);
          // Si c'est le premier morceau du paragraphe, utiliser la page du paragraphe
          // Sinon, continuer à utiliser la même page pour les morceaux suivants
          chunks.push({
            text: chunkText,
            page,
          });
          i += chunkSize;
        }
      }
      // Si ajouter ce paragraphe dépasse la taille du chunk, créer un nouveau chunk
      else if (
        currentChunk.length + text.length + (currentChunk ? 2 : 0) >
        chunkSize
      ) {
        chunks.push({ text: currentChunk, page: currentPage });
        currentChunk = text;
        currentPage = page;
      }
      // Sinon, ajouter le paragraphe au chunk courant
      else {
        if (currentChunk) {
          currentChunk += '\n\n';
        }
        currentChunk += text;
      }

      paragraphIndex++;
    }

    // Ajouter le dernier chunk s'il n'est pas vide
    if (currentChunk) {
      chunks.push({ text: currentChunk, page: currentPage });
    }

    this.logger.log(
      `Créé ${chunks.length} chunks à partir de ${pageTexts.length} pages`,
    );
    return chunks;
  }

  /**
   * Nettoie les fichiers temporaires
   * @param tempDir Répertoire temporaire à nettoyer
   */
  private async cleanupTempFiles(tempDir: string) {
    if (fs.existsSync(tempDir)) {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    }
  }

  /**
   * Récupère les métadonnées AI d'un document
   * @param projectId ID du projet
   * @param fileName Nom du fichier
   * @param organizationId ID de l'organisation
   * @returns Les métadonnées AI du document
   * @throws NotFoundException si le document n'est pas trouvé
   * @throws ForbiddenException si le document n'appartient pas à l'organisation
   */
  async getDocumentMetadata(
    projectId: string,
    fileName: string,
    organizationId: string,
  ) {
    // Vérifier si le projet existe et appartient à l'organisation
    await this.checkProjectAccess(projectId, organizationId);

    if (!process.env.AWS_S3_BUCKET) {
      throw new Error('BUCKET_PATH is not defined');
    }

    // Construire le chemin du fichier sur S3
    const filePath = `${process.env.AWS_S3_BUCKET}${projectId}/${fileName}`;

    // Rechercher le document dans la base de données via le repository
    const document = await this.documentsRepository.findByFilenameAndProject(
      projectId,
      fileName,
      filePath,
    );

    if (!document) {
      throw new NotFoundException(`Document non trouvé`);
    }

    return document.ai_metadata;
  }

  /**
   * Confirme l'upload de plusieurs fichiers sur S3 et crée des documents dans la base de données
   * Permet jusqu'à 5 processus d'indexation en parallèle, au-delà les requêtes sont mises en attente
   * @param dto Informations sur les fichiers uploadés
   * @param organizationId ID de l'organisation qui fait la demande
   * @returns Les documents créés
   */
  async confirmMultipleUploads(
    dto: ConfirmMultipleUploadsDto,
    organizationId: string,
  ) {
    // Enregistrer le temps de début
    const startTime = Date.now();

    this.logger.log(
      `[${dto.projectId}] Confirmation de l'upload. Début du processus d'indexation... StartTime : ${startTime}`,
    );

    this.logger.log(`DTO reçu : ${JSON.stringify(dto)}`);

    // Vérifier si le projet existe et appartient à l'organisation via le repository
    const project =
      await this.documentsRepository.findProjectByIdAndOrganization(
        dto.projectId,
        organizationId,
      );

    if (!project) {
      throw new NotFoundException(
        "Projet non trouvé ou n'appartient pas à votre organisation",
      );
    }

    try {
      // Créer un nouvel identifiant unique pour cette tâche d'indexation
      const indexationId = `${dto.projectId}_${Date.now()}`;
      this.logger.log(
        `Nouvelle demande d'indexation: ${indexationId} (${dto.downloadUrls.length} fichiers)`,
      );

      // Vérifier si nous pouvons démarrer immédiatement ou s'il faut mettre en attente
      const canStartImmediately =
        DocumentsService.activeIndexations <
        DocumentsService.maxConcurrentIndexations;
      const queuePosition =
        DocumentsService.indexationQueue.length + (canStartImmediately ? 0 : 1);

      // Créer une promesse qui représente cette tâche d'indexation
      const indexationTask = new Promise<{ status: string; message?: string }>(
        (resolve, reject) => {
          // Fonction interne asynchrone
          const downloadAndSaveAndReadDocumentsBeforeIndexation = async () => {
            try {
              // Attendre qu'il y ait de la place dans la limite de concurrence
              while (
                DocumentsService.activeIndexations >=
                DocumentsService.maxConcurrentIndexations
              ) {
                // Attendre un peu avant de vérifier à nouveau
                this.logger.log(
                  `[${indexationId}] En attente d'une place dans la queue (${DocumentsService.activeIndexations}/${DocumentsService.maxConcurrentIndexations} actifs)`,
                );
                await new Promise((r) => setTimeout(r, 1000));
              }

              // Démarrer l'indexation
              DocumentsService.activeIndexations++;
              this.logger.log(
                `[${indexationId}] Démarrage de l'indexation (${DocumentsService.activeIndexations}/${DocumentsService.maxConcurrentIndexations} actifs)`,
              );

              try {
                // Traiter tous les fichiers en parallèle pour créer les documents et télécharger les fichiers
                const documentPromises = dto.downloadUrls.map(
                  async (downloadUrl) => {
                    try {
                      const document = await this.create({
                        filename: '',
                        path: '',
                        mimetype: '',
                        size: 0,
                        projectId: dto.projectId,
                      });

                      const response = await fetch(downloadUrl);

                      if (!response.ok) {
                        await this.updateStatus(
                          document.id,
                          'ERROR',
                          'ERROR',
                          dto.documentWebhookUrl ? dto.documentWebhookUrl : '',
                          404,
                          'Impossible de télécharger le document',
                          'Impossible de télécharger le document',
                        );
                        return null;
                      }

                      // Extraire le nom du fichier depuis les headers ou l'URL
                      let fileName: string;
                      const contentDisposition = response.headers.get(
                        'content-disposition',
                      );
                      if (contentDisposition) {
                        const matches =
                          /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(
                            contentDisposition,
                          );
                        if (matches != null && matches[1]) {
                          fileName = matches[1].replace(/['"]/g, '');
                        }
                      }

                      // Si pas de nom dans les headers, essayer de l'extraire de l'URL
                      if (!fileName) {
                        const url = new URL(downloadUrl);
                        const pathSegments = url.pathname.split('/');
                        fileName = decodeURIComponent(
                          pathSegments[pathSegments.length - 1],
                        );
                      }

                      // Si toujours pas de nom, générer un nom unique
                      if (!fileName) {
                        const timestamp = Date.now();
                        const random = Math.random()
                          .toString(36)
                          .substring(2, 8);
                        fileName = `document_${timestamp}_${random}`;
                      }

                      // Construire le chemin du fichier sur S3
                      if (!process.env.AWS_S3_BUCKET) {
                        await this.updateStatus(
                          document.id,
                          'ERROR',
                          'ERROR',
                          dto.documentWebhookUrl ? dto.documentWebhookUrl : '',
                          500,
                          'BUCKET_PATH is not defined',
                          'BUCKET_PATH is not defined',
                        );
                        return null;
                      }

                      const filePath = `${process.env.AWS_S3_BUCKET}${dto.projectId}/${fileName}`;

                      // Vérifier si le fichier existe déjà sur S3
                      try {
                        const headObjectCommand = new HeadObjectCommand({
                          Bucket: this.bucketName,
                          Key: filePath,
                        });

                        this.logger.log(
                          `Vérification de l'existence du fichier ${fileName} sur S3`,
                        );
                        await this.s3Client.send(headObjectCommand);
                        this.logger.log(
                          `Le fichier ${fileName} existe déjà sur S3`,
                        );
                      } catch (error) {
                        if (
                          error instanceof S3ServiceException &&
                          error.name === 'NotFound'
                        ) {
                          // Le fichier n'existe pas sur S3, on va l'uploader
                          this.logger.log(
                            `Le fichier ${fileName} n'existe pas sur S3, on va l'uploader`,
                          );
                          this.logger.log(
                            `Upload du fichier ${fileName} sur S3`,
                          );

                          const fileBuffer = await response.arrayBuffer();

                          // Uploader le fichier sur S3
                          const uploadCommand = new PutObjectCommand({
                            Bucket: this.bucketName,
                            Key: filePath,
                            Body: Buffer.from(fileBuffer),
                            ContentType:
                              response.headers.get('content-type') ||
                              this.getMimetype(fileName),
                          });

                          await this.s3Client.send(uploadCommand);
                          this.logger.log(
                            `Fichier ${fileName} uploadé avec succès sur S3`,
                          );
                        } else {
                          await this.updateStatus(
                            document.id,
                            'ERROR',
                            'ERROR',
                            dto.documentWebhookUrl
                              ? dto.documentWebhookUrl
                              : '',
                            500,
                            "Erreur lors de l'upload du fichier sur S3",
                            "Erreur lors de l'upload du fichier sur S3",
                          );
                          return null;
                        }
                      }

                      // Mettre à jour le document dans la base de données
                      const documentUpdated = await this.update(document.id, {
                        filename: fileName,
                        path: filePath,
                        mimetype: this.getMimetype(fileName),
                        size: 0,
                        projectId: dto.projectId,
                        status: Status.PENDING,
                      });

                      // Télécharger et extraire le texte seulement pour PDF ou DOCX
                      try {
                        const fileExt = path.extname(fileName).toLowerCase();
                        if (
                          fileExt.toLowerCase() === '.pdf' ||
                          fileExt.toLowerCase() === '.docx' ||
                          fileExt.toLowerCase() === '.doc'
                        ) {
                          // Télécharger le document depuis S3
                          const tempDir = `/tmp/document-processing/${documentUpdated.id}`;
                          const tempFilePath =
                            await this.downloadDocumentFromS3(
                              filePath,
                              tempDir,
                            );

                          // Convertir le document si nécessaire
                          let pdfFilePath: string;
                          try {
                            pdfFilePath =
                              await this.convertToPdfIfNeeded(tempFilePath);
                          } catch {
                            await this.updateStatus(
                              documentUpdated.id,
                              'ERROR',
                              'ERROR',
                              dto.documentWebhookUrl
                                ? dto.documentWebhookUrl
                                : '',
                              500,
                              'Erreur lors de la conversion du document en PDF',
                              'Erreur lors de la conversion du document en PDF',
                            );
                            return null;
                          }

                          // Extraire le texte du PDF
                          let extractedText: Array<{
                            text: string;
                            page: number;
                          }>;
                          try {
                            extractedText = await this.extractTextFromPdf(
                              pdfFilePath,
                              dto.projectId,
                              fileName,
                            );
                          } catch {
                            await this.updateStatus(
                              documentUpdated.id,
                              'ERROR',
                              'ERROR',
                              dto.documentWebhookUrl
                                ? dto.documentWebhookUrl
                                : '',
                              500,
                              "Erreur lors de l'extraction du texte du document",
                              "Erreur lors de l'extraction du texte du document",
                            );
                            return null;
                          }

                          // Extraire les métadonnées du PDF
                          let metadata: {
                            author: string;
                            title: string;
                            subject: string;
                            keywords: string;
                            fileSize: number;
                          };
                          try {
                            metadata =
                              await this.extractPdfMetadata(pdfFilePath);
                          } catch {
                            await this.updateStatus(
                              documentUpdated.id,
                              'ERROR',
                              'ERROR',
                              dto.documentWebhookUrl
                                ? dto.documentWebhookUrl
                                : '',
                              500,
                              "Erreur lors de l'extraction des métadonnées du document",
                              "Erreur lors de l'extraction des métadonnées du document",
                            );
                            return null;
                          }

                          const numPages = extractedText.length;

                          await this.documentsRepository.update(
                            documentUpdated.id,
                            {
                              metadata_numPages: numPages,
                              metadata_author: metadata.author || '',
                              size: metadata.fileSize,
                            },
                          );

                          // Nettoyer les fichiers temporaires après extraction
                          await this.cleanupTempFiles(tempDir);

                          return {
                            document,
                            text: extractedText
                              .map(
                                (pt, index) =>
                                  `-------------- Page Selector ${index + 1} --------------\n\n${pt.text}\n\n`,
                              )
                              .join('\n'),
                            extractedTextPerPage: extractedText,
                          };
                        } else {
                          throw new BadRequestException(
                            "Le fichier n'est pas géré par Documate",
                          );
                        }
                      } catch (error) {
                        this.logger.error(
                          `Erreur lors du traitement du fichier ${downloadUrl}:`,
                          error,
                        );
                        if (documentUpdated && documentUpdated.id) {
                          await this.updateStatus(
                            documentUpdated.id,
                            'ERROR',
                            'ERROR',
                            dto.documentWebhookUrl
                              ? dto.documentWebhookUrl
                              : '',
                            424,
                            'Extension de fichier non supportée.',
                            'Extension de fichier non supportée.',
                          );
                        }
                        return {
                          document: null,
                          text: '',
                          extractedTextPerPage: [],
                        };
                      }
                    } catch (error) {
                      this.logger.error(
                        `Erreur lors du traitement du fichier ${downloadUrl}:`,
                        error,
                      );
                    }
                  },
                );

                // Attendre que tous les documents soient créés et que le texte soit extrait
                const documentsWithText = await Promise.all(documentPromises);

                // Préparer les données pour n8n
                const filteredDocuments = documentsWithText.map((doc) => ({
                  documentId: doc.document !== null && doc.document.id,
                  name: doc.document !== null && doc.document.filename,
                  text: doc.text || '',
                }));

                this.logger.log(
                  `[${indexationId}] Démarrage des processus en parallèle pour ${filteredDocuments.length} documents: requête n8n et indexation des documents`,
                );

                //******************************************************//
                // Requête n8n pour l'extraction du projet              //
                //******************************************************//

                // Créer une promesse pour la requête projet sur n8n
                const n8nProjectExtraction = (async () => {
                  try {
                    this.logger.log(
                      `[${indexationId}] Envoi des données du projet à n8n...`,
                    );

                    // S'assurer qu'il y a au moins un document
                    if (filteredDocuments.length === 0) {
                      this.logger.warn(
                        `[${indexationId}] Aucun document à envoyer au webhook du projet`,
                      );
                      return {
                        success: false,
                        reason: 'no_documents',
                      };
                    }

                    const text = filteredDocuments
                      .map(
                        (doc) =>
                          `##########################################\n${doc.name}\n\n${doc.text}\n\n`,
                      )
                      .join('');

                    const payload = JSON.stringify({
                      projectId: dto.projectId,
                      text: text,
                      webhookUrl: dto.projectWebhookUrl,
                      environment:
                        (process.env.N8N_ENVIRONMENT as
                          | 'staging'
                          | 'preprod'
                          | 'prod') || 'staging',
                    });

                    const n8nWebhookUrl =
                      this.configService.get<string>('N8N_WEBHOOK_URL');

                    if (!n8nWebhookUrl) {
                      this.logger.warn(
                        `[${indexationId}] N8N_WEBHOOK_URL is not defined in environment variables`,
                      );
                      await this.projectsService.updateStatus(
                        dto.projectId,
                        Status.ERROR,
                        `N8N_WEBHOOK_URL is not defined in environment variables.`,
                        '426',
                        dto.projectWebhookUrl ? dto.projectWebhookUrl : null,
                      );
                      return {
                        success: false,
                        reason: 'webhook_url_missing',
                      };
                    }

                    const webhookUrl = `${n8nWebhookUrl}/documate`;

                    try {
                      await this.projectsService.updateStatus(
                        dto.projectId,
                        Status.PROGRESS,
                        `Projet envoyé à n8n. Extraction en cours...`,
                        '200',
                        dto.projectWebhookUrl ? dto.projectWebhookUrl : null,
                      );

                      await fetch(webhookUrl, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: payload,
                      });
                    } catch (error) {
                      this.logger.error(
                        `${error} - [${indexationId}] Error sending project data to n8n webhook.`,
                      );

                      await this.projectsService.updateStatus(
                        dto.projectId,
                        Status.ERROR,
                        `Erreur lors de l'envoi du projet à n8n.`,
                        '425',
                        dto.projectWebhookUrl ? dto.projectWebhookUrl : null,
                      );

                      return {
                        success: false,
                        reason: 'exception',
                        error:
                          error instanceof Error
                            ? error.message
                            : String(error),
                      };
                    }
                  } catch (error) {
                    this.logger.error(
                      `[${indexationId}] Error sending project data to n8n webhook:`,
                      error,
                    );

                    await this.projectsService.updateStatus(
                      dto.projectId,
                      Status.ERROR,
                      `Erreur lors de l'envoi du projet à n8n.`,
                      '426',
                      dto.projectWebhookUrl ? dto.projectWebhookUrl : null,
                    );

                    return {
                      success: false,
                      reason: 'exception',
                      error:
                        error instanceof Error ? error.message : String(error),
                    };
                  }
                })();

                // Créer une promesse pour les requetes d'extraction de documents sur n8n
                const n8nExtractionPromises = filteredDocuments.map(
                  async (document) => {
                    try {
                      // Préparer le payload pour ce document spécifique
                      const payload = JSON.stringify({
                        documentId: document.documentId,
                        name: document.name,
                        text: document.text,
                        webhookUrl: dto.documentWebhookUrl,
                        environment:
                          (process.env.N8N_ENVIRONMENT as
                            | 'staging'
                            | 'preprod'
                            | 'prod') || 'staging',
                      });

                      const n8nWebhookUrl =
                        this.configService.get<string>('N8N_WEBHOOK_URL');

                      if (!n8nWebhookUrl) {
                        this.logger.warn(
                          `[${indexationId}] N8N_WEBHOOK_URL is not defined in environment variables`,
                        );
                        return {
                          success: false,
                          reason: 'webhook_url_missing',
                          document: document.name,
                        };
                      }

                      this.logger.log(
                        `[${indexationId}] Sending document ${document.name} to n8n webhook...`,
                      );

                      const webhookUrl = `${n8nWebhookUrl}/index-process`;

                      this.logger.log(`Webhook URL: ${webhookUrl}`);

                      this.logger.log(
                        `[${indexationId}] Envoi du document ${document.name} à n8n webhook : [${webhookUrl}]`,
                      );

                      // Envoyer la requête n8n pour ce document avec fetch (natif)
                      await fetch(webhookUrl, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: payload,
                      });
                    } catch (error) {
                      this.logger.error(
                        `[${indexationId}] Error de catch externe - Webhook non atteint pour ${document.name}:`,
                        error,
                      );

                      await this.updateStatus(
                        document.documentId,
                        'ERROR',
                        null,
                        dto.documentWebhookUrl ? dto.documentWebhookUrl : '',
                        425,
                        `Erreur lors de l'envoi du document à n8n en arrière plan.`,
                      );

                      return {
                        success: false,
                        reason: 'exception_externe',
                        error:
                          error instanceof Error
                            ? error.message
                            : String(error),
                        document: document.name,
                      };
                    }
                  },
                );

                // Créer une promesse pour l'indexation des documents
                const indexationPromise = (async () => {
                  try {
                    this.logger.log(
                      `[${indexationId}] Début du processus d'indexation des documents...`,
                    );
                    await this.processDocumentsInBackground(
                      documentsWithText,
                      dto.documentWebhookUrl ? dto.documentWebhookUrl : null,
                    );
                    this.logger.log(
                      `[${indexationId}] Indexation des documents terminée avec succès`,
                    );
                    return { success: true };
                  } catch (error) {
                    this.logger.error(
                      `[${indexationId}] Erreur lors de l'indexation des documents:`,
                      error,
                    );
                    return {
                      success: false,
                      error:
                        error instanceof Error ? error.message : String(error),
                    };
                  }
                })();

                // Attendre que les trois processus soient terminés
                const [indexationResult] = await Promise.all([
                  indexationPromise,
                  n8nProjectExtraction,
                  Promise.all(n8nExtractionPromises),
                ]);

                if (!indexationResult.success) {
                  this.logger.error(
                    `[${indexationId}] L'indexation a échoué: ${indexationResult.error || 'erreur inconnue'}`,
                  );
                }

                // Calculer le temps d'exécution
                const endTime = Date.now();
                const executionTimeMs = endTime - startTime;
                const executionTimeSec = (executionTimeMs / 1000).toFixed(2);

                this.logger.log(
                  `[${indexationId}] Fin d'exécution => temps d'exécution: ${executionTimeMs}ms (${executionTimeSec}s)`,
                );

                // Résoudre la promesse avec le résultat
                resolve({ status: 'OK' });
              } finally {
                // Réduire le compteur d'indexations actives
                DocumentsService.activeIndexations--;
                this.logger.log(
                  `[${indexationId}] Fin de l'indexation (${DocumentsService.activeIndexations}/${DocumentsService.maxConcurrentIndexations} actifs)`,
                );

                // Retirer cette tâche de la file d'attente
                const taskIndex =
                  DocumentsService.indexationQueue.indexOf(indexationTask);
                if (taskIndex !== -1) {
                  void DocumentsService.indexationQueue.splice(taskIndex, 1);
                }
              }
            } catch (error) {
              this.logger.error(
                `[${indexationId}] Erreur critique lors de l'indexation:`,
                error,
              );
              // En cas d'erreur, réduire le compteur
              DocumentsService.activeIndexations = Math.max(
                0,
                DocumentsService.activeIndexations - 1,
              );

              // Retirer cette tâche de la file d'attente
              const taskIndex =
                DocumentsService.indexationQueue.indexOf(indexationTask);
              if (taskIndex !== -1) {
                void DocumentsService.indexationQueue.splice(taskIndex, 1);
              }

              // S'assurer que l'erreur est une instance d'Error
              const errorToReject =
                error instanceof Error
                  ? error
                  : new Error(
                      typeof error === 'string' ? error : 'Erreur inconnue',
                    );

              reject(errorToReject);
            }
          };

          void downloadAndSaveAndReadDocumentsBeforeIndexation();
        },
      );

      // Ajouter la tâche à la file d'attente
      void DocumentsService.indexationQueue.push(indexationTask);

      // Indiquer à l'utilisateur que sa demande a été prise en compte
      const queueMessage = canStartImmediately
        ? 'Traitement démarré immédiatement'
        : `En attente, position ${queuePosition} dans la file d'attente`;

      await this.projectsService.updateStatus(
        dto.projectId,
        Status.PROGRESS,
        queueMessage,
        '200',
        dto.projectWebhookUrl ? dto.projectWebhookUrl : null,
      );
    } catch (error) {
      // Calculer le temps d'exécution même en cas d'erreur
      const endTime = Date.now();
      const executionTimeMs = endTime - startTime;
      const executionTimeSec = (executionTimeMs / 1000).toFixed(2);

      this.logger.log(
        `Temps d'exécution de confirmMultipleUploads (avec erreur): ${executionTimeMs}ms (${executionTimeSec}s)`,
      );

      throw new BadRequestException(
        `Erreur lors de la confirmation des uploads: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      );
    }
  }

  /**
   * Traite les documents en arrière-plan (création des chunks et vectorisation)
   * @param documentsWithText Documents avec leur texte extrait
   */
  private async processDocumentsInBackground(
    documentsWithText: Array<{
      document: {
        id: string;
        projectId: string;
        filename: string;
        [key: string]: any;
      };
      text: string;
      extractedTextPerPage: Array<{ text: string; page: number }>;
    }>,
    webhookUrl: string | null,
  ): Promise<void> {
    // Traiter chaque document séquentiellement pour éviter de surcharger la base de données

    const documentsWithTextFiltered = documentsWithText.filter(
      (doc) => doc.document !== null,
    );

    for (const docData of documentsWithTextFiltered) {
      const { document, extractedTextPerPage } = docData;
      try {
        const startTime = Date.now();

        await this.updateStatus(
          document.id,
          null,
          'PROGRESS',
          webhookUrl ? webhookUrl : '',
          200,
          null,
          'Indexation en cours...',
        );

        if (extractedTextPerPage.length === 0) {
          continue; // Ignorer les documents sans texte extrait
        }

        // Appliquer le chunking avec une taille fixe de 1000 caractères
        const chunks = this.chunkText(extractedTextPerPage, 1000);

        // Créer les chunks et les embeddings
        try {
          await this.createChunksWithEmbeddings(
            chunks,
            document.id,
            document.projectId,
          );

          // Calculer la durée d'indexation
          const endTime = Date.now();
          const durationInSeconds = (endTime - startTime) / 1000;

          // Mettre à jour le document avec la durée d'indexation
          await this.documentsRepository.update(document.id, {
            indexation_duration_in_seconds: durationInSeconds,
          });

          await this.updateStatus(
            document.id,
            null,
            'COMPLETED',
            webhookUrl ? webhookUrl : '',
            200,
            null,
            `Indexation terminée pour le document en ${durationInSeconds} secondes`,
          );

          this.logger.log(
            `Indexation terminée pour le document ${document.id} en ${durationInSeconds} secondes`,
          );
        } catch (e) {
          this.logger.error(
            `Erreur lors de la création des chunks et embeddings pour le document ${document.id}:`,
            e,
          );
          throw e;
        }
      } catch (error) {
        this.logger.error(
          `Erreur lors du traitement du document ${docData.document.id}:`,
          error,
        );
        // En cas d'erreur, mettre à jour le statut du document à END
        if (docData.document && docData.document.id) {
          await this.updateStatus(
            docData.document.id,
            null,
            'ERROR',
            webhookUrl ? webhookUrl : '',
            500,
            null,
            `Erreur lors de l'indexation du document ${document.id} dans la fonction processDocumentsInBackground`,
          );
        }
      }
    }
  }

  /**
   * Récupère un document par son nom de fichier et l'ID du projet
   * @param projectId ID du projet
   * @param fileName Nom du fichier
   * @returns Le document trouvé ou null si aucun document ne correspond
   */
  async findByProjectIdAndFileName(projectId: string, fileName: string) {
    // Utiliser le repository pour cette recherche
    return this.documentsRepository.findByProjectIdAndFileName(
      projectId,
      fileName,
    );
  }

  /**
   * Récupère le mimetype d'un fichier à partir de son chemin
   * @param filePath Chemin du fichier
   * @returns Le mimetype du fichier
   */
  private getMimetype(filePath: string): string {
    // Déterminer le mimetype en fonction de l'extension du fichier
    const ext = path.extname(filePath).toLowerCase();

    // Mapper les extensions courantes à leurs mimetypes
    switch (ext) {
      case '.pdf':
        return 'application/pdf';
      case '.docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case '.doc':
        return 'application/msword';
      case '.xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case '.xls':
        return 'application/vnd.ms-excel';
      case '.pptx':
        return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      case '.ppt':
        return 'application/vnd.ms-powerpoint';
      case '.txt':
        return 'text/plain';
      case '.csv':
        return 'text/csv';
      case '.json':
        return 'application/json';
      case '.xml':
        return 'application/xml';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * Nettoie le texte pour le rendre compatible avec l'API d'embeddings d'OpenAI
   * Supprime les caractères problématiques et formate le texte pour éviter les erreurs 400
   * @param text Texte à nettoyer
   * @returns Texte nettoyé
   */
  private cleanTextForEmbedding(text: string): string {
    if (!text) return '';

    // Remplacer les retours à la ligne par des espaces
    let cleaned = text.replace(/\n/g, ' ');

    // Supprimer les espaces multiples
    cleaned = cleaned.replace(/\s+/g, ' ');

    // Supprimer les caractères de contrôle (en utilisant une méthode différente pour éviter les erreurs)
    cleaned = cleaned
      .split('')
      .filter((char) => {
        const code = char.charCodeAt(0);
        return !(code <= 0x1f || (code >= 0x7f && code <= 0x9f));
      })
      .join('');

    // Supprimer les espaces en début et fin de chaîne
    cleaned = cleaned.trim();

    // Vérifier si le texte est trop long (OpenAI a une limite de tokens)
    // Une approximation grossière est de compter les caractères
    if (cleaned.length > 8000) {
      this.logger.warn(
        `Le texte a été tronqué car il dépasse 8000 caractères (longueur: ${cleaned.length})`,
      );
      cleaned = cleaned.substring(0, 8000);
    }

    return cleaned;
  }

  /**
   * Extrait les métadonnées d'un fichier PDF
   * @param pdfPath Chemin vers le fichier PDF
   * @returns Les métadonnées du PDF (auteur, titre, etc.)
   */
  private async extractPdfMetadata(pdfPath: string): Promise<{
    author: string;
    title: string;
    subject: string;
    keywords: string;
    fileSize: number;
  }> {
    const exec = promisify(execCallback);

    try {
      // Utiliser pdfinfo pour extraire les métadonnées
      const pdfInfoCommand = `pdfinfo "${pdfPath}"`;
      const { stdout: pdfInfoOutput } = await exec(pdfInfoCommand);

      // Extraire les différentes métadonnées
      const authorMatch = pdfInfoOutput.match(/Author:\s+(.*?)$/m);
      const titleMatch = pdfInfoOutput.match(/Title:\s+(.*?)$/m);
      const subjectMatch = pdfInfoOutput.match(/Subject:\s+(.*?)$/m);
      const keywordsMatch = pdfInfoOutput.match(/Keywords:\s+(.*?)$/m);

      // Obtenir la taille du fichier en octets
      const stats = fs.statSync(pdfPath);
      const fileSize = stats.size;

      return {
        author: authorMatch ? authorMatch[1].trim() : '',
        title: titleMatch ? titleMatch[1].trim() : '',
        subject: subjectMatch ? subjectMatch[1].trim() : '',
        keywords: keywordsMatch ? keywordsMatch[1].trim() : '',
        fileSize,
      };
    } catch (error) {
      this.logger.error("Erreur lors de l'extraction des métadonnées:", error);
      return {
        author: '',
        title: '',
        subject: '',
        keywords: '',
        fileSize: 0,
      };
    }
  }
}
