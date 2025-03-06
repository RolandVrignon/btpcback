import {
  RDSClient,
  CreateDBInstanceCommand,
  CreateDBInstanceCommandInput,
} from '@aws-sdk/client-rds';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config({ path: './.env' });

// Configuration AWS
const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

if (!region || !accessKeyId || !secretAccessKey) {
  console.error('Les credentials AWS sont manquants dans le fichier .env');
  process.exit(1);
}

// Paramètres de l'instance RDS
const DB_INSTANCE_IDENTIFIER = 'roland-aec-agents-front';
const DB_NAME = 'aec_front';
const DB_USERNAME = 'postgres';
const DB_PASSWORD = 'TSnFU4uXXyPQW22fzcbKV';
const DB_INSTANCE_CLASS = 'db.t3.micro';
const DB_ENGINE = 'postgres';
const DB_ENGINE_VERSION = '17.4';
const DB_ALLOCATED_STORAGE = 20;
const DB_PORT = 5432;

// Création du client RDS
const rdsClient = new RDSClient({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

// Paramètres pour la création de l'instance
const params: CreateDBInstanceCommandInput = {
  DBInstanceIdentifier: DB_INSTANCE_IDENTIFIER,
  DBName: DB_NAME,
  Engine: DB_ENGINE,
  EngineVersion: DB_ENGINE_VERSION,
  DBInstanceClass: DB_INSTANCE_CLASS,
  AllocatedStorage: DB_ALLOCATED_STORAGE,
  MasterUsername: DB_USERNAME,
  MasterUserPassword: DB_PASSWORD,
  Port: DB_PORT,
  PubliclyAccessible: true,
  BackupRetentionPeriod: 7,
  MultiAZ: false,
  AutoMinorVersionUpgrade: true,
  StorageType: 'gp2',
  StorageEncrypted: true,
  Tags: [
    {
      Key: 'Project',
      Value: 'AEC Agents',
    },
    {
      Key: 'Environment',
      Value: 'Development',
    },
    {
      Key: 'Type',
      Value: 'Front',
    },
  ],
};

/**
 * Fonction principale pour créer l'instance RDS
 */
async function createRDSInstance() {
  try {
    console.log("Création de l'instance PostgreSQL sur Amazon RDS...");
    console.log(`Identifiant: ${DB_INSTANCE_IDENTIFIER}`);
    console.log(`Base de données: ${DB_NAME}`);
    console.log(`Type d'instance: ${DB_INSTANCE_CLASS}`);
    console.log(`Version PostgreSQL: ${DB_ENGINE_VERSION}`);

    const command = new CreateDBInstanceCommand(params);
    const response = await rdsClient.send(command);

    console.log('Instance RDS créée avec succès!');
    console.log("Détails de l'instance:");
    console.log(JSON.stringify(response.DBInstance, null, 2));

    console.log(
      "\nImportant: L'instance RDS peut prendre plusieurs minutes pour être disponible.",
    );
    console.log('Vous pouvez vérifier son statut dans la console AWS RDS.');

    // Afficher les informations de connexion
    console.log('\nInformations de connexion à mettre à jour dans votre .env:');
    console.log(
      `DATABASE_URL="postgresql://${DB_USERNAME}:${DB_PASSWORD}@<ENDPOINT>:${DB_PORT}/${DB_NAME}?schema=public"`,
    );
    console.log(
      "Remplacez <ENDPOINT> par l'endpoint de votre instance RDS une fois disponible.",
    );
  } catch (error) {
    console.error("Erreur lors de la création de l'instance RDS:", error);

    // Typer l'erreur pour accéder en toute sécurité à la propriété message
    const typedError = error as { message?: string };

    // Afficher des informations supplémentaires sur l'erreur
    if (
      typedError.message &&
      typedError.message.includes('Cannot find version')
    ) {
      console.error(
        "\nErreur de version PostgreSQL: La version spécifiée n'est pas disponible sur RDS.",
      );
      console.error(
        "Essayez avec une autre version comme '13.12', '14.6', '15.4' ou '16.1'.",
      );
    } else if (
      typedError.message &&
      typedError.message.includes('MasterUserPassword')
    ) {
      console.error(
        "\nErreur de mot de passe: Le mot de passe ne respecte pas les contraintes d'AWS RDS.",
      );
      console.error(
        "Utilisez uniquement des caractères ASCII imprimables, sans '/', '@', '\"', ou espace.",
      );
    }

    process.exit(1);
  }
}

// Exécuter la fonction
void createRDSInstance();
