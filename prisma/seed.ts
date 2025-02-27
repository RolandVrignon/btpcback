import { PrismaClient, OrganizationScope } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

// Fonction pour générer une clé API au format sk_XXXX...
function generateApiKey(): string {
  return `sk_${randomBytes(24).toString('hex')}`;
}

async function main() {
  try {
    console.log('Création des données de base...');

    // Création d'une organisation ADMIN
    const adminOrg = await prisma.organization.create({
      data: {
        name: 'S+',
        scope: 'ADMIN' as OrganizationScope,
      },
    });
    console.log(`Organisation ADMIN créée avec ID: ${adminOrg.id}`);

    // Création d'une clé API pour l'organisation ADMIN
    const adminApiKey = await prisma.apikey.create({
      data: {
        key: generateApiKey(),
        organizationId: adminOrg.id,
      },
    });
    console.log(`Clé API ADMIN créée: ${adminApiKey.key}`);

    // Création d'un projet de démonstration pour l'organisation ADMIN
    const adminProject = await prisma.project.create({
      data: {
        name: 'Printemps de la Défense',
        status: 'DRAFT',
        tags: ['COMMERCIAL', 'ECO_FRIENDLY'],
        organizationId: adminOrg.id,
      },
    });
    console.log(`Projet ADMIN créé avec ID: ${adminProject.id}`);

    // Création d'une organisation REGULAR
    const regularOrg = await prisma.organization.create({
      data: {
        name: 'Acme',
        scope: 'REGULAR' as OrganizationScope,
      },
    });
    console.log(`Organisation REGULAR créée avec ID: ${regularOrg.id}`);

    // Création d'une clé API pour l'organisation REGULAR
    const regularApiKey = await prisma.apikey.create({
      data: {
        key: generateApiKey(),
        organizationId: regularOrg.id,
      },
    });
    console.log(`Clé API REGULAR créée: ${regularApiKey.key}`);

    // Création d'un projet de démonstration pour l'organisation REGULAR
    const regularProject = await prisma.project.create({
      data: {
        name: '85, rue Vauvenargues 75018 Paris',
        status: 'DRAFT',
        tags: ['RESIDENTIAL', 'RENOVATION'],
        organizationId: regularOrg.id,
      },
    });
    console.log(`Projet REGULAR créé avec ID: ${regularProject.id}`);

    console.log('Données de base créées avec succès');
  } catch (error) {
    console.error('Erreur lors de la création des données:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
