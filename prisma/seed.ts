import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Création des données de base...');

    // Création d'une organisation par défaut
    const organization = await prisma.organization.create({
      data: {
        name: 'BTPC Organisation',
      },
    });
    console.log(`Organisation créée avec ID: ${organization.id}`);

    // Création d'une clé API pour cette organisation
    const apiKey = await prisma.apikey.create({
      data: {
        key: `btpc_${randomBytes(16).toString('hex')}`,
        organizationId: organization.id,
      },
    });
    console.log(`Clé API créée: ${apiKey.key}`);

    // Création d'un projet de démonstration
    const project = await prisma.project.create({
      data: {
        name: 'Projet de démonstration',
        status: 'DRAFT',
        tags: ['RESIDENTIAL', 'ECO_FRIENDLY'],
        organizationId: organization.id,
      },
    });
    console.log(`Projet créé avec ID: ${project.id}`);

    console.log('Données de base créées avec succès');
  } catch (error) {
    console.error('Erreur lors de la création des données:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
