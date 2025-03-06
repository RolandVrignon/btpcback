import { PrismaClient, OrganizationScope } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

// Fonction pour générer une clé API au format sk_XXXX...
function generateApiKey(): string {
  return `sk_${randomBytes(24).toString('hex')}`;
}

async function addN8NOrganization() {
  try {
    console.log("Ajout de l'organisation N8N...");

    // Vérifier si l'organisation N8N existe déjà
    const existingOrg = await prisma.organization.findUnique({
      where: {
        name: 'N8N',
      },
    });

    if (existingOrg) {
      console.log(
        `L'organisation N8N existe déjà avec l'ID: ${existingOrg.id}`,
      );

      // Vérifier si une clé API existe déjà pour cette organisation
      const existingApiKey = await prisma.apikey.findFirst({
        where: {
          organizationId: existingOrg.id,
        },
      });

      if (existingApiKey) {
        console.log(
          `Une clé API existe déjà pour l'organisation N8N: ${existingApiKey.key}`,
        );
      } else {
        // Créer une nouvelle clé API si aucune n'existe
        const newApiKey = await prisma.apikey.create({
          data: {
            key: generateApiKey(),
            organizationId: existingOrg.id,
          },
        });
        console.log(
          `Nouvelle clé API créée pour l'organisation N8N: ${newApiKey.key}`,
        );
      }
    } else {
      // Création d'une organisation N8N avec rôle ADMIN
      const n8nOrg = await prisma.organization.create({
        data: {
          name: 'N8N',
          scope: 'ADMIN' as OrganizationScope,
        },
      });
      console.log(`Organisation N8N (ADMIN) créée avec ID: ${n8nOrg.id}`);

      // Création d'une clé API pour l'organisation N8N
      const n8nApiKey = await prisma.apikey.create({
        data: {
          key: generateApiKey(),
          organizationId: n8nOrg.id,
        },
      });
      console.log(`Clé API pour N8N créée: ${n8nApiKey.key}`);
    }

    console.log('Opération terminée avec succès');
  } catch (error) {
    console.error("Erreur lors de l'ajout de l'organisation N8N:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter la fonction
void addN8NOrganization();
