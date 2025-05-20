import { PrismaClient } from '@prisma/client';

// This script deletes all data from ReferenceChunk and ReferenceEmbedding tables
// and sets application_domain to an empty string for all ReferenceDocument rows.

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Deleting all ReferenceEmbedding...');
    await prisma.referenceEmbedding.deleteMany({});
    console.log('Deleting all ReferenceChunk...');
    await prisma.referenceChunk.deleteMany({});
    console.log(
      'Updating all ReferenceDocument application_domain to empty string...',
    );
    await prisma.referenceDocument.updateMany({
      data: { application_domain: null },
    });
    console.log('Cleanup completed.');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
