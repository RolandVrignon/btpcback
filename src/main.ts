import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { Server } from 'http';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
  app.enableCors();

  // Configuration du timeout HTTP pour les requêtes longues (15 minutes)
  const httpServer = app.getHttpServer() as Server;
  httpServer.setTimeout(900000); // 15 minutes en millisecondes
  console.log('HTTP server timeout set to 900000ms (15 minutes)');

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
