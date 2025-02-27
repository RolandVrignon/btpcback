import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { Prisma, Project, DocumentStatus } from '@prisma/client';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  HeadObjectCommand,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { ViewDocumentDto } from './dto/view-document.dto';
import { ViewDocumentResponseDto } from './dto/view-document-response.dto';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ChunksService } from '../chunks/chunks.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import * as util from 'util';
import { exec } from 'child_process';
import { rm } from 'fs/promises';

@Injectable()
export class DocumentsService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
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
    this.bucketName = this.configService.get<string>(
      'AWS_S3_BUCKET',
      'btpc-documents',
    );
  }

  async create(createDocumentDto: CreateDocumentDto) {
    // Vérifier si le projet existe
    const project = await this.prisma.project.findUnique({
      where: { id: createDocumentDto.projectId },
    });

    if (!project) {
      throw new NotFoundException('Projet non trouvé');
    }

    return await this.prisma.document.create({
      data: createDocumentDto,
      include: {
        project: true,
      },
    });
  }

  async findAll() {
    return await this.prisma.document.findMany({
      include: {
        project: true,
      },
    });
  }

  async findAllByOrganization(organizationId: string) {
    // Récupérer tous les projets de l'organisation
    const projects = await this.prisma.project.findMany({
      where: { organizationId },
      select: { id: true },
    });

    const projectIds = projects.map((project) => project.id);

    // Récupérer tous les documents des projets de l'organisation
    return await this.prisma.document.findMany({
      where: {
        projectId: {
          in: projectIds,
        },
      },
      include: {
        project: true,
      },
    });
  }

  async findOne(id: string, organizationId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document non trouvé');
    }

    // Vérifier si le document a un projet associé
    if (!document.project) {
      throw new NotFoundException('Projet associé au document non trouvé');
    }

    // Vérifier si le document appartient à l'organisation
    const project = document.project as Project & { organizationId: string };
    if (project.organizationId !== organizationId) {
      throw new ForbiddenException('Accès non autorisé à ce document');
    }

    return document;
  }

  async findByProject(projectId: string, organizationId: string) {
    // Vérifier si le projet existe et appartient à l'organisation
    await this.checkProjectAccess(projectId, organizationId);

    return await this.prisma.document.findMany({
      where: { projectId },
      include: {
        project: true,
      },
    });
  }

  async remove(id: string, organizationId: string) {
    // Vérifier si le document existe et appartient à l'organisation
    await this.findOne(id, organizationId);

    try {
      return await this.prisma.document.delete({
        where: { id },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Document non trouvé');
      }
      throw error;
    }
  }

  async checkProjectAccess(projectId: string, organizationId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        organization: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Projet non trouvé');
    }

    const projectWithOrg = project as Project & { organizationId: string };
    if (projectWithOrg.organizationId !== organizationId) {
      throw new ForbiddenException('Accès non autorisé à ce projet');
    }

    return project;
  }

  async update(
    id: string,
    updateData: UpdateDocumentDto,
    organizationId: string,
  ) {
    // Vérifier si le document existe et appartient à l'organisation
    await this.findOne(id, organizationId);

    try {
      return await this.prisma.document.update({
        where: { id },
        data: updateData,
        include: {
          project: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Document non trouvé');
      }
      throw error;
    }
  }

  /**
   * Confirme l'upload d'un fichier sur S3 et crée un document dans la base de données
   * @param dto Informations sur le fichier uploadé
   * @param organizationId ID de l'organisation qui fait la demande
   * @returns Le document créé
   * @throws NotFoundException si le projet n'existe pas ou si le fichier n'est pas trouvé sur S3
   * @throws ForbiddenException si le projet n'appartient pas à l'organisation
   * @throws BadRequestException si une erreur survient lors de la vérification du fichier
   */
  async confirmUpload(dto: ConfirmUploadDto, organizationId: string) {
    // Vérifier si le projet existe et appartient à l'organisation
    const project = await this.prisma.project.findFirst({
      where: {
        id: dto.projectId,
        organization: {
          id: organizationId,
        },
      },
    });

    if (!project) {
      throw new NotFoundException(
        "Projet non trouvé ou n'appartient pas à votre organisation",
      );
    }

    // Construire le chemin du fichier sur S3
    const filePath = `ct-toolbox/${dto.projectId}/${dto.fileName}`;
    console.log('filePath:', filePath);

    try {
      // Vérifier si le fichier existe sur S3
      const headObjectCommand = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: filePath,
      });

      await this.s3Client.send(headObjectCommand);

      // Si le fichier existe, créer un document dans la base de données
      const document = await this.prisma.document.create({
        data: {
          filename: dto.fileName,
          path: filePath,
          mimetype: 'application/octet-stream', // À déterminer en fonction du nom de fichier
          size: 0, // Taille inconnue à ce stade
          projectId: dto.projectId,
          status: 'NOT_STARTED', // Statut initial
        },
        include: {
          project: true,
        },
      });

      // Lancer le traitement du document en arrière-plan seulement pour PDF ou DOCX
      const fileExt = path.extname(dto.fileName).toLowerCase();
      if (fileExt === '.pdf' || fileExt === '.docx' || fileExt === '.doc') {
        void this.processDocumentAsync(document.id);
      }

      return document;
    } catch (error) {
      if (error instanceof S3ServiceException) {
        throw new BadRequestException(
          `Fichier non trouvé sur S3: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        );
      }
      throw error;
    }
  }

  /**
   * Traite un document de manière asynchrone en suivant les étapes:
   * 1. Téléchargement du document depuis S3
   * 2. Conversion si nécessaire (docx -> pdf)
   * 3. Extraction du texte
   * 4. Chunking du texte
   * 5. Création des chunks dans la base de données
   * 6. Vectorisation et création des embeddings
   * 7. Rafting - Extraire les informations importantes avec Gemini
   * 8. Mettre à jour le statut du document à READY
   * @param documentId ID du document à traiter
   */
  private async processDocumentAsync(documentId: string): Promise<void> {
    try {
      // Mettre à jour le statut du document à PROCESSING
      await this.updateDocumentStatus(documentId, 'INDEXING');

      // Récupérer les informations du document
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new NotFoundException(
          `Document avec l'ID ${documentId} non trouvé`,
        );
      }

      // Étape 1: Télécharger le document depuis S3
      const tempDir = `/tmp/document-processing/${documentId}`;
      const tempFilePath = await this.downloadDocumentFromS3(
        document.path,
        tempDir,
      );

      console.log('tempFilePath:', tempFilePath);

      // Étape 2: Convertir le document si nécessaire
      const pdfFilePath = await this.convertToPdfIfNeeded(tempFilePath);
      console.log('pdfFilePath:', pdfFilePath);

      // Étape 3: Extraire le texte du PDF
      const extractedText = await this.extractTextFromPdf(pdfFilePath);
      console.log('extractedText:', extractedText);

      // Étape 4: Chunker le texte
      const chunks = this.chunkText(extractedText, 1000);
      console.log('chunks:', chunks);

      // Étape 5: Créer les chunks dans la base de données
      const createdChunks = await this.createChunksInDatabase(
        chunks,
        documentId,
      );

      // Étape 6: Vectoriser et créer les embeddings
      await this.createEmbeddingsForChunks(createdChunks);

      // Étape 7: Rafting - Extraire les informations importantes avec Gemini
      await this.updateDocumentStatus(documentId, 'RAFTING');
      await this.extractDocumentInfoWithGemini(extractedText, documentId);

      // Mettre à jour le statut du document à READY
      await this.updateDocumentStatus(documentId, 'READY');

      // Nettoyer les fichiers temporaires
      await this.cleanupTempFiles(tempDir);
    } catch (error) {
      console.error(
        `Erreur lors du traitement du document ${documentId}:`,
        error,
      );
      // En cas d'erreur, mettre à jour le statut du document à END
      await this.updateDocumentStatus(documentId, 'END');
    }
  }

  /**
   * Extrait les informations importantes d'un document en utilisant Gemini
   * @param text Texte du document
   * @param documentId ID du document
   */
  private async extractDocumentInfoWithGemini(
    text: string,
    documentId: string,
  ): Promise<void> {
    try {
      // Récupérer la clé API Gemini
      const apiKey = this.configService.get<string>(
        'GOOGLE_GENERATIVE_AI_API_KEY',
      );
      if (!apiKey) {
        throw new Error("La clé API Gemini n'est pas configurée");
      }

      console.log(
        'Extraction des informations avec Gemini pour le document:',
        documentId,
      );

      // Limiter la taille du texte si nécessaire pour respecter les limites de Gemini
      const maxLength = 30000; // Ajuster selon les limites de l'API Gemini
      const truncatedText =
        text.length > maxLength ? text.substring(0, maxLength) : text;

      // Préparer le prompt pour Gemini
      const prompt = `
      Analyse le document suivant et extrait les informations importantes au format JSON.
      A toi de juger de l'importance de chaque information.
      Réponds uniquement avec un objet JSON valide sans aucun texte supplémentaire.

      Chaque information doit être présentée sous forme d'objet JSON :
      {
        "key": "", // Nom de la clé
        "value": "", // Valeur de la clé
      }

      Renvoie un tableau d'objets JSON.

      Exemple de réponse:
      [
        {
          "key": "Titre du document",
          "value": "Résumé du contenu"
        },
        {
          "key": "Auteur(s)",
          "value": "John Doe"
        }
        [...]
      ]

      Ne renvoie que le tableau d'objets JSON, rien d'autre.

      Document:

      ${truncatedText}
      `;

      // Utiliser le SDK AI de Google pour communiquer avec Gemini
      const { google } = await import('@ai-sdk/google');
      const { generateText } = await import('ai');

      // Configurer le modèle Gemini
      process.env.GOOGLE_API_KEY = apiKey;

      // Générer la réponse avec Gemini
      const { text: result, usage } = await generateText({
        model: google('gemini-1.5-pro'),
        prompt: prompt,
        temperature: 0.8,
      });

      console.log('usage:', usage);

      const responseText = result.toString();
      console.log('responseText:', responseText);
      const cleanedResponse = responseText.replace(/```json|```/g, '').trim();

      // Parser le JSON
      let documentInfo: Array<{
        key: string;
        value: string;
      }>;

      try {
        documentInfo = JSON.parse(cleanedResponse) as Array<{
          key: string;
          value: string;
        }>;
      } catch (parseError) {
        console.error('Erreur lors du parsing de la réponse JSON:', parseError);
        throw new Error("La réponse de Gemini n'est pas un JSON valide");
      }

      console.log('Informations extraites:', documentInfo);

      // Stocker les informations dans la base de données
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          ai_metadata: documentInfo,
        },
      });

      console.log('Informations du document enregistrées avec succès');
    } catch (error) {
      console.error(
        "Erreur lors de l'extraction des informations avec Gemini:",
        error,
      );
      // Ne pas propager l'erreur pour ne pas interrompre le processus global
    }
  }

  /**
   * Crée des embeddings pour une liste de chunks
   */
  private async createEmbeddingsForChunks(
    chunks: Array<{ id: string; text: string }>,
  ): Promise<void> {
    // Service pour créer les embeddings
    const embeddingsService = new EmbeddingsService(this.prisma);

    // Récupérer la clé API OpenAI
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error("La clé API OpenAI n'est pas configurée");
    }

    // Configurer le client OpenAI avec la clé API
    process.env.OPENAI_API_KEY = apiKey;
    const model = 'text-embedding-3-small';

    // Configurer le modèle d'embedding
    const embeddingModel = openai.embedding(model);

    // Générer et créer les embeddings pour chaque chunk individuellement
    try {
      let successCount = 0;
      let errorCount = 0;

      // Traiter les chunks en parallèle, mais créer chaque embedding dès qu'il est généré
      await Promise.all(
        chunks.map(async (chunk) => {
          try {
            // Générer l'embedding avec le SDK AI de Vercel
            const { embedding: embeddingVector, usage } = await embed({
              model: embeddingModel,
              value: chunk.text,
            });

            // Créer l'embedding dans la base de données immédiatement
            await embeddingsService.create({
              vector: embeddingVector,
              modelName: model,
              modelVersion: 'v1',
              dimensions: embeddingVector.length,
              chunkId: chunk.id,
              usage: usage.tokens,
            });

            // Incrémenter le compteur de succès
            successCount++;
          } catch (error) {
            console.error(
              `Erreur lors de la génération ou création de l'embedding pour le chunk ${chunk.id}:`,
              error,
            );
            errorCount++;
          }
        }),
      );

      console.log(`${successCount} embeddings créés avec succès`);
      console.log(`${errorCount} embeddings ont échoué`);
    } catch (error) {
      console.error(`Erreur lors de la création des embeddings:`, error);
    }
  }

  /**
   * Récupère le statut actuel d'un document
   * @param documentId ID du document
   * @param projectId ID du projet
   * @param organizationId ID de l'organisation
   * @returns Le document avec son statut actuel
   */
  async monitorDocumentStatus(
    documentId: string,
    projectId: string,
    organizationId: string,
  ) {
    // Vérifier si le projet existe et appartient à l'organisation
    await this.checkProjectAccess(projectId, organizationId);

    // Récupérer le document
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        filename: true,
        status: true,
        projectId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!document) {
      throw new NotFoundException(
        `Document avec l'ID ${documentId} non trouvé`,
      );
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
  private getStatusMessage(status: DocumentStatus): string {
    switch (status) {
      case 'NOT_STARTED':
        return 'Le document est en attente de traitement';
      case 'PROCESSING':
        return 'Le document est en cours de traitement';
      case 'INDEXING':
        return 'Le document est en cours de vectorisation';
      case 'RAFTING':
        return 'Le document est en cours de résumé';
      case 'READY':
        return 'Le document est prêt à être utilisé';
      case 'END':
        return 'Une erreur est survenue lors du traitement du document';
      default:
        return 'Statut inconnu';
    }
  }

  async updateDocumentStatus(documentId: string, status: DocumentStatus) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(
        `Document avec l'ID ${documentId} non trouvé`,
      );
    }

    // Créer un objet de mise à jour explicite
    const updateData = {
      status: status,
    };

    return await this.prisma.document.update({
      where: { id: documentId },
      data: updateData,
      include: {
        project: true,
      },
    });
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

    // Construire le chemin du fichier sur S3
    const filePath = `ct-toolbox/${dto.projectId}/${dto.fileName}`;

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
    const readStream = Readable.from(response.Body as any);

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
    if (fileExt === '.pdf') {
      return filePath;
    }

    // Si c'est un docx, le convertir en PDF
    if (fileExt === '.docx' || fileExt === '.doc') {
      const outputPath = filePath.replace(/\.(docx|doc)$/i, '.pdf');

      // Utiliser LibreOffice pour convertir le document
      const execPromise = util.promisify(exec);
      const command = `libreoffice --headless --convert-to pdf --outdir "${path.dirname(filePath)}" "${filePath}"`;

      try {
        await execPromise(command);
        return outputPath;
      } catch (error) {
        console.error('Erreur lors de la conversion du document:', error);
        throw new Error(
          `Échec de la conversion du document: ${(error as Error).message}`,
        );
      }
    }

    // Pour les autres types de fichiers, lever une erreur
    throw new Error(`Type de fichier non pris en charge: ${fileExt}`);
  }

  /**
   * Extrait le texte d'un fichier PDF
   * @param pdfPath Chemin du fichier PDF
   * @returns Texte extrait du PDF
   */
  private async extractTextFromPdf(pdfPath: string): Promise<string> {
    const execPromise = util.promisify(exec);
    const outputPath = pdfPath.replace(/\.pdf$/i, '.txt');

    // Utiliser pdftotext avec l'option -layout pour préserver la mise en page
    const command = `pdftotext -layout "${pdfPath}" "${outputPath}"`;

    try {
      await execPromise(command);

      // Lire le fichier texte généré
      const extractedText = fs.readFileSync(outputPath, 'utf8');

      return extractedText;
    } catch (error) {
      console.error("Erreur lors de l'extraction du texte:", error);
      throw new Error(
        `Échec de l'extraction du texte: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Découpe un texte en chunks de taille spécifiée
   * @param text Texte à découper
   * @param chunkSize Taille maximale de chaque chunk en caractères
   * @returns Tableau de chunks
   */
  private chunkText(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];

    // Diviser le texte en paragraphes
    const paragraphs = text.split(/\n\s*\n/);

    let currentChunk = '';

    for (const paragraph of paragraphs) {
      // Si le paragraphe est plus grand que la taille de chunk, le diviser
      if (paragraph.length > chunkSize) {
        // Ajouter le chunk courant s'il n'est pas vide
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = '';
        }

        // Diviser le paragraphe en chunks de taille fixe
        let i = 0;
        while (i < paragraph.length) {
          chunks.push(paragraph.substring(i, i + chunkSize));
          i += chunkSize;
        }
      } else if (currentChunk.length + paragraph.length + 2 > chunkSize) {
        // Si ajouter ce paragraphe dépasse la taille du chunk, créer un nouveau chunk
        chunks.push(currentChunk);
        currentChunk = paragraph;
      } else {
        // Sinon, ajouter le paragraphe au chunk courant
        if (currentChunk) {
          currentChunk += '\n\n';
        }
        currentChunk += paragraph;
      }
    }

    // Ajouter le dernier chunk s'il n'est pas vide
    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Crée les chunks dans la base de données
   * @param textChunks Tableau de chunks de texte
   * @param documentId ID du document associé
   * @returns Tableau des chunks créés
   */
  private async createChunksInDatabase(
    textChunks: string[],
    documentId: string,
  ) {
    // Créer les DTOs pour les chunks
    const chunkDtos = textChunks.map((text) => ({
      text,
      documentId,
    }));

    // Utiliser le service Chunks pour créer les chunks en batch
    const chunksService = new ChunksService(this.prisma);
    return await chunksService.createMany(chunkDtos);
  }

  /**
   * Nettoie les fichiers temporaires
   * @param tempDir Répertoire temporaire à nettoyer
   */
  private async cleanupTempFiles(tempDir: string) {
    if (fs.existsSync(tempDir)) {
      await rm(tempDir, { recursive: true, force: true });
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

    // Construire le chemin du fichier sur S3
    const filePath = `ct-toolbox/${projectId}/${fileName}`;

    // Rechercher le document dans la base de données
    const document = await this.prisma.document.findFirst({
      where: {
        projectId,
        filename: fileName,
        path: filePath,
      },
      select: {
        id: true,
        filename: true,
        status: true,
        ai_metadata: true,
      },
    });

    if (!document) {
      throw new NotFoundException(
        `Document avec le nom ${fileName} non trouvé dans le projet ${projectId}`,
      );
    }

    // Vérifier si les métadonnées AI existent
    if (!document.ai_metadata) {
      throw new NotFoundException(
        `Aucune métadonnée AI disponible pour ce document. Le document pourrait être en cours de traitement ou n'a pas encore été analysé.`,
      );
    }

    return {
      metadata: document.ai_metadata,
    };
  }
}
