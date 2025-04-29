import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { Server } from 'http';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as fs from 'fs';
import { join } from 'path';
// Importer les types nécessaires
import * as express from 'express';
import { Request, Response } from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Chemin vers les assets
  const chatAssetsPath = join(process.cwd(), 'public', 'chat', 'assets');
  const chatRootPath = join(process.cwd(), 'public', 'chat');

  logger.log('Setting up static file serving for chat application');

  // Vérifier si les dossiers existent
  if (!fs.existsSync(chatRootPath)) {
    logger.error(`Chat root directory NOT found at: ${chatRootPath}`);
  } else {
    logger.log(`Chat root directory found at: ${chatRootPath}`);

    if (fs.existsSync(chatAssetsPath)) {
      logger.log(`Chat assets directory found at: ${chatAssetsPath}`);
      try {
        const files = fs.readdirSync(chatAssetsPath);
        logger.log(
          `Available chat assets (${files.length}): ${files.join(', ')}`,
        );
      } catch (error) {
        logger.error('Failed to read assets directory', error);
      }
    } else {
      logger.error(`Chat assets directory NOT found at: ${chatAssetsPath}`);
    }
  }

  // Create an Express router to handle /chat routes
  const router = express.Router();

  // Définir un type helper pour éviter les répétitions
  type RouteHandler = (req: Request, res: Response) => void;

  // Servir les fichiers statiques d'assets avec le bon type MIME
  // Utiliser la fonction comme variable typée pour éviter les erreurs TS
  const handleAssetRequest: RouteHandler = (req, res) => {
    const fileName = req.params.file;
    const filePath = join(chatAssetsPath, fileName);

    logger.debug(`Request for asset: ${fileName}`);

    if (!fs.existsSync(filePath)) {
      logger.warn(`Asset not found: ${filePath}`);
      return res.status(404).send('Asset not found');
    }

    // Définir le bon type MIME
    if (fileName.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript');
      logger.debug(`Serving JavaScript file: ${fileName}`);
    } else if (fileName.endsWith('.css')) {
      res.set('Content-Type', 'text/css');
      logger.debug(`Serving CSS file: ${fileName}`);
    }

    // Envoyer le fichier
    return res.sendFile(filePath);
  };

  // Utiliser la méthode "get" avec une fonction typée
  router.get('/assets/:file', handleAssetRequest);

  // Servir favicon.svg
  const handleFaviconRequest: RouteHandler = (req, res) => {
    const faviconPath = join(chatRootPath, 'favicon.svg');

    if (!fs.existsSync(faviconPath)) {
      logger.warn(`Favicon not found at: ${faviconPath}`);
      return res.status(404).send('Favicon not found');
    }

    logger.debug('Serving favicon.svg');
    res.set('Content-Type', 'image/svg+xml');
    return res.sendFile(faviconPath);
  };

  router.get('/favicon.svg', handleFaviconRequest);

  // Route de diagnostic
  const handleDebugRequest: RouteHandler = (req, res) => {
    try {
      const chatRootContent = fs.existsSync(chatRootPath)
        ? fs.readdirSync(chatRootPath)
        : 'directory not found';

      const chatAssetsContent = fs.existsSync(chatAssetsPath)
        ? fs.readdirSync(chatAssetsPath)
        : 'directory not found';

      const indexHtmlPath = join(chatRootPath, 'index.html');
      const indexHtmlExists = fs.existsSync(indexHtmlPath);
      const indexHtmlContent = indexHtmlExists
        ? fs.readFileSync(indexHtmlPath, 'utf8').substring(0, 500) + '...'
        : 'file not found';

      return res.json({
        chatRootPath,
        chatAssetsPath,
        chatRootContent,
        chatAssetsContent,
        indexHtmlExists,
        indexHtmlPreview: indexHtmlContent,
      });
    } catch (error) {
      return res.status(500).json({
        error: 'Error generating debug info',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  router.get('/debug', handleDebugRequest);

  // Fallback pour les routes client-side
  const handleFallbackRequest: RouteHandler = (req, res) => {
    const indexPath = join(chatRootPath, 'index.html');

    if (!fs.existsSync(indexPath)) {
      logger.error(`index.html not found at: ${indexPath}`);
      return res.status(404).send('index.html not found');
    }

    logger.debug(`Serving index.html for path: ${req.path}`);
    return res.sendFile(indexPath);
  };

  // Utiliser '*path' au lieu de '*' pour nommer le paramètre wildcard
  router.get('*path', handleFallbackRequest);

  // Monter le routeur sur /chat
  app.use('/chat', router);

  // Configuration de Swagger
  const config = new DocumentBuilder()
    .setTitle('BTPC API')
    .setDescription('API documentation pour le projet BTPC')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'x-api-key')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Configuration des validations globales
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Configuration CORS
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: ['Content-Type', 'Accept', 'x-api-key'],
    credentials: true,
  });

  // HTTP server timeout for long requests (20 minutes)
  const httpServer: Server = app.getHttpServer();
  httpServer.timeout = 1200000; // 20 minutes in milliseconds
  logger.log('HTTP server timeout set to 1200000ms (20 minutes)');

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 8080;

  await app.listen(port);
  logger.log(`Application started on port ${port}`);
}

void bootstrap();
