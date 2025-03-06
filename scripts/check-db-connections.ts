import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Charger les variables d'environnement
// Essayer de charger .env depuis le répertoire courant ou le répertoire parent
const envPath = fs.existsSync('.env')
  ? '.env'
  : fs.existsSync(path.resolve('..', '.env'))
    ? path.resolve('..', '.env')
    : null;

if (envPath) {
  console.log(`Chargement des variables d'environnement depuis ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.log(
    "Aucun fichier .env trouvé, utilisation des variables d'environnement système",
  );
  dotenv.config();
}

async function checkDatabaseConnections() {
  console.log(
    '🔍 Vérification des connexions à la base de données PostgreSQL...',
  );

  // Créer un client Prisma dédié pour cette vérification
  const prisma = new PrismaClient({
    log: ['query', 'error'],
  });

  try {
    // Connexion à la base de données
    await prisma.$connect();
    console.log('✅ Connexion à la base de données établie');

    // Requête pour obtenir le nombre maximum de connexions autorisées
    const maxConnectionsResult = await prisma.$queryRaw<
      Array<{ max_connections: string }>
    >`
      SHOW max_connections;
    `;
    const maxConnections = parseInt(
      maxConnectionsResult[0].max_connections,
      10,
    );
    console.log(
      `📊 Nombre maximum de connexions autorisées: ${maxConnections}`,
    );

    // Requête pour obtenir le nombre de connexions actives
    const activeConnectionsResult = await prisma.$queryRaw<
      Array<{ count: string }>
    >`
      SELECT count(*) FROM pg_stat_activity;
    `;
    const activeConnections = parseInt(activeConnectionsResult[0].count, 10);
    console.log(`🔌 Nombre de connexions actives: ${activeConnections}`);

    // Calcul du pourcentage d'utilisation
    const usagePercentage = (activeConnections / maxConnections) * 100;
    console.log(`📈 Utilisation: ${usagePercentage.toFixed(2)}%`);

    // Afficher un avertissement si l'utilisation est élevée
    if (usagePercentage > 80) {
      console.warn(
        "⚠️ ATTENTION: L'utilisation des connexions est élevée (>80%)",
      );
    }

    // Requête pour obtenir des informations détaillées sur les connexions actives
    const connectionDetailsResult = await prisma.$queryRaw<
      Array<{
        datname: string;
        usename: string;
        application_name: string;
        client_addr: string;
        state: string;
        count: string;
      }>
    >`
      SELECT
        datname,
        usename,
        application_name,
        client_addr,
        state,
        COUNT(*) as count
      FROM
        pg_stat_activity
      GROUP BY
        datname, usename, application_name, client_addr, state
      ORDER BY
        count DESC;
    `;

    console.log('\n📋 Détails des connexions par application et état:');
    console.table(connectionDetailsResult);

    // Requête pour obtenir les connexions les plus anciennes
    const oldestConnectionsResult = await prisma.$queryRaw<
      Array<{
        pid: number;
        datname: string;
        usename: string;
        application_name: string;
        state: string;
        duration: string;
      }>
    >`
      SELECT
        pid,
        datname,
        usename,
        application_name,
        state,
        (NOW() - backend_start)::text AS duration
      FROM
        pg_stat_activity
      WHERE
        state IS NOT NULL
      ORDER BY
        backend_start ASC
      LIMIT 5;
    `;

    console.log('\n⏱️ Les 5 connexions les plus anciennes:');
    console.table(oldestConnectionsResult);

    // Recommandations basées sur l'analyse
    console.log('\n💡 Recommandations:');

    if (usagePercentage < 30) {
      console.log(
        '- Votre utilisation des connexions est faible. La configuration actuelle semble adéquate.',
      );
    } else if (usagePercentage < 70) {
      console.log(
        '- Votre utilisation des connexions est modérée. Surveillez régulièrement si votre trafic augmente.',
      );
    } else {
      console.log(
        "- Votre utilisation des connexions est élevée. Envisagez d'augmenter la taille de votre instance RDS ou d'optimiser votre pool de connexions.",
      );
      console.log(
        '- Vérifiez si certaines connexions restent ouvertes trop longtemps sans être utilisées.',
      );
      console.log(
        '- Assurez-vous que votre application ferme correctement les connexions après utilisation.',
      );
    }

    // Suggestion pour la configuration du pool Prisma
    const suggestedPoolSize = Math.min(Math.floor(maxConnections * 0.8), 20);
    console.log(
      `- Configuration recommandée pour le pool Prisma: ${suggestedPoolSize} connexions`,
    );
    console.log(
      `- Ajoutez "?connection_limit=${suggestedPoolSize}" à votre DATABASE_URL ou configurez-le dans votre PrismaService`,
    );
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des connexions:', error);
  } finally {
    // Fermer la connexion Prisma
    await prisma.$disconnect();
    console.log('👋 Déconnexion de la base de données');
  }
}

// Exécuter la fonction
checkDatabaseConnections().catch((error) => {
  console.error('Erreur non gérée:', error);
  process.exit(1);
});
