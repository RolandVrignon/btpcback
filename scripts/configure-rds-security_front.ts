import { RDSClient, DescribeDBInstancesCommand } from '@aws-sdk/client-rds';
import {
  EC2Client,
  AuthorizeSecurityGroupIngressCommand,
  DescribeSecurityGroupsCommand,
} from '@aws-sdk/client-ec2';
import * as dotenv from 'dotenv';
import * as https from 'https';

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

// Nom de l'instance RDS
const DB_INSTANCE_IDENTIFIER = 'roland-aec-agents-front';

// Création des clients AWS
const rdsClient = new RDSClient({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const ec2Client = new EC2Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

/**
 * Fonction pour obtenir l'adresse IP publique
 */
async function getPublicIp(): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get('https://api.ipify.org', (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve(data.trim());
        });
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

/**
 * Fonction principale pour configurer le groupe de sécurité RDS
 */
async function configureRDSSecurityGroup() {
  try {
    console.log(`
        Récupération des informations de l'instance ${DB_INSTANCE_IDENTIFIER}...`);

    // 1. Obtenir les informations de l'instance RDS
    const describeCommand = new DescribeDBInstancesCommand({
      DBInstanceIdentifier: DB_INSTANCE_IDENTIFIER,
    });

    const rdsResponse = await rdsClient.send(describeCommand);

    if (!rdsResponse.DBInstances || rdsResponse.DBInstances.length === 0) {
      console.error(`Instance RDS ${DB_INSTANCE_IDENTIFIER} non trouvée.`);
      process.exit(1);
    }

    const securityGroups = rdsResponse.DBInstances[0].VpcSecurityGroups;

    if (!securityGroups || securityGroups.length === 0) {
      console.error("Aucun groupe de sécurité trouvé pour l'instance RDS.");
      process.exit(1);
    }

    const securityGroupId = securityGroups[0].VpcSecurityGroupId;
    console.log(`Groupe de sécurité trouvé: ${securityGroupId}`);

    // 2. Obtenir l'adresse IP publique
    const publicIp = await getPublicIp();
    console.log(`Votre adresse IP publique: ${publicIp}`);

    // 3. Vérifier si la règle existe déjà
    const describeSecurityGroupCommand = new DescribeSecurityGroupsCommand({
      GroupIds: [securityGroupId],
    });

    const securityGroupResponse = await ec2Client.send(
      describeSecurityGroupCommand,
    );
    const securityGroup = securityGroupResponse.SecurityGroups?.[0];

    if (!securityGroup) {
      console.error(`Groupe de sécurité ${securityGroupId} non trouvé.`);
      process.exit(1);
    }

    // Vérifier si la règle existe déjà
    const existingRule = securityGroup.IpPermissions?.find(
      (permission) =>
        permission.FromPort === 5432 &&
        permission.ToPort === 5432 &&
        permission.IpProtocol === 'tcp' &&
        permission.IpRanges?.some((range) => range.CidrIp === `${publicIp}/32`),
    );

    if (existingRule) {
      console.log(`La règle pour l'adresse IP ${publicIp} existe déjà.`);
      console.log(
        '\nVous pouvez maintenant vous connecter à votre base de données RDS.',
      );
      return;
    }

    // 4. Ajouter une règle d'entrée pour autoriser PostgreSQL (port 5432) depuis votre IP
    const authorizeCommand = new AuthorizeSecurityGroupIngressCommand({
      GroupId: securityGroupId,
      IpPermissions: [
        {
          IpProtocol: 'tcp',
          FromPort: 5432,
          ToPort: 5432,
          IpRanges: [
            {
              CidrIp: `${publicIp}/32`,
              Description: 'PostgreSQL-Access',
            },
          ],
        },
      ],
    });

    await ec2Client.send(authorizeCommand);

    console.log(`
        Règle d'entrée ajoutée pour autoriser l'accès depuis ${publicIp} au port 5432.`);
    console.log(
      '\nVous pouvez maintenant vous connecter à votre base de données RDS.',
    );
    console.log(
      "\nSi vous changez d'emplacement ou d'adresse IP, vous devrez exécuter ce script à nouveau.",
    );
  } catch (error) {
    console.error(
      'Erreur lors de la configuration du groupe de sécurité RDS:',
      error,
    );
    process.exit(1);
  }
}

// Exécuter la fonction
void configureRDSSecurityGroup();
