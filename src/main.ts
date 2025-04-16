import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { Server } from 'http';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  // Créer spécifiquement une application Express pour accéder à ses méthodes
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // IMPORTANT: Servir les fichiers statiques directement avec Express
  // Cette méthode remplacera ServeStaticModule pour plus de contrôle
  logger.log('Setting up direct static file serving with Express');

  // Middleware pour corriger les types MIME
  app.use('/chat/assets', (req, res, next) => {
    const url = req.url;
    logger.debug(`Request to /chat/assets: ${url}`);

    if (url.endsWith('.js')) {
      logger.debug(
        'Setting content-type to application/javascript for JS file',
      );
      res.type('application/javascript');
    } else if (url.endsWith('.css')) {
      logger.debug('Setting content-type to text/css for CSS file');
      res.type('text/css');
    }
    next();
  });

  // Définir explicitement les options pour le middleware statique
  const staticOptions = {
    etag: true,
    maxAge: '30d',
    setHeaders: (res, path, stat) => {
      // Définir explicitement les types MIME pour les extensions courantes
      if (path.endsWith('.js')) {
        res.set('Content-Type', 'application/javascript');
      } else if (path.endsWith('.css')) {
        res.set('Content-Type', 'text/css');
      }
    },
  };

  // Servir les assets avant tout
  app.use(
    '/chat/assets',
    express.static(
      join(process.cwd(), 'public', 'chat', 'assets'),
      staticOptions,
    ),
  );

  // Servir les autres fichiers du dossier chat
  app.use(
    '/chat',
    express.static(join(process.cwd(), 'public', 'chat'), {
      index: false, // Ne pas servir index.html automatiquement
      ...staticOptions,
    }),
  );

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

  // Configuration du timeout HTTP pour les requêtes longues (15 minutes)
  const httpServer = app.getHttpServer() as Server;
  httpServer.timeout = 900000; // 15 minutes en millisecondes
  logger.log('HTTP server timeout set to 900000ms (15 minutes)');

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 8080;

  await app.listen(port);
  logger.log(`Application started on port ${port}`);
}

void bootstrap();
