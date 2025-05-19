import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Use a raw SQL query to select the vector field
  const docs = await prisma.$queryRawUnsafe<
    {
      id: string;
      title: string;
      application_domain: string | null;
      application_domain_vector: string;
    }[]
  >(
    `
    SELECT id, title, application_domain, application_domain_vector::text
    FROM "ReferenceDocument"
    WHERE application_domain IS NOT NULL
    `,
  );

  for (const doc of docs) {
    console.log(`ID: ${doc.id}`);
    console.log(`Title: ${doc.title}`);
    console.log(`Application domain: ${doc.application_domain}`);
    // Parse the vector string to array of numbers
    const vector = doc.application_domain_vector
      .replace(/[[]]/g, '') // Remove brackets if present
      .split(',')
      .map(Number);
    console.log('Application domain vector:', vector);
    console.log('-----------------------------');
  }
}

main()
  .catch(console.error)
  .finally(() => {
    void prisma.$disconnect();
  });
