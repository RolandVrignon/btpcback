import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const prisma = new PrismaClient();

/**
 * Nettoie toutes les tables de la base de données sauf Organization et ApiKey
 */
async function clearDatabase() {
  try {
    console.log('Nettoyage de la base de données...');
    console.log('Conservation des tables Organization et ApiKey');

    // Supprimer les données dans l'ordre pour respecter les contraintes de clé étrangère
    console.log('Suppression des données de la table Usage...');
    await prisma.usage.deleteMany({});
    console.log('✅ Table Usage vidée');

    console.log('Suppression des données de la table Embedding...');
    await prisma.embedding.deleteMany({});
    console.log('✅ Table Embedding vidée');

    console.log('Suppression des données de la table Chunk...');
    await prisma.chunk.deleteMany({});
    console.log('✅ Table Chunk vidée');

    console.log('Suppression des données de la table Document...');
    await prisma.document.deleteMany({});
    console.log('✅ Table Document vidée');

    console.log('Suppression des données de la table Project...');
    await prisma.project.deleteMany({});
    console.log('✅ Table Project vidée');

    console.log('Suppression des données de la table Deliverable...');
    await prisma.deliverable.deleteMany({});
    console.log('✅ Table Deliverable vidée');

    console.log('Suppression des données de la table DocumentDeliverable...');
    await prisma.documentDeliverable.deleteMany({});
    console.log('✅ Table DocumentDeliverable vidée');

    console.log('\n🎉 Base de données nettoyée avec succès !');
    console.log('Les tables Organization et ApiKey ont été préservées.');
  } catch (error) {
    console.error('Erreur lors du nettoyage de la base de données:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter la fonction
void clearDatabase();
