import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

// Charger les variables d'environnement
dotenv.config();

// Créer un client Prisma dédié pour cette surveillance
const prisma = new PrismaClient({
  log: ['error'],
});

// Fonction pour effacer la console
function clearConsole() {
  const blank = '\n'.repeat(process.stdout.rows);
  console.log(blank);
  readline.cursorTo(process.stdout, 0, 0);
  readline.clearScreenDown(process.stdout);
}

// Fonction pour formater le temps en HH:MM:SS
function formatTime(date: Date): string {
  return date.toTimeString().split(' ')[0];
}

// Fonction pour afficher une barre de progression
function progressBar(percentage: number, width = 30): string {
  const filledWidth = Math.round((width * percentage) / 100);
  const emptyWidth = width - filledWidth;

  let color = '\x1b[32m'; // Vert
  if (percentage > 70) color = '\x1b[33m'; // Jaune
  if (percentage > 90) color = '\x1b[31m'; // Rouge

  return `[${color}${'█'.repeat(filledWidth)}\x1b[0m${' '.repeat(emptyWidth)}] ${percentage.toFixed(1)}%`;
}

// Fonction principale pour surveiller les connexions
async function monitorConnections(interval = 5000) {
  let maxConnections = 0;
  let isFirstRun = true;
  const startTime = new Date();

  try {
    // Connexion à la base de données
    await prisma.$connect();

    // Obtenir le nombre maximum de connexions (une seule fois)
    const maxConnectionsResult = await prisma.$queryRaw<
      Array<{ max_connections: string }>
    >`
      SHOW max_connections;
    `;
    maxConnections = parseInt(maxConnectionsResult[0].max_connections, 10);

    // Boucle de surveillance
    while (true) {
      if (!isFirstRun) {
        clearConsole();
      } else {
        isFirstRun = false;
      }

      const currentTime = new Date();

      // Obtenir le nombre de connexions actives
      const activeConnectionsResult = await prisma.$queryRaw<
        Array<{ count: string }>
      >`
        SELECT count(*) FROM pg_stat_activity;
      `;
      const activeConnections = parseInt(activeConnectionsResult[0].count, 10);

      // Obtenir les états des connexions
      const connectionStatesResult = await prisma.$queryRaw<
        Array<{ state: string; count: string }>
      >`
        SELECT state, count(*)
        FROM pg_stat_activity
        GROUP BY state
        ORDER BY count DESC;
      `;

      // Calculer le pourcentage d'utilisation
      const usagePercentage = (activeConnections / maxConnections) * 100;

      // Afficher l'en-tête
      console.log(
        '\x1b[1m\x1b[36m=== MONITEUR DE CONNEXIONS POSTGRESQL ===\x1b[0m',
      );
      console.log(
        `\x1b[33mDémarré à: ${formatTime(startTime)} | Actualisé à: ${formatTime(currentTime)}\x1b[0m`,
      );
      console.log('');

      // Afficher les statistiques principales
      console.log(
        `\x1b[1mConnexions actives:\x1b[0m ${activeConnections} / ${maxConnections}`,
      );
      console.log(`\x1b[1mUtilisation:\x1b[0m ${progressBar(usagePercentage)}`);

      // Afficher les états des connexions
      console.log('\n\x1b[1mÉtats des connexions:\x1b[0m');
      connectionStatesResult.forEach((row) => {
        const state = row.state || 'null';
        const count = parseInt(row.count, 10);
        const statePercentage = (count / activeConnections) * 100;
        console.log(
          `  ${state.padEnd(15)}: ${count.toString().padStart(3)} (${statePercentage.toFixed(1)}%)`,
        );
      });

      // Obtenir les applications avec le plus de connexions
      const topAppsResult = await prisma.$queryRaw<
        Array<{ application_name: string; count: string }>
      >`
        SELECT application_name, count(*)
        FROM pg_stat_activity
        GROUP BY application_name
        ORDER BY count(*) DESC
        LIMIT 5;
      `;

      // Afficher les applications principales
      console.log('\n\x1b[1mTop 5 des applications:\x1b[0m');
      topAppsResult.forEach((row) => {
        const appName = row.application_name || '(sans nom)';
        console.log(`  ${appName.padEnd(30)}: ${row.count}`);
      });

      // Afficher les connexions les plus longues
      const longestConnectionsResult = await prisma.$queryRaw<
        Array<{
          pid: number;
          application_name: string;
          state: string;
          duration: string;
        }>
      >`
        SELECT
          pid,
          application_name,
          state,
          (NOW() - backend_start)::text AS duration
        FROM
          pg_stat_activity
        WHERE
          state IS NOT NULL
        ORDER BY
          backend_start ASC
        LIMIT 3;
      `;

      console.log('\n\x1b[1mConnexions les plus anciennes:\x1b[0m');
      longestConnectionsResult.forEach((row) => {
        const appName = row.application_name || '(sans nom)';
        const state = row.state || 'null';
        console.log(
          `  PID ${row.pid.toString().padStart(6)} | ${appName.padEnd(20)} | ${state.padEnd(10)} | ${row.duration}`,
        );
      });

      // Afficher les instructions
      console.log('\n\x1b[90mAppuyez sur Ctrl+C pour quitter\x1b[0m');

      // Attendre l'intervalle spécifié
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  } catch (error) {
    console.error('Erreur lors de la surveillance des connexions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Démarrer la surveillance
monitorConnections().catch((error) => {
  console.error('Erreur non gérée:', error);
  process.exit(1);
});
