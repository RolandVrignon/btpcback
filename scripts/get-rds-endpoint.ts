import { RDSClient, DescribeDBInstancesCommand } from '@aws-sdk/client-rds';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Charger les variables d'environnement
dotenv.config();

// Configuration AWS
const AWS_REGION = process.env.AWS_REGION || 'eu-west-3';

const BACK_DB_INSTANCE_IDENTIFIER =
  process.env.BACK_DB_INSTANCE_IDENTIFIER || 'roland-aec-agents';
const FRONT_DB_INSTANCE_IDENTIFIER =
  process.env.FRONT_DB_INSTANCE_IDENTIFIER || 'roland-aec-agents-front';
const DB_USERNAME = process.env.DB_USERNAME || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'TSnFU4uXXyPQW22fzcbKV';

// Noms des bases de données
const BACK_DB_NAME = 'aec';
const FRONT_DB_NAME = 'aec-front';

async function getRDSEndpoints() {
  try {
    console.log('Récupération des informations des instances RDS...');

    // Créer un client RDS
    const rdsClient = new RDSClient({ region: AWS_REGION });

    // Récupérer les informations de l'instance RDS pour le backend
    console.log(
      `\nRécupération des informations pour l'instance backend (${BACK_DB_INSTANCE_IDENTIFIER})...`,
    );
    const backDescribeCommand = new DescribeDBInstancesCommand({
      DBInstanceIdentifier: BACK_DB_INSTANCE_IDENTIFIER,
    });

    const backResponse = await rdsClient.send(backDescribeCommand);

    if (!backResponse.DBInstances || backResponse.DBInstances.length === 0) {
      throw new Error(
        `Aucune instance RDS trouvée avec l'identifiant ${BACK_DB_INSTANCE_IDENTIFIER}`,
      );
    }

    const backDbInstance = backResponse.DBInstances[0];
    const backEndpoint = backDbInstance.Endpoint?.Address;
    const backPort = backDbInstance.Endpoint?.Port;

    if (!backEndpoint || !backPort) {
      throw new Error(
        "Endpoint ou port non disponible pour l'instance RDS backend",
      );
    }

    // Récupérer les informations de l'instance RDS pour le frontend
    console.log(
      `\nRécupération des informations pour l'instance frontend (${FRONT_DB_INSTANCE_IDENTIFIER})...`,
    );
    let frontEndpoint;
    let frontPort;

    try {
      const frontDescribeCommand = new DescribeDBInstancesCommand({
        DBInstanceIdentifier: FRONT_DB_INSTANCE_IDENTIFIER,
      });

      const frontResponse = await rdsClient.send(frontDescribeCommand);

      if (
        !frontResponse.DBInstances ||
        frontResponse.DBInstances.length === 0
      ) {
        console.log(
          `Aucune instance RDS distincte trouvée pour le frontend. Utilisation de l'instance backend.`,
        );
        frontEndpoint = backEndpoint;
        frontPort = backPort;
      } else {
        const frontDbInstance = frontResponse.DBInstances[0];
        frontEndpoint = frontDbInstance.Endpoint?.Address;
        frontPort = frontDbInstance.Endpoint?.Port;

        if (!frontEndpoint || !frontPort) {
          console.log(
            `Endpoint ou port non disponible pour l'instance RDS frontend. Utilisation de l'instance backend.`,
          );
          frontEndpoint = backEndpoint;
          frontPort = backPort;
        }
      }
    } catch {
      console.log(
        `Erreur lors de la récupération de l'instance frontend. Utilisation de l'instance backend.`,
      );
      frontEndpoint = backEndpoint;
      frontPort = backPort;
    }

    // Afficher les informations de connexion pour le backend
    console.log('\n=== INFORMATIONS DE CONNEXION RDS BACKEND ===');
    console.log(`Endpoint: ${backEndpoint}`);
    console.log(`Port: ${backPort}`);
    console.log(`Utilisateur: ${DB_USERNAME}`);
    console.log(`Mot de passe: ${DB_PASSWORD}`);

    // Générer les informations pour le back
    console.log('\n=== CONNEXION POUR LE BACKEND (aec) ===');
    console.log(
      `DATABASE_URL="postgresql://${DB_USERNAME}:${DB_PASSWORD}@${backEndpoint}:${backPort}/${BACK_DB_NAME}?schema=public"`,
    );

    // Afficher les informations de connexion pour le frontend
    console.log('\n=== INFORMATIONS DE CONNEXION RDS FRONTEND ===');
    console.log(`Endpoint: ${frontEndpoint}`);
    console.log(`Port: ${frontPort}`);
    console.log(`Utilisateur: ${DB_USERNAME}`);
    console.log(`Mot de passe: ${DB_PASSWORD}`);

    // Générer les informations pour le front
    console.log('\n=== CONNEXION POUR LE FRONTEND (aec-front) ===');
    console.log(
      `DATABASE_URL="postgresql://${DB_USERNAME}:${DB_PASSWORD}@${frontEndpoint}:${frontPort}/${FRONT_DB_NAME}?schema=public"`,
    );

    // Générer les fichiers .env pour le back et le front
    const backEnvContent = `# Configuration de la base de données pour le backend
DATABASE_URL="postgresql://${DB_USERNAME}:${DB_PASSWORD}@${backEndpoint}:${backPort}/${BACK_DB_NAME}?schema=public"
`;

    const frontEnvContent = `# Configuration de la base de données pour le frontend
DATABASE_URL="postgresql://${DB_USERNAME}:${DB_PASSWORD}@${frontEndpoint}:${frontPort}/${FRONT_DB_NAME}?schema=public"
`;

    // Écrire les fichiers
    fs.writeFileSync(path.join(process.cwd(), '.env.back'), backEnvContent);
    fs.writeFileSync(path.join(process.cwd(), '.env.front'), frontEnvContent);

    console.log(
      '\nLes fichiers .env.back et .env.front ont été générés avec succès.',
    );

    return {
      backEndpoint,
      backPort,
      frontEndpoint: frontEndpoint as string,
      frontPort: frontPort as number,
      username: DB_USERNAME,
      password: DB_PASSWORD,
      backDbName: BACK_DB_NAME,
      frontDbName: FRONT_DB_NAME,
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des endpoints RDS:', error);
    throw error;
  }
}

// Exécuter la fonction
void getRDSEndpoints();
