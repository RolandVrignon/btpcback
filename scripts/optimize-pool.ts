import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Charger les variables d'environnement
dotenv.config();

async function optimizeConnectionPool() {
  console.log('🔍 Analyse de votre base de données pour optimiser le pool de connexions...');

  // Créer un client Prisma dédié pour cette analyse
  const prisma = new PrismaClient({
    log: ['error'],
  });

  try {
    // Connexion à la base de données
    await prisma.$connect();
    console.log('✅ Connexion à la base de données établie');

    // Récupérer les informations sur l'instance
    console.log('📊 Récupération des informations sur l\'instance PostgreSQL...');

    // Obtenir le nombre maximum de connexions
    const maxConnectionsResult = await prisma.$queryRaw<Array<{ max_connections: string }>>`
      SHOW max_connections;
    `;
    const maxConnections = parseInt(maxConnectionsResult[0].max_connections, 10);

    // Obtenir la mémoire partagée
    const sharedBuffersResult = await prisma.$queryRaw<Array<{ setting: string }>>`
      SHOW shared_buffers;
    `;
    const sharedBuffers = sharedBuffersResult[0].setting;

    // Obtenir le nombre de connexions actives
    const activeConnectionsResult = await prisma.$queryRaw<Array<{ count: string }>>`
      SELECT count(*) FROM pg_stat_activity;
    `;
    const activeConnections = parseInt(activeConnectionsResult[0].count, 10);

    // Obtenir la version de PostgreSQL
    const versionResult = await prisma.$queryRaw<Array<{ version: string }>>`
      SHOW server_version;
    `;
    const pgVersion = versionResult[0].version;

    // Afficher les informations récupérées
    console.log('\n📋 Informations sur l\'instance PostgreSQL :');
    console.log(`- Version PostgreSQL : ${pgVersion}`);
    console.log(`- Connexions maximales : ${maxConnections}`);
    console.log(`- Mémoire partagée : ${sharedBuffers}`);
    console.log(`- Connexions actives actuelles : ${activeConnections}`);

    // Analyser l'utilisation des connexions sur une courte période
    console.log('\n⏱️ Analyse de l\'utilisation des connexions sur 10 secondes...');

    const samples = [];
    for (let i = 0; i < 5; i++) {
      const connectionsResult = await prisma.$queryRaw<Array<{ count: string }>>`
        SELECT count(*) FROM pg_stat_activity;
      `;
      samples.push(parseInt(connectionsResult[0].count, 10));

      // Attendre 2 secondes entre chaque échantillon
      if (i < 4) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        process.stdout.write('.');
      }
    }
    console.log(' Terminé !');

    const avgConnections = samples.reduce((sum, val) => sum + val, 0) / samples.length;
    const maxSample = Math.max(...samples);
    const minSample = Math.min(...samples);

    console.log(`- Connexions moyennes : ${avgConnections.toFixed(1)}`);
    console.log(`- Pic de connexions : ${maxSample}`);
    console.log(`- Minimum de connexions : ${minSample}`);
    console.log(`- Variation : ${maxSample - minSample}`);

    // Calculer la taille recommandée du pool
    const basePoolSize = Math.ceil(avgConnections * 1.5); // 50% de marge
    const recommendedPoolSize = Math.min(
      Math.max(basePoolSize, 10), // Au moins 10 connexions
      Math.floor(maxConnections * 0.8) // Maximum 80% des connexions disponibles
    );

    // Calculer la taille minimale du pool (environ 30% de la taille recommandée)
    const minPoolSize = Math.max(3, Math.floor(recommendedPoolSize * 0.3));

    console.log('\n💡 Recommandations pour le pool de connexions :');
    console.log(`- Taille minimale du pool : ${minPoolSize}`);
    console.log(`- Taille maximale du pool : ${recommendedPoolSize}`);

    // Vérifier si la configuration actuelle est optimale
    const currentPoolSize = process.env.DATABASE_CONNECTION_LIMIT
      ? parseInt(process.env.DATABASE_CONNECTION_LIMIT, 10)
      : undefined;

    if (currentPoolSize) {
      console.log(`- Configuration actuelle : ${currentPoolSize}`);

      if (currentPoolSize < minPoolSize) {
        console.log('⚠️ Votre pool actuel est trop petit. Augmentez-le pour améliorer les performances.');
      } else if (currentPoolSize > recommendedPoolSize * 1.2) {
        console.log('⚠️ Votre pool actuel est probablement trop grand. Réduisez-le pour économiser des ressources.');
      } else {
        console.log('✅ Votre configuration actuelle semble appropriée.');
      }
    } else {
      console.log('⚠️ Aucune limite de connexion configurée actuellement.');
    }

    // Proposer des modifications
    console.log('\n📝 Actions recommandées :');

    // 1. Mise à jour du fichier .env
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      const databaseUrlRegex = /^DATABASE_URL=(.*)$/m;
      const connectionLimitRegex = /\?connection_limit=\d+/;

      if (databaseUrlRegex.test(envContent)) {
        const match = envContent.match(databaseUrlRegex);
        if (match && match[1]) {
          const currentUrl = match[1];

          if (connectionLimitRegex.test(currentUrl)) {
            // Remplacer la limite existante
            const newUrl = currentUrl.replace(connectionLimitRegex, `?connection_limit=${recommendedPoolSize}`);
            console.log(`1. Modifiez votre DATABASE_URL dans .env pour inclure connection_limit=${recommendedPoolSize}`);
          } else {
            // Ajouter la limite
            const separator = currentUrl.includes('?') ? '&' : '?';
            const newUrl = `${currentUrl}${separator}connection_limit=${recommendedPoolSize}`;
            console.log(`1. Ajoutez "?connection_limit=${recommendedPoolSize}" à votre DATABASE_URL dans .env`);
          }
        }
      } else {
        console.log(`1. Aucune variable DATABASE_URL trouvée dans .env`);
      }
    } else {
      console.log(`1. Fichier .env non trouvé`);
    }

    // 2. Mise à jour du PrismaService
    console.log(`2. Mettez à jour votre PrismaService avec cette configuration :`);
    console.log(`
   constructor() {
     super({
       log: ['info', 'warn', 'error'],
       datasourceUrl: process.env.DATABASE_URL,
       connection: {
         min: ${minPoolSize},  // Connexions minimales
         max: ${recommendedPoolSize}   // Connexions maximales
       }
     });
   }
    `);

    // 3. Surveillance
    console.log(`3. Surveillez régulièrement l'utilisation des connexions avec le script check-connections.sh`);

  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse :', error);
  } finally {
    // Fermer la connexion Prisma
    await prisma.$disconnect();
    console.log('\n👋 Analyse terminée');
  }
}

// Exécuter la fonction
optimizeConnectionPool()
  .catch(error => {
    console.error('Erreur non gérée:', error);
    process.exit(1);
  });